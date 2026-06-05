import mongoose, { Schema, Document, Model } from 'mongoose'

export type VaultItemType = 'text' | 'link' | 'image' | 'video' | 'document'

export interface IVaultItem extends Document {
  type: VaultItemType
  content: string // raw text or URL
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  cloudinaryResourceType?: 'image' | 'video' | 'raw'
  metadata: {
    // Link previews
    title?: string
    description?: string
    siteName?: string
    previewImage?: string
    domain?: string
    // Media / document info
    fileSize?: number
    format?: string
    width?: number
    height?: number
    duration?: number // seconds for video
    originalFilename?: string
    credentials?: {
      username?: string
      password?: string
    }
  }
  tags: string[]
  folderId?: mongoose.Types.ObjectId
  isPinned?: boolean
  createdAt: Date
  updatedAt: Date
}

const VaultItemSchema = new Schema<IVaultItem>(
  {
    type: {
      type: String,
      enum: ['text', 'link', 'image', 'video', 'document'],
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    cloudinaryUrl: { type: String },
    cloudinaryPublicId: { type: String },
    cloudinaryResourceType: { type: String, enum: ['image', 'video', 'raw'] },
    metadata: {
      title: String,
      description: String,
      siteName: String,
      previewImage: String,
      domain: String,
      fileSize: Number,
      format: String,
      width: Number,
      height: Number,
      duration: Number,
      originalFilename: String,
      credentials: {
        username: String,
        password: String,
      },
    },
    tags: { type: [String], default: [], index: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', index: true },
    isPinned: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
)

// Full-text search index covering content + link metadata
VaultItemSchema.index(
  {
    content: 'text',
    'metadata.title': 'text',
    'metadata.description': 'text',
    'metadata.originalFilename': 'text',
  },
  { weights: { content: 5, 'metadata.title': 4, 'metadata.originalFilename': 3, 'metadata.description': 1 } }
)

// Compound index for sorted paginated queries
VaultItemSchema.index({ createdAt: -1, type: 1 })

const VaultItem: Model<IVaultItem> =
  mongoose.models.VaultItem ?? mongoose.model<IVaultItem>('VaultItem', VaultItemSchema)

export default VaultItem
