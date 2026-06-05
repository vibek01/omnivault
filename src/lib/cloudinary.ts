import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

/**
 * Uploads a buffer to Cloudinary with credit-efficient settings.
 * - f_auto: picks best format (WebP/AVIF) per browser
 * - q_auto:good: good visual quality at minimal size
 * - w_1920 + c_limit: caps storage of giant raws without distorting smaller images
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
  originalFilename?: string
): Promise<{ url: string; publicId: string; format: string; bytes: number; width?: number; height?: number; duration?: number }> {
  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder: `omnivault/${folder}`,
      resource_type: resourceType,
      // Credit efficiency: transform once on upload, deliver the optimized version
      transformation:
        resourceType === 'image'
          ? [{ fetch_format: 'auto', quality: 'auto:good', width: 1920, crop: 'limit' }]
          : undefined,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...(originalFilename ? { public_id: undefined } : {}),
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error)
      if (!result) return reject(new Error('No result from Cloudinary'))
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: (result as Record<string, unknown>).duration as number | undefined,
      })
    })

    stream.end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}
