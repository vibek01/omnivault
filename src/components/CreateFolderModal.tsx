'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface CreateFolderModalProps {
  onClose: () => void
  onCreate: (name: string, locked: boolean) => Promise<void>
}

export default function CreateFolderModal({ onClose, onCreate }: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const [locked, setLocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onCreate(name.trim(), locked)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0' }}>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700 }}>📁 New Folder</h2>
          <button className="btn btn-icon" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Folder Name
            </label>
            <input
              type="text"
              autoFocus
              className="ingest-input"
              style={{ width: '100%', margin: 0 }}
              placeholder="e.g. Work, Ideas, Receipts..."
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={submitting}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--bg-base)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
            <input 
              type="checkbox" 
              checked={locked} 
              onChange={e => setLocked(e.target.checked)} 
              disabled={submitting}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>🔒 Require Touch ID</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Folder contents will be hidden until authenticated</span>
            </div>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
