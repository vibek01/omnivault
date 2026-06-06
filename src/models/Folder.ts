import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IFolder extends Document {
  name: string
  isLocked: boolean
  createdAt: Date
  updatedAt: Date
}

const FolderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

const Folder: Model<IFolder> = mongoose.models.Folder ?? mongoose.model<IFolder>('Folder', FolderSchema)

export default Folder
