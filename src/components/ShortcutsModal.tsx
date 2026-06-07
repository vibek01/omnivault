import { useEffect, useState } from 'react'

interface ShortcutsModalProps {
  onClose: () => void
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const [os, setOs] = useState<'mac' | 'windows'>('mac')

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win')) {
      setOs('windows')
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const cmdKey = os === 'mac' ? 'Cmd' : 'Ctrl'
  const optKey = os === 'mac' ? 'Opt' : 'Alt'

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>Keyboard shortcuts</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', gap: '4px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setOs('mac')}
                style={{ 
                  background: os === 'mac' ? 'var(--accent-primary-alpha-20)' : 'transparent',
                  color: os === 'mac' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                macOS
              </button>
              <button 
                onClick={() => setOs('windows')}
                style={{ 
                  background: os === 'windows' ? 'var(--accent-primary-alpha-20)' : 'transparent',
                  color: os === 'windows' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Windows
              </button>
            </div>
            <button className="btn-icon" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px' }}>✕</button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', fontWeight: 600 }}>Global Actions</h3>
            <div className="shortcut-row">
              <span>Search Vault</span>
              <kbd className="shortcut-kbd">/</kbd>
            </div>
            <div className="shortcut-row">
              <span>Quick Paste Capture</span>
              <kbd className="shortcut-kbd">{cmdKey} + V</kbd>
            </div>
            <div className="shortcut-row">
              <span>Quick Note Capture</span>
              <kbd className="shortcut-kbd">{cmdKey} + Shift + U</kbd>
            </div>
            <div className="shortcut-row">
              <span>Password Capture</span>
              <kbd className="shortcut-kbd">{cmdKey} + Shift + P</kbd>
            </div>
            <div className="shortcut-row">
              <span>Link Capture</span>
              <kbd className="shortcut-kbd">{cmdKey} + Shift + L</kbd>
            </div>
            <div className="shortcut-row">
              <span>Media Upload Modal</span>
              <kbd className="shortcut-kbd">{cmdKey} + Shift + N</kbd>
            </div>
            <div className="shortcut-row">
              <span>Toggle Sidebar</span>
              <kbd className="shortcut-kbd">{cmdKey} + Shift + S</kbd>
            </div>
            <div className="shortcut-row">
              <span>Toggle Light/Dark</span>
              <kbd className="shortcut-kbd">Ctrl + T</kbd>
            </div>
            <div className="shortcut-row">
              <span>Cycle Themes</span>
              <kbd className="shortcut-kbd">Ctrl + Shift + T</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Shortcuts</span>
              <kbd className="shortcut-kbd">?</kbd>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', fontWeight: 600 }}>Filter Navigation</h3>
            <div className="shortcut-row">
              <span>Show All Items</span>
              <kbd className="shortcut-kbd">{optKey} + 1</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Notes (Texts)</span>
              <kbd className="shortcut-kbd">{optKey} + 2</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Images</span>
              <kbd className="shortcut-kbd">{optKey} + 3</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Links</span>
              <kbd className="shortcut-kbd">{optKey} + 4</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Documents</span>
              <kbd className="shortcut-kbd">{optKey} + 5</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Videos</span>
              <kbd className="shortcut-kbd">{optKey} + 6</kbd>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .shortcut-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
          color: var(--text-primary);
        }
        .shortcut-row:last-child {
          border-bottom: none;
        }
        .shortcut-kbd {
          background: var(--bg-card);
          border: 1px solid var(--border);
          padding: 4px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
