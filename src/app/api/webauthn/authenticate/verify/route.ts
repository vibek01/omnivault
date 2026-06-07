import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/mongodb'
import Passkey from '@/models/Passkey'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get('webauthn_auth_challenge')?.value
  if (!expectedChallenge) {
    console.log('Challenge expired')
    return new NextResponse('Challenge expired', { status: 400 })
  }

  const body = await req.json()
  const host = req.headers.get('host') || 'localhost:3000'
  const rpID = host.split(':')[0]
  const protocol = process.env.NODE_ENV === 'production' && rpID !== 'localhost' ? 'https' : 'http'
  const expectedOrigin = `${protocol}://${host}`

  await connectDB()
  const passkey = await Passkey.findOne({ credentialID: body.id, email: session.user.email })

  if (!passkey) {
    console.log('Passkey not found for ID:', body.id)
    return new NextResponse('Passkey not found', { status: 400 })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: new Uint8Array(Buffer.from(passkey.credentialPublicKey, 'base64url')),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    })
  } catch (error) {
    console.error(error)
    return new NextResponse((error as Error).message, { status: 400 })
  }

  const { verified, authenticationInfo } = verification

  if (verified && authenticationInfo) {
    // Update counter
    passkey.counter = authenticationInfo.newCounter
    await passkey.save()

    // Clear challenge
    cookieStore.delete('webauthn_auth_challenge')

    // Grant temporary access to secure folders
    cookieStore.set('unlocked_vault_access', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15, // 15 minutes of unlocked access
      path: '/',
    })

    return NextResponse.json({ verified: true })
  }

  console.log('Verification returned false:', verification)
  return new NextResponse('Verification failed', { status: 400 })
}
