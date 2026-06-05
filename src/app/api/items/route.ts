import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { NextRequest } from 'next/server'

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

  if (search) {
    const searchRegex = new RegExp(search, 'i')
    query.$or = [
      { content: searchRegex },
      { tags: searchRegex },
      { 'metadata.title': searchRegex },
      { 'metadata.description': searchRegex },
      { 'metadata.originalFilename': searchRegex }
    ]
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
    end.setDate(end.getDate() + 1) // Include the end date fully
    query.createdAt = { $gte: start, $lt: end }
  }

  const [items, total] = await Promise.all([
    VaultItem.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
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
