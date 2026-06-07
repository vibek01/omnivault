import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import VaultItem from '@/models/VaultItem'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import Folder from '@/models/Folder'
// Removed fuse.js in favor of MongoDB native text search
import mongoose from 'mongoose'

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
        query.folderId = { $nin: lockedIds.map(id => new mongoose.Types.ObjectId(id)) }
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
    } else if (folderId === 'pinned') {
      query.isPinned = true
    } else if (folderId !== 'all') {
      query.folderId = new mongoose.Types.ObjectId(folderId)
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
    const searchRegex = new RegExp(search, 'i')
    query.$or = [
      { content: searchRegex },
      { tags: searchRegex },
      { 'metadata.title': searchRegex },
      { 'metadata.description': searchRegex },
      { 'metadata.originalFilename': searchRegex },
      { 'metadata.siteName': searchRegex },
      { 'metadata.domain': searchRegex },
    ]
  }

  let itemsFetchPromise;
  
  if (!sortParam || sortParam === 'date_desc') {
    itemsFetchPromise = VaultItem.aggregate([
      { $match: query },
      {
        $addFields: {
          customSortPriority: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: ["$type", "text"] },
                      { $eq: [{ $type: "$metadata.credentials.password" }, "string"] }
                    ]
                  },
                  then: 1
                },
                {
                  case: { $eq: ["$type", "text"] },
                  then: 2
                }
              ],
              default: 3
            }
          }
        }
      },
      { $sort: { customSortPriority: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]).collation({ locale: 'en', strength: 2 });
  } else {
    itemsFetchPromise = VaultItem.find(query)
      .collation({ locale: 'en', strength: 2 })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  const [items, total] = await Promise.all([
    itemsFetchPromise,
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
