import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import Folder from '@/models/Folder'
import VaultItem from '@/models/VaultItem'
import { NextRequest } from 'next/server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  try {
    const { id } = await params
    await connectDB()

    // Find and delete the folder
    const folder = await Folder.findByIdAndDelete(id)
    if (!folder) return new Response('Folder not found', { status: 404 })

    // Optional: Unlink all items that were in this folder
    // Alternatively, you could delete the items, but unlinking is safer
    await VaultItem.updateMany({ folderId: id }, { $unset: { folderId: 1 } })

    return Response.json({ success: true })
  } catch (err) {
    return new Response('Failed to delete folder', { status: 500 })
  }
}
