'use server'

import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'

export async function saveUploadedItemAction({
  type,
  content,
  cloudinaryUrl,
  cloudinaryPublicId,
  cloudinaryResourceType,
  metadata,
  tags,
  folderId,
}: any) {
  console.log('SAVE ITEM CALLED WITH FOLDER ID:', folderId)
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await connectDB()

  const item = await VaultItem.create({
    type,
    content,
    cloudinaryUrl,
    cloudinaryPublicId,
    cloudinaryResourceType,
    metadata,
    tags,
    folderId,
  })

  return JSON.parse(JSON.stringify(item))
}
