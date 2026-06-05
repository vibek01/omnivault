'use server'

import { auth } from '@/auth'
import { v2 as cloudinary } from 'cloudinary'

export async function getCloudinarySignature(folder: string, isRaw: boolean = false) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const timestamp = Math.round(new Date().getTime() / 1000)
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!apiSecret) throw new Error('Cloudinary secret missing')

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: `omnivault/${folder}`,
  }

  let publicId: string | undefined
  if (isRaw) {
    publicId = Math.random().toString(36).substring(2, 15)
    paramsToSign.public_id = publicId
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: `omnivault/${folder}`,
    publicId,
  }
}
