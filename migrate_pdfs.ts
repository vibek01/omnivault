import { connectDB } from './src/lib/mongodb'
import VaultItem from './src/models/VaultItem'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import AdmZip from 'adm-zip'

const envStr = fs.readFileSync('.env.local', 'utf8')
for (const line of envStr.split('\n')) {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=')
    process.env[key.trim()] = rest.join('=').trim()
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function migrate() {
  await connectDB()
  
  const items = await VaultItem.find({ type: 'document' })
  let migrated = 0
  
  for (const item of items) {
    if (item.cloudinaryUrl && item.cloudinaryUrl.includes('/raw/upload/') && item.cloudinaryUrl.toLowerCase().endsWith('.pdf')) {
      console.log(`Migrating: ${item.metadata?.originalFilename}`)
      
      const urlObj = new URL(item.cloudinaryUrl)
      const parts = urlObj.pathname.split('/')
      const vIndex = parts.findIndex(p => p.match(/^v\d+$/))
      const publicId = parts.slice(vIndex + 1).join('/')
      
      // 1. Get ZIP
      const zipUrl = cloudinary.utils.download_zip_url({
        public_ids: [publicId],
        resource_type: 'raw'
      })
      
      const res = await fetch(zipUrl)
      if (!res.ok) {
        console.error('Failed to fetch ZIP', res.status)
        continue
      }
      
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // 2. Extract PDF
      const zip = new AdmZip(buffer)
      const zipEntries = zip.getEntries()
      if (zipEntries.length === 0) continue
      
      const pdfBuffer = zipEntries[0].getData()
      const tmpPath = `/tmp/${zipEntries[0].name}` // Use .name instead of .entryName
      fs.writeFileSync(tmpPath, pdfBuffer)
      
      // 3. Upload as Image
      const uploadResult = await cloudinary.uploader.upload(tmpPath, {
        resource_type: 'image',
        folder: 'omnivault/documents'
      })
      
      // 4. Update DB
      item.cloudinaryUrl = uploadResult.secure_url
      item.cloudinaryPublicId = uploadResult.public_id
      item.cloudinaryResourceType = 'image'
      await item.save()
      
      console.log(`Successfully migrated to: ${item.cloudinaryUrl}`)
      
      // 5. Delete old raw file
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
      } catch (e) {
        console.error('Failed to delete old raw file:', e)
      }
      
      fs.unlinkSync(tmpPath)
      migrated++
    }
  }
  
  console.log(`Migration complete. Migrated ${migrated} files.`)
  process.exit(0)
}

migrate()
