import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { NextRequest } from 'next/server'
import ogs from 'open-graph-scraper'

const REALISTIC_UA =
  'WhatsApp/2.21.12.21 A'

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()
  let { type, tags, folderId } = body as {
    type: 'text' | 'link'
    content: string
    tags?: string[]
    folderId?: string
  }
  let content = body.content

  if (!type || !content) {
    return Response.json({ error: 'Missing type or content' }, { status: 400 })
  }

  await connectDB()

  if (type === 'link') {
    let metadata: Record<string, string | undefined> = {
      domain: extractDomain(content),
      title: extractDomain(content), // fallback
    }

    try {
      const { result, error } = await ogs({
        url: content,
        fetchOptions: {
          headers: { 'user-agent': REALISTIC_UA },
        },
        timeout: 8000,
      })

      if (!error && result.ogTitle) {
        metadata = {
          domain: extractDomain(content),
          title: result.ogTitle ?? extractDomain(content),
          description: result.ogDescription,
          siteName: result.ogSiteName,
          previewImage:
            Array.isArray(result.ogImage) && result.ogImage.length > 0
              ? result.ogImage[0].url
              : undefined,
        }
      }
    } catch {
      // Graceful fallback — save with just domain as title
    }

    const item = await VaultItem.create({
      type: 'link',
      content,
      metadata,
      tags: tags ?? [],
      folderId,
    })

    return Response.json({ item }, { status: 201 })
  }

  // type === 'text'
  let textMetadata: any = {}
  
  let { isPassword, credentials } = body as any
  if (isPassword && credentials) {
    textMetadata.credentials = credentials;
    // Auto-tag as password
    tags = tags || [];
    if (!tags.includes('password')) {
      tags.push('password');
    }
  }

  const item = await VaultItem.create({
    type: 'text',
    content,
    metadata: textMetadata,
    tags: tags ?? [],
    folderId,
  })

  return Response.json({ item }, { status: 201 })
}
