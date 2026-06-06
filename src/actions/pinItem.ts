'use server'

import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'

export async function togglePinAction(itemId: string, isPinned: boolean) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await connectDB()

  if (isPinned) {
    const itemToPin = await VaultItem.findById(itemId)
    if (!itemToPin) throw new Error('Item not found')

    const pinnedCount = await VaultItem.countDocuments({ type: itemToPin.type, isPinned: true })
    if (pinnedCount >= 5) {
      throw new Error(`You can only pin up to 5 items of type ${itemToPin.type}. Unpin an older item first.`)
    }
  }

  await VaultItem.findByIdAndUpdate(itemId, { isPinned })
  return { success: true }
}
