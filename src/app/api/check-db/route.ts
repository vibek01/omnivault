import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import Folder from '@/models/Folder'

export async function GET() {
  await connectDB()
  const folders = await Folder.find({})
  const items = await VaultItem.find({})

  return Response.json({
    folders,
    items: items.map(i => ({
      name: i.metadata?.originalFilename || i.metadata?.title || 'Unknown',
      folderId: i.folderId || null,
      type: i.type
    }))
  })
}
