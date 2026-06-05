import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import AdmZip from 'adm-zip'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url || !url.startsWith('https://res.cloudinary.com/')) {
    return new Response('Invalid URL', { status: 400 })
  }

  try {
    const urlObj = new URL(url)
    const parts = urlObj.pathname.split('/')
    const vIndex = parts.findIndex(p => p.match(/^v\d+$/))
    if (vIndex === -1) {
       return new Response('Invalid Cloudinary URL', { status: 400 })
    }
    let publicId = parts.slice(vIndex + 1).join('/')
    const resourceType = urlObj.pathname.includes('/raw/upload/') ? 'raw' : 'image'
    
    // Cloudinary 'image' resource type does not include extensions in public_id
    if (resourceType === 'image') {
      publicId = publicId.replace(/\.[^/.]+$/, "")
    }

    // Generate ZIP URL to bypass Cloudinary's strict PDF blocking
    const zipUrl = cloudinary.utils.download_zip_url({
      public_ids: [publicId],
      resource_type: resourceType
    })

    const res = await fetch(zipUrl)
    if (!res.ok) throw new Error(`Failed to fetch ZIP from Cloudinary: ${res.status}`)

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()
    if (zipEntries.length === 0) throw new Error('ZIP is empty')

    const pdfBuffer = zipEntries[0].getData()

    const headers: HeadersInit = {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': 'inline',
    }
    
    if (request.nextUrl.searchParams.get('download') === '1') {
      const filename = url.split('/').pop() || 'download.pdf'
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    return new Response(pdfBuffer as any, { headers })
  } catch (err) {
    console.error('PDF Proxy Error:', err)
    return new Response('Error proxying PDF', { status: 500 })
  }
}
