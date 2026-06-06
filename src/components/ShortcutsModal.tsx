import { useEffect } from 'react'

interface ShortcutsModalProps {
  onClose: () => void
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>Keyboard shortcuts</h2>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
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
              <kbd className="shortcut-kbd">Cmd + V</kbd>
            </div>
            <div className="shortcut-row">
              <span>Quick Note Capture</span>
              <kbd className="shortcut-kbd">Cmd + Shift + U</kbd>
            </div>
            <div className="shortcut-row">
              <span>Password Capture</span>
              <kbd className="shortcut-kbd">Cmd + Shift + P</kbd>
            </div>
            <div className="shortcut-row">
              <span>Link Capture</span>
              <kbd className="shortcut-kbd">Cmd + Shift + L</kbd>
            </div>
            <div className="shortcut-row">
              <span>Media Upload Modal</span>
              <kbd className="shortcut-kbd">Cmd + Shift + N</kbd>
            </div>
            <div className="shortcut-row">
              <span>Toggle Sidebar</span>
              <kbd className="shortcut-kbd">Cmd + Shift + S</kbd>
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
              <span>Show Notes (Texts)</span>
              <kbd className="shortcut-kbd">Opt + 1</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Images</span>
              <kbd className="shortcut-kbd">Opt + 2</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Videos</span>
              <kbd className="shortcut-kbd">Opt + 3</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Links</span>
              <kbd className="shortcut-kbd">Opt + 4</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show Documents</span>
              <kbd className="shortcut-kbd">Opt + 5</kbd>
            </div>
            <div className="shortcut-row">
              <span>Show All Items</span>
              <kbd className="shortcut-kbd">Opt + 6</kbd>
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
