import { useEffect } from 'react'

interface PasskeyManagerModalProps {
  isOpen: boolean
  onClose: () => void
  onDeletePasskey: () => void
}

export default function PasskeyManagerModal({ isOpen, onClose, onDeletePasskey }: PasskeyManagerModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>Touch ID Active</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Your Mac's Touch ID is currently linked to your OmniVault account. You can use it to securely lock and access your sensitive folders.
        </p>

        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 24, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Device Credential</span>
            <span style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'var(--accent-primary-alpha-12)', padding: '2px 8px', borderRadius: 12 }}>Active</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'left', margin: 0 }}>
            Bound to this device's secure enclave.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            className="btn" 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '12px',
              width: '100%'
            }}
            onClick={() => {
              if (confirm('Are you sure you want to remove your Touch ID credential? You will lose access to any currently locked folders until you register a new one.')) {
                onDeletePasskey()
              }
            }}
          >
            Remove Touch ID
          </button>
          
          <button className="btn" style={{ width: '100%', padding: '12px' }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
