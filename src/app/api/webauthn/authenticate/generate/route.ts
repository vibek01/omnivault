import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/mongodb'
import Passkey from '@/models/Passkey'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

  await connectDB()
  const userPasskeys = await Passkey.find({ email: session.user.email })

  const host = req.headers.get('host') || 'localhost:3000'
  const rpID = host.split(':')[0]

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userPasskeys.map(passkey => ({
      id: passkey.credentialID,
      type: 'public-key',
      transports: passkey.transports,
    })),
    userVerification: 'required',
  })

  const cookieStore = await cookies()
  cookieStore.set('webauthn_auth_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  })

  return NextResponse.json(options)
}
