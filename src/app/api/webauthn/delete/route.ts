import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import Passkey from '@/models/Passkey'
import { cookies } from 'next/headers'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

  await connectDB()
  
  // Delete all passkeys for the user
  await Passkey.deleteMany({ email: session.user.email })

  // Clear any active vault access tokens
  const cookieStore = await cookies()
  cookieStore.delete('unlocked_vault_access')
  cookieStore.delete('webauthn_auth_challenge')
  cookieStore.delete('webauthn_challenge')

  return NextResponse.json({ success: true })
}
