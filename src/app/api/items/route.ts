import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import Folder from '@/models/Folder'
import Fuse from 'fuse.js'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const skip = (page - 1) * limit
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const tags = searchParams.get('tags')
  const dateFilter = searchParams.get('date')
  const customDate = searchParams.get('customDate')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const folderId = searchParams.get('folderId')

  await connectDB()

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {}

  const cookieStore = await cookies()
  const hasUnlockedAccess = cookieStore.get('unlocked_vault_access')?.value === 'true'
  if (!hasUnlockedAccess) {
    const lockedFolders = await Folder.find({ isLocked: true }).select('_id').lean()
    const lockedIds = lockedFolders.map(f => f._id.toString())
    if (lockedIds.length > 0) {
      if (!folderId || folderId === 'all') {
        query.folderId = { $nin: lockedIds }
      } else if (lockedIds.includes(folderId)) {
        return new Response('Folder is locked', { status: 403 })
      }
    }
  }

  if (type && type !== 'all') {
    query.type = type
  }

  if (folderId) {
    if (folderId === 'root') {
      query.folderId = null
    } else if (folderId !== 'all') {
      query.folderId = folderId
    }
  }

  if (tags) {
    query.tags = { $in: tags.split(',').map((t) => t.trim()) }
  }

  if (dateFilter && dateFilter !== 'all') {
    const now = new Date()
    let start: Date | null = null

    switch (dateFilter) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        break
    }

    if (start) {
      query.createdAt = { $gte: start }
    }
  } else if (customDate) {
    const start = new Date(customDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    query.createdAt = { $gte: start, $lt: end }
  } else if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setDate(end.getDate() + 1)
    query.createdAt = { $gte: start, $lt: end }
  }

  const sortParam = searchParams.get('sort')
  let sortQuery: Record<string, 1 | -1> = { createdAt: -1 }
  if (sortParam === 'date_asc') sortQuery = { createdAt: 1 }
  else if (sortParam === 'name_asc') sortQuery = { 'metadata.title': 1, 'metadata.originalFilename': 1, content: 1 }
  else if (sortParam === 'name_desc') sortQuery = { 'metadata.title': -1, 'metadata.originalFilename': -1, content: -1 }
  else if (sortParam === 'size_desc') sortQuery = { 'metadata.fileSize': -1 }
  else if (sortParam === 'size_asc') sortQuery = { 'metadata.fileSize': 1 }

  if (search) {
    // Fuzzy search using fuse.js
    const allItems = await VaultItem.find(query)
      .collation({ locale: 'en', strength: 2 })
      .lean()

    const fuse = new Fuse(allItems, {
      keys: ['content', 'tags', 'metadata.title', 'metadata.description', 'metadata.originalFilename', 'metadata.siteName', 'metadata.domain'],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true
    })

    const results = fuse.search(search).map(r => r.item)
    
    // Sort if specified, otherwise keep fuse's relevance sorting
    if (sortParam) {
      results.sort((a, b) => {
        if (sortParam === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        if (sortParam === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        
        const nameA = (a.metadata?.title || a.metadata?.originalFilename || a.content || '').toString().toLowerCase()
        const nameB = (b.metadata?.title || b.metadata?.originalFilename || b.content || '').toString().toLowerCase()
        if (sortParam === 'name_asc') return nameA.localeCompare(nameB)
        if (sortParam === 'name_desc') return nameB.localeCompare(nameA)
        
        const sizeA = a.metadata?.fileSize || 0
        const sizeB = b.metadata?.fileSize || 0
        if (sortParam === 'size_desc') return sizeB - sizeA
        if (sortParam === 'size_asc') return sizeA - sizeB
        return 0
      })
    }

    const total = results.length
    const items = results.slice(skip, skip + limit)

    return Response.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    })
  }

  const [items, total] = await Promise.all([
    VaultItem.find(query)
      .collation({ locale: 'en', strength: 2 })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),
    VaultItem.countDocuments(query),
  ])

  return Response.json({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  })
}
