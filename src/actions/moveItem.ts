'use server'

import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'

export async function moveItemAction(itemId: string, folderId: string | null) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await connectDB()

  const update = folderId === 'root' || folderId === null
    ? { $unset: { folderId: '' } }
    : { folderId }

  await VaultItem.findByIdAndUpdate(itemId, update)
  return { success: true }
}
