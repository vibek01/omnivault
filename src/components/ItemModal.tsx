'use client'

import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { IVaultItem } from '@/models/VaultItem'
import { uploadFilesAction } from '@/actions/upload'

interface ItemModalProps {
  item: IVaultItem & { _id: string }
  onClose: () => void
  onUpdate?: (updatedItem: any) => void
  folders?: any[]
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.0', '')} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getDownloadFilename(item: IVaultItem & { _id: string }): string {
  let name = item.metadata?.originalFilename || item.metadata?.title || `file-${item._id}`
  const format = item.metadata?.format
  if (format && !name.toLowerCase().endsWith(`.${format.toLowerCase()}`)) {
    name += `.${format}`
  }
  return name
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const [copiedCode, React_useState] = React.useState(false)
  
  if (!inline && match) {
    const codeContent = String(children).replace(/\n$/, '')
    return (
      <div style={{ position: 'relative' }}>
        <button
          className="btn-icon"
          style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-black-alpha-50)', backdropFilter: 'blur(4px)', padding: '4px 8px', fontSize: 12, borderRadius: 6, zIndex: 10, border: '1px solid var(--border-overlay)', cursor: 'pointer', color: 'var(--text-primary)' }}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(codeContent);
            React_useState(true);
            setTimeout(() => React_useState(false), 2000);
          }}
          aria-label="Copy code"
          title="Copy code"
        >
          {copiedCode ? '✅' : '📋 Copy'}
        </button>
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    )
  }
  return <code className={className} {...props}>{children}</code>
}

export default function ItemModal({ item, onClose, onUpdate, folders = [], onNext, onPrev, hasNext, hasPrev }: ItemModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState(item.metadata?.previewImage)

  const handleCustomPreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('files', file)
      const data = await uploadFilesAction(formData, true) // skipDb = true
      if (data.success > 0) {
        const newUrl = data.uploaded[0].cloudinaryUrl
        setLocalPreview(newUrl)
        const patchRes = await fetch(`/api/items/${item._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: { previewImage: newUrl } })
        })
        const patchData = await patchRes.json()
        if (onUpdate && patchData.item) onUpdate(patchData.item)
      } else {
        alert('Upload failed: ' + (data.errors?.[0]?.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Upload error')
    } finally {
      setUploading(false)
    }
  }

  const handleMoveToFolder = async (folderId: string) => {
    try {
      const payload = folderId === 'root' ? { $unset: { folderId: 1 } } : { folderId }
      const res = await fetch(`/api/items/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const patchData = await res.json()
      if (onUpdate && patchData.item) onUpdate(patchData.item)
    } catch {}
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext()
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [onClose, onNext, onPrev, hasNext, hasPrev])

  const renderBody = () => {
    if (item.type === 'image' && item.cloudinaryUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.cloudinaryUrl.replace('/upload/', '/upload/f_auto,q_auto:good/')}
          alt={item.metadata?.originalFilename ?? 'Image'}
          style={{ width: '100%', height: 'auto', borderRadius: 12 }}
        />
      )
    }

    if (item.type === 'video' && item.cloudinaryUrl) {
      return (
        <video controls autoPlay style={{ width: '100%', borderRadius: 12, outline: 'none' }}>
          <source src={item.cloudinaryUrl} />
          Your browser does not support the video tag.
        </video>
      )
    }

    if (item.type === 'link') {
      return (
        <div>
          {localPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localPreview}
              alt={item.metadata.title ?? ''}
              style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }}
            />
          )}
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
            {item.metadata?.title ?? item.content}
          </h2>
          {item.metadata?.description && (
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
              {item.metadata.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              🌐 Open Link
            </a>
            <button
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : '🖼️ Custom Preview'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleCustomPreviewUpload}
            />
          </div>
        </div>
      )
    }

    if (item.type === 'text') {
      const hasCreds = item.metadata?.credentials?.password
      return (
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 15,
          lineHeight: 1.7,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '24px',
          overflowX: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }} className="markdown-body">
          <div>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{ code: CodeBlock }}
            >
              {item.content}
            </ReactMarkdown>
          </div>
          {hasCreds && (
            <div 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                background: 'var(--accent-primary-alpha-10)', border: '1px solid var(--accent-primary-alpha-40)',
                padding: '16px', borderRadius: '12px', marginTop: '8px'
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, flexShrink: 0 }}>🔑 Password</span>
              {item.metadata.credentials?.username && (
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {item.metadata.credentials.username}
                  </span>
                </div>
              )}
              <button 
                onClick={(e) => { 
                  e.stopPropagation()
                  navigator.clipboard.writeText(item.metadata.credentials?.password || '')
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }} 
                className="btn-primary" 
                style={{ marginLeft: 'auto', fontSize: '13px', padding: '6px 16px', borderRadius: '100px', border: 'none', flexShrink: 0 }}
                title="Copy password"
              >
                {copied ? '✅ Copied!' : '📋 Copy Password'}
              </button>
            </div>
          )}
        </div>
      )
    }

    if (item.type === 'document' && item.cloudinaryUrl) {
      const isPdf = item.metadata?.format?.toLowerCase() === 'pdf' || 
                    item.metadata?.originalFilename?.toLowerCase().endsWith('.pdf') || 
                    item.cloudinaryUrl.toLowerCase().endsWith('.pdf')
                    
      if (isPdf) {
        return (
          <div style={{ height: '70vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <iframe
              src={`/api/proxy-pdf?url=${encodeURIComponent(item.cloudinaryUrl)}`}
              style={{ flex: 1, width: '100%', border: 'none', borderRadius: 12, marginBottom: 12 }}
              title={item.metadata?.originalFilename ?? 'PDF Viewer'}
            />
          </div>
        )
      }

      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📄</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            {item.metadata?.originalFilename}
          </p>
          <a
            href={`/api/proxy-pdf?url=${encodeURIComponent(item.cloudinaryUrl)}&download=1&filename=${encodeURIComponent(getDownloadFilename(item))}`}
            target="_self"
            rel="noopener noreferrer"
            download
            className="btn btn-primary"
          >
            ⬇ Download File
          </a>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className="modal-backdrop"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${item.type}`}
    >
      {/* Navigation Arrows */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className="btn-icon"
          style={{
            position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
            zIndex: 100, background: 'var(--surface-sunken)', color: 'var(--text-primary)', padding: '16px', borderRadius: '50%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
          }}
          aria-label="Previous item"
        >
          ◀
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className="btn-icon"
          style={{
            position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
            zIndex: 100, background: 'var(--surface-sunken)', color: 'var(--text-primary)', padding: '16px', borderRadius: '50%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
          }}
          aria-label="Next item"
        >
          ▶
        </button>
      )}
      <div className="modal" style={{ width: '100%', maxWidth: 800, margin: '16px' }}>
        <div className="item-modal-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <span className={`type-badge type-badge-${item.type}`}>{item.type}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <select
              className="ingest-input"
              style={{ width: 'auto', padding: '4px 8px', fontSize: 12, height: 28, margin: 0, backgroundColor: 'var(--input-bg)' }}
              value={item.folderId ? String(item.folderId) : 'root'}
              onChange={(e) => handleMoveToFolder(e.target.value)}
            >
              <option value="root">No Folder</option>
              {folders.map(f => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
            {item.cloudinaryUrl ? (
              <a
                href={item.type === 'document' ? `/api/proxy-pdf?url=${encodeURIComponent(item.cloudinaryUrl)}&download=1&filename=${encodeURIComponent(getDownloadFilename(item))}` : `/api/proxy?url=${encodeURIComponent(item.cloudinaryUrl)}&download=1&filename=${encodeURIComponent(getDownloadFilename(item))}`}
                target={item.type === 'document' ? "_self" : "_blank"}
                rel="noopener noreferrer"
                download
                className="btn btn-icon"
                title="Download file"
                aria-label="Download file"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                ⬇️
              </a>
            ) : (
              <button
                className="btn btn-icon"
                onClick={() => {
                  const url = item.type === 'link' || item.type === 'text' ? item.content : item.cloudinaryUrl
                  if (url) {
                    navigator.clipboard.writeText(url)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                aria-label="Copy link"
                title="Copy link"
              >
                {copied ? '✅' : '📋'}
              </button>
            )}
            <button
              className="btn btn-icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="item-modal-body modal-body">
          {renderBody()}

          {item.tags && item.tags.length > 0 && (
            <div className="card-tags" style={{ marginTop: 20, padding: 0 }}>
              {item.tags.map((t) => (
                <span key={t} className="tag">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
