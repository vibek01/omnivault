import { NextRequest } from 'next/server'

import { v2 as cloudinary } from 'cloudinary'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url || !url.startsWith('https://res.cloudinary.com/')) {
    return new Response('Invalid URL', { status: 400 })
  }

  try {
    let fetchUrl = url

    // If it's a raw file (like PDF), sign the delivery URL
    if (url.includes('/raw/upload/')) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })

      const urlObj = new URL(url)
      const parts = urlObj.pathname.split('/')
      const vIndex = parts.findIndex(p => p.match(/^v\d+$/))
      
      if (vIndex !== -1) {
        const publicId = parts.slice(vIndex + 1).join('/')
        fetchUrl = cloudinary.utils.url(publicId, {
          resource_type: 'raw',
          type: 'upload',
          sign_url: true,
          secure: true
        })
      }
    }

    const res = await fetch(fetchUrl)
    if (!res.ok) throw new Error(`Failed to fetch from Cloudinary: ${res.status} ${res.statusText}`)

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Determine content type based on URL extension, default to pdf
    let contentType = 'application/pdf'
    if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) contentType = 'image/jpeg'
    if (url.toLowerCase().endsWith('.png')) contentType = 'image/png'

    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': 'inline',
    }
    
    if (request.nextUrl.searchParams.get('download') === '1') {
      const customFilename = request.nextUrl.searchParams.get('filename')
      const filename = customFilename || url.split('/').pop() || 'download'
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    return new Response(buffer, { headers })
  } catch (err) {
    return new Response('Error proxying file', { status: 500 })
  }
}
