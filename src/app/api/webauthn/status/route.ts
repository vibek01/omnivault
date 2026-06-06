import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import Passkey from '@/models/Passkey'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

  await connectDB()
  const passkeyCount = await Passkey.countDocuments({ email: session.user.email })

  return NextResponse.json({ isRegistered: passkeyCount > 0 })
}
