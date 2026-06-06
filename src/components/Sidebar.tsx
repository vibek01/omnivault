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

import { useState, useEffect } from 'react'
import { moveItemAction } from '@/actions/moveItem'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import PasskeyManagerModal from './PasskeyManagerModal'

export default function Sidebar({ session, counts, activeFilter, onFilterChange, folders = [], activeFolderId = 'all', setActiveFolderId, refreshFolders }: SidebarProps) {
  const pathname = usePathname()
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isNewFolderLocked, setIsNewFolderLocked] = useState(false)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<any | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const THEMES = [
    { id: 'dark', label: 'Dark Mode', icon: '🌙' },
    { id: 'light', label: 'Light Mode', icon: '☀️' },
    { id: 'dracula', label: 'Dracula', icon: '🧛' },
    { id: 'forest', label: 'Forest', icon: '🌲' },
    { id: 'solarized', label: 'Solarized', icon: '🏜️' },
    { id: 'ocean', label: 'Ocean Deep', icon: '🌊' }
  ]

  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = document.documentElement.getAttribute('data-theme') || localStorage.theme || 'dark'
      setTheme(storedTheme)
    }

    const handleToggleSidebar = () => setIsCollapsed(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggleSidebar)

    // Check passkey status
    fetch('/api/webauthn/status').then(r => r.json()).then(data => {
      if (data.isRegistered) setHasPasskey(true)
    }).catch(console.error)

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggleSidebar)
    }
  }, [])

  const registerTouchID = async () => {
    try {
      const resp = await fetch('/api/webauthn/register/generate')
      if (!resp.ok) throw new Error('Failed to generate options')
      const options = await resp.json()
      
      const attResp = await startRegistration({ optionsJSON: options })
      
      const verifyResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      })
      
      if (verifyResp.ok) {
        setHasPasskey(true)
        alert('Touch ID registered successfully!')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to register Touch ID')
    }
  }

  const handleDeletePasskey = async () => {
    try {
      const res = await fetch('/api/webauthn/delete', { method: 'DELETE' })
      if (res.ok) {
        setHasPasskey(false)
        setIsPasskeyModalOpen(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openThemeModal = () => setIsThemeModalOpen(true)
  const closeThemeModal = () => setIsThemeModalOpen(false)

  const promptTouchID = async (): Promise<boolean> => {
    try {
      const resp = await fetch('/api/webauthn/authenticate/generate')
      if (resp.status === 401) throw new Error('Unauthorized')
      if (!resp.ok) throw new Error('Failed to generate auth options')
      const options = await resp.json()
      
      const attResp = await startAuthentication({ optionsJSON: options })
      
      const verifyResp = await fetch('/api/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      })
      
      if (verifyResp.ok) {
        return true
      } else {
        alert('Touch ID verification failed.')
        return false
      }
    } catch (err) {
      console.error(err)
      alert('Authentication failed. You may need to register Touch ID first.')
      return false
    }
  }

  const handleSelectFolder = async (folder: any) => {
    if (folder.isLocked) {
      const success = await promptTouchID()
      if (success && setActiveFolderId) setActiveFolderId(folder._id)
    } else {
      if (setActiveFolderId) setActiveFolderId(folder._id)
    }
  }

  const selectTheme = (nextTheme: string) => {
    setTheme(nextTheme)
    
    if (nextTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', nextTheme)
    }
    localStorage.theme = nextTheme
    closeThemeModal()
  }

  const currentThemeData = THEMES.find(t => t.id === theme) || THEMES[0]

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    setDragOverFolderId(null)
    const itemId = e.dataTransfer.getData('text/plain')
    if (itemId) {
      try {
        await moveItemAction(itemId, targetFolderId)
        if (refreshFolders) refreshFolders()
        window.dispatchEvent(new Event('vault-refresh'))
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
        body: JSON.stringify({ name: newFolderName, isLocked: isNewFolderLocked }),
      })
      if (res.ok) {
        setNewFolderName('')
        setIsNewFolderLocked(false)
        setIsCreatingFolder(false)
        if (refreshFolders) refreshFolders()
      }
    } catch {}
  }

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return
    const folder = folderToDelete

    if (folder.isLocked) {
      const success = await promptTouchID()
      if (!success) return
    }
    
    try {
      const res = await fetch(`/api/folders/${folder._id}`, { method: 'DELETE' })
      if (res.ok) {
        if (activeFolderId === folder._id && setActiveFolderId) {
          setActiveFolderId('all')
        }
        if (refreshFolders) refreshFolders()
      }
    } catch (err) {
      console.error('Failed to delete folder:', err)
    } finally {
      setFolderToDelete(null)
    }
  }

  return (
    <>
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
          style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setIsCreatingFolder(!isCreatingFolder)}
          title="New Folder"
        >
          +
        </button>
      </div>

      {isCreatingFolder && (
        <div style={{ padding: '0 16px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
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
            <button className="btn btn-primary" style={{ padding: '4px 8px', minWidth: 40 }} onClick={handleCreateFolder}>✓</button>
          </div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={isNewFolderLocked} onChange={e => setIsNewFolderLocked(e.target.checked)} />
            🔒 Require Touch ID
          </label>
        </div>
      )}

      <div style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
        <div 
          className="nav-item" 
          onClick={() => setActiveFolderId && setActiveFolderId('all')}
          style={{ 
            cursor: 'pointer', 
            background: activeFolderId === 'all' ? 'var(--accent-primary-alpha-12)' : 'transparent',
            color: activeFolderId === 'all' ? 'var(--accent-primary)' : 'inherit',
            border: activeFolderId === 'all' ? '1px solid var(--accent-primary-alpha-25)' : '1px solid transparent'
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
              background: dragOverFolderId === f._id ? 'var(--accent-primary-alpha-20)' : activeFolderId === f._id ? 'var(--accent-primary-alpha-12)' : 'transparent',
              border: dragOverFolderId === f._id ? '1px dashed var(--accent-primary)' : activeFolderId === f._id ? '1px solid var(--accent-primary-alpha-25)' : '1px solid transparent',
              color: activeFolderId === f._id ? 'var(--accent-primary)' : 'inherit'
            }}
            title={isCollapsed ? f.name : undefined}
            onClick={() => handleSelectFolder(f)}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(f._id) }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDrop(e, f._id)}
          >
            <span className="nav-item-icon">{f.isLocked ? '🔒' : '📂'}</span>
            <span className="nav-item-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setFolderToDelete(f); }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5, fontSize: 12 }}
              className="nav-count"
            >
              ✕
            </button>
          </div>
        ))}</div>

      {/* Footer */}
      <div className="sidebar-footer">
        {!isCollapsed && (
          <button
            className="sidebar-user"
            style={{ 
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
              borderRadius: 8, padding: '8px 12px', marginBottom: 12, width: '100%',
              display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer',
              color: 'var(--text-primary)', fontSize: 13, justifyContent: 'center'
            }}
            onClick={hasPasskey ? () => setIsPasskeyModalOpen(true) : registerTouchID}
          >
            {hasPasskey ? '🔐 Touch ID Active' : '🔑 Register Touch ID'}
          </button>
        )}

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
          className="nav-item theme-toggle"
          style={{ marginTop: 8 }}
          onClick={openThemeModal}
        >
          <span className="nav-item-icon">{currentThemeData.icon}</span>
          <span className="nav-item-label">{currentThemeData.label}</span>
        </button>
        <button
          id="signout-btn"
          className="nav-item"
          style={{ marginTop: 8 }}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <span className="nav-item-icon">🚪</span>
          <span className="nav-item-label">Sign Out</span>
        </button>
      </div>
    </nav>

      {/* Theme Selection Modal */}
      {isThemeModalOpen && (
        <div className="modal-overlay" onClick={closeThemeModal} style={{ zIndex: 9999 }}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 400, width: '100%', padding: 24, borderRadius: 20 }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Select Theme</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: t.id === theme ? 'var(--accent-primary-alpha-15)' : 'var(--bg-card)',
                    border: `1px solid ${t.id === theme ? 'var(--accent-primary-alpha-40)' : 'var(--border)'}`,
                    borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)',
                    textAlign: 'left', transition: 'all 0.2s ease', fontWeight: t.id === theme ? 600 : 400
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button 
                onClick={closeThemeModal}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Delete Modal */}
      {folderToDelete && (
        <div className="modal-overlay" onClick={() => setFolderToDelete(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Folder?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Are you sure you want to delete "{folderToDelete.name}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--text-primary)' }} onClick={() => setFolderToDelete(null)}>
                Cancel
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                onClick={confirmDeleteFolder}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <PasskeyManagerModal 
        isOpen={isPasskeyModalOpen}
        onClose={() => setIsPasskeyModalOpen(false)}
        onDeletePasskey={handleDeletePasskey}
      />
    </>
  )
}
