import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { NextRequest } from 'next/server'

export const maxDuration = 60 // seconds — allow time for large file uploads

function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'raw'
}

function getVaultType(mimeType: string): 'image' | 'video' | 'document' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const formData = await request.formData()
  const skipDb = request.nextUrl.searchParams.get('skipDb') === 'true'
  const files = formData.getAll('files') as File[]
  const tagsRaw = formData.get('tags') as string | null
  const tags = tagsRaw ? JSON.parse(tagsRaw) : []

  if (!files || files.length === 0) {
    return Response.json({ error: 'No files provided' }, { status: 400 })
  }

  await connectDB()

  const results = []
  const errors = []

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = file.type || 'application/octet-stream'
      const resourceType = getResourceType(mimeType)
      const vaultType = getVaultType(mimeType)

      const cloudResult = await uploadToCloudinary(buffer, vaultType + 's', resourceType, file.name)

      if (skipDb) {
        results.push({ cloudinaryUrl: cloudResult.url })
        continue
      }

      const item = await VaultItem.create({
        type: vaultType,
        content: file.name, // store original filename as searchable content
        cloudinaryUrl: cloudResult.url,
        cloudinaryPublicId: cloudResult.publicId,
        cloudinaryResourceType: resourceType,
        metadata: {
          originalFilename: file.name,
          fileSize: cloudResult.bytes,
          format: cloudResult.format,
          width: cloudResult.width,
          height: cloudResult.height,
          duration: cloudResult.duration,
        },
        tags,
      })

      results.push(item)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ filename: file.name, error: errMsg })
    }
  }

  return Response.json(
    {
      uploaded: results,
      errors,
      total: files.length,
      success: results.length,
    },
    { status: 201 }
  )
}
