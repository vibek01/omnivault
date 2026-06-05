'use client'

import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import Image from 'next/image'

interface SidebarProps {
  session: Session
  counts: {
    all: number
    image: number
    video: number
    link: number
    text: number
    document: number
  }
  activeFilter: string
  onFilterChange: (f: string) => void
  folders?: any[]
  activeFolderId?: string
  setActiveFolderId?: (id: string) => void
  refreshFolders?: () => void
}

const NAV_ITEMS = [
  { id: 'all',      label: 'All Items',  icon: '⚡', color: '' },
  { id: 'image',    label: 'Images',     icon: '🖼️', color: 'var(--tag-image)' },
  { id: 'video',    label: 'Videos',     icon: '🎬', color: 'var(--tag-video)' },
  { id: 'link',     label: 'Links',      icon: '🔗', color: 'var(--tag-link)' },
  { id: 'text',     label: 'Notes',      icon: '📝', color: 'var(--tag-text)' },
  { id: 'document', label: 'Documents',  icon: '📄', color: 'var(--tag-document)' },
]

import { useState } from 'react'
import { moveItemAction } from '@/actions/moveItem'

export default function Sidebar({ session, counts, activeFilter, onFilterChange, folders = [], activeFolderId = 'all', setActiveFolderId, refreshFolders }: SidebarProps) {
  const pathname = usePathname()
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    setDragOverFolderId(null)
    const itemId = e.dataTransfer.getData('text/plain')
    if (itemId) {
      try {
        await moveItemAction(itemId, targetFolderId)
        if (refreshFolders) refreshFolders() // refresh folders to update counts or trigger dashboard refresh
        window.dispatchEvent(new Event('vault-refresh')) // hack to refresh dashboard items
      } catch (err) {
        console.error('Failed to move item:', err)
      }
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName }),
      })
      if (res.ok) {
        setNewFolderName('')
        setIsCreatingFolder(false)
        if (refreshFolders) refreshFolders()
      }
    } catch {}
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      if (res.ok) {
        if (activeFolderId === folderId && setActiveFolderId) {
          setActiveFolderId('all')
        }
        if (refreshFolders) refreshFolders()
      }
    } catch (err) {
      console.error('Failed to delete folder:', err)
    }
  }

  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo" style={{ position: 'relative' }}>
        <div className="sidebar-logo-icon">🔐</div>
        <span className="sidebar-logo-text">OmniVault</span>
        <button 
          className="btn-icon" 
          style={isCollapsed ? { position: 'absolute', right: '50%', transform: 'translateX(50%)', bottom: -20, padding: 4, background: 'var(--bg-elevated)', borderRadius: '50%' } : { position: 'absolute', right: 0, padding: 4 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Sidebar"
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Folders Section */}
      <div className="sidebar-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Folders</span>
        <button 
          className="btn-icon" 
          style={{ padding: 4, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
          onClick={() => setIsCreatingFolder(!isCreatingFolder)}
          title="New Folder"
        >
          +
        </button>
      </div>

      {isCreatingFolder && (
        <div style={{ padding: '0 16px', marginBottom: 8, display: 'flex', gap: 6 }}>
          <input
            autoFocus
            className="ingest-input"
            style={{ flex: 1, minWidth: 0, padding: '4px 8px', fontSize: 13, margin: 0 }}
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') setIsCreatingFolder(false)
            }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>✓</button>
        </div>
      )}

      <div style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
        <div 
          className="nav-item" 
          onClick={() => setActiveFolderId && setActiveFolderId('all')}
          style={{ 
            cursor: 'pointer', 
            background: activeFolderId === 'all' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeFolderId === 'all' ? 'var(--accent-primary)' : 'inherit',
            border: activeFolderId === 'all' ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid transparent'
          }}
          title={isCollapsed ? 'Main Vault' : undefined}
          onDragOver={(e) => { e.preventDefault(); setDragOverFolderId('root') }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => handleDrop(e, 'root')}
        >
          <span className="nav-item-icon">📁</span>
          <span className="nav-item-label">Main Vault</span>
        </div>

        {folders.map(f => (
          <div 
            key={f._id} 
            className="nav-item" 
            style={{ 
              cursor: 'pointer',
              background: dragOverFolderId === f._id ? 'rgba(139, 92, 246, 0.2)' : activeFolderId === f._id ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
              border: dragOverFolderId === f._id ? '1px dashed var(--accent-primary)' : activeFolderId === f._id ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid transparent',
              color: activeFolderId === f._id ? 'var(--accent-primary)' : 'inherit'
            }}
            title={isCollapsed ? f.name : undefined}
            onClick={() => setActiveFolderId && setActiveFolderId(f._id)}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(f._id) }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDrop(e, f._id)}
          >
            <span className="nav-item-icon">📂</span>
            <span className="nav-item-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f._id); }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5, fontSize: 12 }}
              className="nav-count"
            >
              ✕
            </button>
          </div>
        ))}</div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt="Avatar"
              width={32}
              height={32}
              className="sidebar-avatar"
            />
          ) : (
            <div className="sidebar-avatar" style={{ background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {session.user?.name?.[0] ?? 'V'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.user?.name ?? 'User'}
            </div>
            <div className="sidebar-user-email">Personal Vault</div>
          </div>
        </div>
        <button
          id="signout-btn"
          className="nav-item"
          style={{ marginTop: 8 }}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <span className="nav-item-icon">🚪</span>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
