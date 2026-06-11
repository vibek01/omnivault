'use client'

import Image from 'next/image'
import type { IVaultItem } from '@/models/VaultItem'

interface VaultItemCardProps {
  item: IVaultItem & { _id: string }
  onOpen: (item: IVaultItem & { _id: string }) => void
  onDelete: (id: string) => void
  isSelected?: boolean
  isSelectionMode?: boolean
  onToggleSelect?: (id: string) => void
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.0', '')} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getDocIcon(format?: string): string {
  if (!format) return '📄'
  const f = format.toLowerCase()
  if (f === 'pdf') return '📕'
  if (['doc', 'docx'].includes(f)) return '📄'
  if (['xls', 'xlsx'].includes(f)) return '📊'
  if (['ppt', 'pptx'].includes(f)) return '📊'
  if (['zip', 'rar', '7z'].includes(f)) return '📦'
  return '📄'
}

function getDownloadFilename(item: IVaultItem & { _id: string }): string {
  let name = item.metadata?.originalFilename || item.metadata?.title || `file-${item._id}`
  const format = item.metadata?.format
  if (format && !name.toLowerCase().endsWith(`.${format.toLowerCase()}`)) {
    name += `.${format}`
  }
  return name
}

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { togglePinAction } from '@/actions/pinItem'

type CastItem = IVaultItem & { _id: string }

export default function VaultItemCard({ item, onOpen, onDelete, isSelected = false, isSelectionMode = false, onToggleSelect }: VaultItemCardProps) {
  const [copied, setCopied] = useState(false)

  // Calculate generic size for any item
  const getFileSize = () => {
    if (item.metadata?.fileSize) return item.metadata.fileSize;
    if (item.content) return new Blob([item.content]).size;
    return 0;
  }
  const displaySize = getFileSize();
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(item._id)
  }

  const isPdf = item.type === 'document' && (
    item.metadata?.format?.toLowerCase() === 'pdf' || 
    item.metadata?.originalFilename?.toLowerCase().endsWith('.pdf') || 
    item.cloudinaryUrl?.toLowerCase().endsWith('.pdf')
  )

  const cardSizeClass = ['text', 'link'].includes(item.type) || (item.type === 'document' && !isPdf) 
    ? 'vault-card-small' 
    : 'vault-card-large'

  const isPassword = item.type === 'text' && !!item.metadata?.credentials?.password
  const typeBadgeClass = isPassword
    ? `type-badge type-badge-password`
    : `type-badge type-badge-${item.type}`

  const renderContent = () => {
    if (item.type === 'image') {
      return (
        <>
          <div className="card-image-wrap" style={{ flex: 1, position: 'relative' }}>
            {item.cloudinaryUrl ? (
              // Use Cloudinary's auto-format, auto-quality, width-capped URL
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.cloudinaryUrl.replace('/upload/', '/upload/f_auto,q_auto:good,w_800/')}
                alt={item.metadata?.originalFilename ?? 'Image'}
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-primary-alpha-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🖼️</div>
            )}
            <div className="card-image-overlay" />
          </div>
          {item.metadata?.originalFilename && (
            <div style={{ padding: '10px 16px 4px', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.metadata.originalFilename}
            </div>
          )}
        </>
      )
    }

    if (item.type === 'video') {
      return (
        <div className="card-video-thumb" style={{ flex: 1, position: 'relative' }}>
          {item.cloudinaryUrl ? (
            // Generate a poster frame from Cloudinary
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cloudinaryUrl.replace('/upload/', '/upload/so_0,f_jpg,q_auto:good,w_640/')}
              alt={item.metadata?.originalFilename ?? 'Video thumbnail'}
              loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-pink-alpha-10)' }} />
          )}
          <div className="play-icon">▶</div>
        </div>
      )
    }

    if (item.type === 'link') {
      const hasPreview = Boolean(item.metadata?.previewImage) || (item.metadata?.title && item.metadata?.title !== item.metadata?.domain)
      return (
        <>
          {hasPreview ? (
            <div className="card-link-preview">
              {item.metadata?.previewImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="link-preview-image"
                  src={item.metadata.previewImage}
                  alt={item.metadata.title ?? ''}
                  loading="lazy"
                />
              )}
              <div className="link-preview-content">
                <div className="link-title">{item.metadata?.title}</div>
                {item.metadata?.description && (
                  <div className="link-description">{item.metadata.description}</div>
                )}
                <div className="link-domain">
                  🌐 {item.metadata?.siteName ?? item.metadata?.domain}
                </div>
              </div>
            </div>
          ) : (
            <div className="link-url-raw">
              <div className="link-url-raw-inner">
                🔗 {item.content}
              </div>
            </div>
          )}
          {item.content && (
            <div className="link-hover-overlay">
              <a 
                href={item.content} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="link-hover-btn" 
                onClick={(e) => e.stopPropagation()} 
                title="Visit Link"
              >
                ↗️ Visit Link
              </a>
            </div>
          )}
        </>
      )
    }

    if (item.type === 'text') {
      const hasCreds = item.metadata?.credentials?.password
      return (
        <div className="card-text-content markdown-body" style={{ paddingBottom: hasCreds ? 8 : 16 }}>
          <div className="card-text-content-inner">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                a: ({node, ...props}) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} />
                )
              }}
            >
              {item.content}
            </ReactMarkdown>
          </div>
          {hasCreds && (
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              <div 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  background: 'var(--bg-overlay-1)', border: '1px solid var(--border-overlay)',
                  padding: '4px 8px', borderRadius: '100px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ fontSize: '12px', flexShrink: 0 }}>🔑</span>
                {item.metadata.credentials?.username && (
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {item.metadata.credentials.username}
                  </span>
                )}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation()
                    navigator.clipboard.writeText(item.metadata.credentials?.password || '')
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }} 
                  className="btn-icon" 
                  style={{ flexShrink: 0, fontSize: '11px', padding: '4px 8px', background: 'var(--accent-primary-alpha-20)', color: 'var(--accent-primary)', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Copy password"
                >
                  {copied ? '✅' : '📋'} <span className="hide-on-mobile">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (item.type === 'document') {
      if (isPdf && item.cloudinaryUrl) {
        return (
          <div className="card-document" style={{ padding: 0, flexDirection: 'column', flex: 1, alignItems: 'stretch' }}>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', width: '100%', pointerEvents: 'none' }}>
              <iframe
                src={`/api/proxy-pdf?url=${encodeURIComponent(item.cloudinaryUrl)}`}
                style={{ width: '100%', height: '100%', border: 'none', background: 'var(--iframe-bg)' }}
                title={item.metadata?.originalFilename}
                tabIndex={-1}
              />
              <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-sunken)' }}>
              <div className="doc-name" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📕 {item.metadata?.originalFilename ?? item.content}
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="card-document">
          <div className="doc-icon">{getDocIcon(item.metadata?.format)}</div>
          <div>
            <div className="doc-name">{item.metadata?.originalFilename ?? item.content}</div>
            <div className="doc-meta">
              {item.metadata?.format?.toUpperCase()} {item.metadata?.fileSize ? `· ${formatBytes(item.metadata.fileSize)}` : ''}
            </div>
            {item.cloudinaryUrl && (
              <a
                href={`/api/proxy-pdf?url=${encodeURIComponent(item.cloudinaryUrl)}&download=1&filename=${encodeURIComponent(getDownloadFilename(item))}`}
                target="_self"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 10, display: 'inline-flex' }}
                onClick={(e) => e.stopPropagation()}
              >
                ⬇ Download
              </a>
            )}
          </div>
        </div>
      )
    }
  }

  return (
    <div
      className={`vault-card ${cardSizeClass}`}
      style={{ position: 'relative', border: isSelected ? '2px solid var(--accent-primary)' : undefined }}
      role="article"
      tabIndex={0}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item._id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          if (item.type === 'link') {
            window.open(item.content, '_blank')
            return
          } else if (item.type === 'text') {
            const urlMatch = item.content.match(/(https?:\/\/[^\s]+)/)
            if (urlMatch) {
              window.open(urlMatch[1], '_blank')
              return
            }
          }
        }
        onOpen(item)
      }}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item)}
      aria-label={`${item.type} item: ${item.metadata?.title ?? item.metadata?.originalFilename ?? item.content?.slice(0, 40)}`}
    >
      {/* Checkbox for selection */}
      <div 
        className="checkbox-wrap"
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 20,
          opacity: (isSelectionMode || isSelected) ? 1 : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (onToggleSelect) onToggleSelect(item._id)
        }}
      >
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => {}}
          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
        />
      </div>

      {/* Card header */}
      <div className="card-header" style={{ position: 'relative', paddingLeft: (isSelectionMode || isSelected) ? 40 : 16, transition: 'padding 0.2s' }}>
        <div className="card-meta" style={{ flex: 1, minWidth: 0 }}>
          <span className={typeBadgeClass}>{isPassword ? 'password' : item.type}</span>
        </div>
        <div style={{ marginLeft: 'auto', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-muted)', zIndex: 1 }}>
          {formatDate(item.createdAt)}
        </div>
        <div className="card-actions" style={{ position: 'absolute', right: 16, top: 12, background: 'var(--bg-card)', paddingLeft: 12, zIndex: 2 }}>
          <button
            className="btn-icon"
            style={{ padding: '4px 8px', fontSize: 13, opacity: item.isPinned ? 1 : 0.4 }}
            onClick={async (e) => {
              e.stopPropagation()
              try {
                await togglePinAction(item._id, !item.isPinned)
                window.dispatchEvent(new Event('vault-refresh'))
              } catch (err: any) {
                window.dispatchEvent(new CustomEvent('vault-toast', { detail: { message: err.message, type: 'error' } }))
              }
            }}
            aria-label={item.isPinned ? "Unpin item" : "Pin item"}
            title={item.isPinned ? "Unpin item" : "Pin item"}
          >
            {item.isPinned ? '📌' : '📍'}
          </button>
          {item.cloudinaryUrl ? (
            <a
              href={item.type === 'document' ? `/api/proxy-pdf?url=${encodeURIComponent(item.cloudinaryUrl)}&download=1&filename=${encodeURIComponent(getDownloadFilename(item))}` : `/api/proxy?url=${encodeURIComponent(item.cloudinaryUrl)}&download=1&filename=${encodeURIComponent(getDownloadFilename(item))}`}
              target={item.type === 'document' ? "_self" : "_blank"}
              rel="noopener noreferrer"
              download
              className="btn-icon"
              title="Download file"
              aria-label="Download file"
              style={{ padding: '4px 8px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              ⬇️
            </a>
          ) : (
            <button
              className="btn-icon"
              style={{ padding: '4px 8px', fontSize: 13 }}
              onClick={(e) => {
                e.stopPropagation()
                const url = item.content
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
            className="btn-icon"
            style={{ padding: '4px 8px', fontSize: 13 }}
            onClick={handleDelete}
            aria-label="Delete item"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Type-specific content */}
      {renderContent()}

      {/* Footer: Tags and File Size */}
      {(item.tags?.length || displaySize > 0) && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 16px', 
          borderTop: '1px solid var(--border)',
          marginTop: 'auto',
          minHeight: 44
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
            {item.tags?.filter(t => !(isPassword && t.toLowerCase() === 'password')).map((t) => (
              <span key={t} className="tag" style={{ margin: 0 }}>#{t}</span>
            ))}
          </div>

          {displaySize > 0 && (
            <div style={{ 
              padding: '4px 10px', 
              background: 'var(--bg-overlay-2)', 
              borderRadius: 12, 
              fontSize: 11, 
              color: 'var(--text-muted)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              marginLeft: 12
            }}>
              {formatBytes(displaySize)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
