import { v2 as cloudinary } from 'cloudinary'

export async function GET() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const publicId = 'omnivault/documents/hyxe40wpfv8.pdf'
  const signedUrl = cloudinary.utils.url(publicId, {
    resource_type: 'raw',
    type: 'upload',
    sign_url: true,
    secure: true
  })

  try {
    const res = await fetch(signedUrl)
    const text = await res.text()
    return Response.json({ status: res.status, url: signedUrl, text: text.substring(0, 200) })
  } catch (err) {
    return Response.json({ error: String(err) })
  }
}
