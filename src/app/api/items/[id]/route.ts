import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { deleteFromCloudinary } from '@/lib/cloudinary'
import { NextRequest } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await params

  await connectDB()

  const item = await VaultItem.findById(id)
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 })

  // Delete asset from Cloudinary first to keep storage clean
  if (item.cloudinaryPublicId && item.cloudinaryResourceType) {
    await deleteFromCloudinary(item.cloudinaryPublicId, item.cloudinaryResourceType).catch(() => {
      // Non-fatal: still delete the DB record
    })
  }

  await item.deleteOne()

  return Response.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { tags, metadata, folderId, $unset } = body as { tags?: string[]; metadata?: any; folderId?: string; $unset?: any }

  await connectDB()

  const updateData: any = {}
  if (tags !== undefined) updateData.tags = tags
  if (folderId !== undefined) updateData.folderId = folderId
  if ($unset !== undefined) updateData.$unset = $unset

  if (metadata !== undefined) {
    updateData.$set = {}
    for (const key in metadata) {
      updateData.$set[`metadata.${key}`] = metadata[key]
    }
  }

  const item = await VaultItem.findByIdAndUpdate(
    id,
    Object.keys(updateData).length > 0 ? updateData : { tags }, // fallback for safety if empty
    { new: true }
  )

  if (!item) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ item })
}
