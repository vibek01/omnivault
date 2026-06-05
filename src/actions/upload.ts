'use server'

import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { uploadToCloudinary } from '@/lib/cloudinary'


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

export async function uploadFilesAction(formData: FormData, skipDb: boolean = false) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const files = formData.getAll('files') as File[]
  const tagsRaw = formData.get('tags') as string | null
  const tags = tagsRaw ? JSON.parse(tagsRaw) : []

  if (!files || files.length === 0) {
    throw new Error('No files provided')
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
        content: file.name,
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

      // Convert mongoose document to plain object for Server Action response
      results.push(JSON.parse(JSON.stringify(item)))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ filename: file.name, error: errMsg })
    }
  }

  return {
    uploaded: results,
    errors,
    total: files.length,
    success: results.length,
  }
}
