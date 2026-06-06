import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import Folder from '@/models/Folder'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  await connectDB()

  const folders = await Folder.find().sort({ createdAt: -1 }).lean()

  return Response.json(folders)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  try {
    const { name, isLocked } = await request.json()
    if (!name || name.trim() === '') {
      return new Response('Folder name is required', { status: 400 })
    }

    await connectDB()

    const folder = await Folder.create({ name: name.trim(), isLocked: !!isLocked })

    return Response.json(folder)
  } catch (err) {
    return new Response('Failed to create folder', { status: 500 })
  }
}
