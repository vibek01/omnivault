'use server'

import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'

export async function togglePinAction(itemId: string, isPinned: boolean) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await connectDB()

  await VaultItem.findByIdAndUpdate(itemId, { isPinned })
  return { success: true }
}
