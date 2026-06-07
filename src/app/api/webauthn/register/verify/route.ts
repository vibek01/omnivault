import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/mongodb'
import Passkey from '@/models/Passkey'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get('webauthn_challenge')?.value
  if (!expectedChallenge) return new NextResponse('Challenge expired', { status: 400 })

  const body = await req.json()
  const host = req.headers.get('host') || 'localhost:3000'
  const rpID = host.split(':')[0]
  const protocol = process.env.NODE_ENV === 'production' && rpID !== 'localhost' ? 'https' : 'http'
  const expectedOrigin = `${protocol}://${host}`

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })
  } catch (error) {
    console.error(error)
    return new NextResponse((error as Error).message, { status: 400 })
  }

  const { verified, registrationInfo } = verification

  if (verified && registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo

    await connectDB()
    
    // Convert Uint8Arrays to base64url or hex for storage. We can use Buffer to base64.
    const passkey = new Passkey({
      email: session.user.email,
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: credential.transports || [],
    })
    
    await passkey.save()

    // Clear challenge
    cookieStore.delete('webauthn_challenge')

    return NextResponse.json({ verified: true })
  }

  return new NextResponse('Verification failed', { status: 400 })
}
