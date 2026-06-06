'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { getCloudinarySignature } from '@/actions/cloudinary'
import { saveUploadedItemAction } from '@/actions/saveItem'

interface UploadDropzoneProps {
  onClose: () => void
  onSuccess: () => void
  initialFiles?: File[]
  folderId?: string
  folderName?: string
}

const FORMAT_LABELS = ['JPG', 'PNG', 'GIF', 'WEBP', 'MP4', 'MOV', 'PDF', 'DOCX', 'XLSX', 'ZIP']

function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('video/')) return '🎬'
  if (type === 'application/pdf') return '📕'
  if (type.includes('word') || type.includes('document')) return '📄'
  if (type.includes('sheet') || type.includes('excel')) return '📊'
  if (type.includes('zip') || type.includes('archive')) return '📦'
  return '📄'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.0', '')} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FilePreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  if (preview) {
    if (file.type.startsWith('video/')) {
      return (
        <video
          src={preview}
          style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
          muted
        />
      )
    }
    return (
      <img
        src={preview}
        alt={file.name}
        style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
      />
    )
  }

  return <span className="file-icon" style={{ flexShrink: 0, fontSize: 20 }}>{getFileIcon(file.type)}</span>
}

export default function UploadDropzone({ onClose, onSuccess, initialFiles = [], folderId, folderName }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>(initialFiles)
  const [customNames, setCustomNames] = useState<Record<string, string>>({})
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const arr = Array.from(newFiles)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))]
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(5)
    setError('')

    try {
      setProgress(10)
      
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      const errs: string[] = []

      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        try {
        let resourceType = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'raw'
        // Cloudinary blocks public raw PDFs by default. Uploading them as 'image' bypasses this and enables thumbnails.
        if (f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf') {
          resourceType = 'image'
        }
        const vaultType = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document'

        // File size validation (Cloudinary Free Tier limits)
        if (resourceType === 'video' && f.size > 100 * 1024 * 1024) {
          throw new Error(`${f.name} exceeds 100MB video limit`)
        } else if (resourceType !== 'video' && f.size > 10 * 1024 * 1024) {
          throw new Error(`${f.name} exceeds 10MB file limit`)
        }
        
        // 1. Get Signature
        const sigData = await getCloudinarySignature(vaultType + 's', resourceType === 'raw')
        
        // 2. Upload to Cloudinary
        const cloudFormData = new FormData()
        cloudFormData.append('file', f)
        cloudFormData.append('api_key', sigData.apiKey!)
        cloudFormData.append('timestamp', String(sigData.timestamp))
        cloudFormData.append('signature', sigData.signature)
        cloudFormData.append('folder', sigData.folder)
        if (sigData.publicId) {
          cloudFormData.append('public_id', sigData.publicId)
        }

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`, {
          method: 'POST',
          body: cloudFormData
        })

        if (!cloudRes.ok) throw new Error(`Cloudinary upload failed for ${f.name}`)
        
        const cloudResult = await cloudRes.json()

        // 3. Save to DB
        const customName = customNames[f.name + f.size] || f.name
        
        await saveUploadedItemAction({
          type: vaultType,
          content: customName,
          cloudinaryUrl: cloudResult.secure_url,
          cloudinaryPublicId: cloudResult.public_id,
          cloudinaryResourceType: resourceType,
          metadata: {
            originalFilename: customName,
            fileSize: cloudResult.bytes,
            format: cloudResult.format,
            width: cloudResult.width,
            height: cloudResult.height,
            duration: cloudResult.duration,
          },
          tags: tagList,
          folderId,
        })
        } catch (fileErr) {
          errs.push(fileErr instanceof Error ? fileErr.message : `Failed to upload ${f.name}`)
        }
        
        setProgress(10 + Math.round(((i + 1) / files.length) * 85))
      }

      setProgress(100)
      
      // Always call onSuccess if at least some files succeeded or even if all failed, to refresh grid
      onSuccess()

      if (errs.length > 0) {
        setError(errs.join(', '))
        setUploading(false)
      } else {
        setTimeout(() => {
          onClose()
        }, 400)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div
      className="dropzone-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Upload files"
    >
      <div
        className={`dropzone-card ${dragging ? 'drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="dropzone-icon">{dragging ? '🎯' : '☁️'}</span>
        <h2 className="dropzone-title">
          {dragging ? 'Drop to upload' : `Upload to ${folderName || 'Vault'}`}
        </h2>
        <p className="dropzone-sub">
          Drag &amp; drop files here, or browse your file system
        </p>

        <div className="dropzone-formats">
          {FORMAT_LABELS.map((f) => (
            <span key={f} className="dropzone-format">{f}</span>
          ))}
        </div>

        {files.length === 0 ? (
          <button
            id="browse-files-btn"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            style={{ margin: '0 auto' }}
          >
            📂 Browse Files
          </button>
        ) : (
          <>
            <div className="file-list">
              {files.map((f, i) => (
                <div key={i} className="file-list-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FilePreview file={f} />
                  <input
                    className="ingest-input"
                    autoFocus={i === 0}
                    style={{ flex: 1, minWidth: 0, margin: 0, padding: '4px 8px', fontSize: 13 }}
                    value={customNames[f.name + f.size] !== undefined ? customNames[f.name + f.size] : f.name}
                    onChange={(e) => setCustomNames(prev => ({ ...prev, [f.name + f.size]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpload(); } }}
                  />
                  <span className="file-size" style={{ flexShrink: 0 }}>{formatBytes(f.size)}</span>
                  <button
                    className="btn btn-icon btn-sm"
                    style={{ padding: '2px 6px', fontSize: 12 }}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="tags-input-wrap" style={{ textAlign: 'left', marginBottom: 16 }}>
              <div className="tags-input-label">Tags (comma separated, optional)</div>
              <input
                className="ingest-input"
                placeholder="e.g. whatsapp, family, receipts"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpload(); } }}
              />
            </div>

            {uploading && (
              <div className="upload-progress">
                <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}

            {error && (
              <p style={{ color: '#f87171', fontSize: 13, marginTop: 8, marginBottom: 8 }}>
                ⚠️ {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
              <button
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add More
              </button>
              <button
                id="upload-submit-btn"
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? `Uploading… ${progress}%` : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => addFiles(e.target.files)}
          id="file-input"
          aria-label="Select files to upload"
        />

        <button
          id="close-dropzone-btn"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 20 }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
