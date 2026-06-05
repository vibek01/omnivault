'use server'

import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function bulkMoveItemsAction(itemIds: string[], folderId: string | null) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await connectDB()

  const update = folderId === 'root' || folderId === null
    ? { $unset: { folderId: '' } }
    : { folderId }

  await VaultItem.updateMany({ _id: { $in: itemIds } }, update)
  return { success: true }
}

export async function bulkDeleteItemsAction(itemIds: string[]) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await connectDB()

  const items = await VaultItem.find({ _id: { $in: itemIds } })
  
  for (const item of items) {
    if (item.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(item.cloudinaryPublicId, {
          resource_type: item.cloudinaryResourceType || 'image',
        })
      } catch (e) {
        console.error('Failed to delete from Cloudinary:', e)
      }
    }
  }

  await VaultItem.deleteMany({ _id: { $in: itemIds } })
  return { success: true }
}
