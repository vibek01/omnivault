'use client'

import { useState, useRef, useEffect } from 'react'

interface IngestPanelProps {
  onClose: () => void
  onSuccess: () => void
  initialContent?: string
  initialTab?: 'text' | 'link'
  folderId?: string
  folderName?: string
}

export default function IngestPanel({ onClose, onSuccess, initialContent = '', initialTab = 'text', folderId, folderName }: IngestPanelProps) {
  const [tab, setTab] = useState<'text' | 'link' | 'password'>(initialTab)
  const [content, setContent] = useState(initialContent)
  const [passwordName, setPasswordName] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    // Force focus when tab changes
    setTimeout(() => {
      if (tab === 'text') document.getElementById('ingest-text-input')?.focus()
      else if (tab === 'link') document.getElementById('ingest-link-input')?.focus()
      else if (tab === 'password') document.getElementById('ingest-password-name')?.focus()
    }, 10)
  }, [tab])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    // Markdown formatting hotkeys for text tab
    if (tab === 'text' && (e.metaKey || e.ctrlKey)) {
      const textarea = textareaRef.current
      if (textarea) {
        let prefix = ''
        let suffix = ''
        let defaultText = ''
        
        if (e.key === 'b') { prefix = '**'; suffix = '**'; defaultText = 'bold text' }
        else if (e.key === 'i') { prefix = '*'; suffix = '*'; defaultText = 'italic text' }
        else if (e.key === 'k') { prefix = '['; suffix = '](url)'; defaultText = 'link text' }
        else if (e.key === 'c' && e.shiftKey) { prefix = '`'; suffix = '`'; defaultText = 'code' }
        else if (e.key === 'x' && e.shiftKey) { prefix = '~~'; suffix = '~~'; defaultText = 'strikethrough' }

        if (prefix) {
          e.preventDefault()
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const selectedText = content.substring(start, end)
          const insertText = selectedText || defaultText
          
          const newContent = content.substring(0, start) + prefix + insertText + suffix + content.substring(end)
          setContent(newContent)
          
          // Restore cursor position inside the wrapper after state update
          setTimeout(() => {
            textarea.focus()
            if (selectedText) {
              textarea.setSelectionRange(start, start + prefix.length + insertText.length + suffix.length)
            } else {
              textarea.setSelectionRange(start + prefix.length, start + prefix.length + insertText.length)
            }
          }, 0)
          return
        }
      }
    }

    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }
  }

  const handleSubmit = async () => {
    let finalContent = content
    let finalType = tab

    if (tab === 'password') {
      if (!passwordName.trim() || !passwordValue.trim()) return
      finalContent = passwordName.trim()
      finalType = 'text' as any
    } else {
      if (!content.trim()) return
    }

    setSubmitting(true)
    setError('')

    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const payload: any = { type: finalType, content: finalContent.trim(), tags: tagList, folderId }
      if (tab === 'password') {
        payload.isPassword = true
        payload.credentials = {
          username: passwordName.trim(),
          password: passwordValue.trim()
        }
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')

      setContent('')
      setPasswordName('')
      setPasswordValue('')
      setTags('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ingest-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16 }}>
          ✨ Quick Capture to {folderName || 'Main Vault'}
        </h3>
        <button className="btn btn-icon" onClick={onClose} aria-label="Close panel">✕</button>
      </div>

      <div className="ingest-tabs">
        <button
          id="ingest-tab-text"
          className={`ingest-tab ${tab === 'text' ? 'active' : ''}`}
          onClick={() => setTab('text')}
        >
          📝 Note
        </button>
        <button
          id="ingest-tab-link"
          className={`ingest-tab ${tab === 'link' ? 'active' : ''}`}
          onClick={() => setTab('link')}
        >
          🔗 Link
        </button>
        <button
          id="ingest-tab-password"
          className={`ingest-tab ${tab === 'password' ? 'active' : ''}`}
          onClick={() => setTab('password')}
        >
          🔑 Password
        </button>
      </div>

      {tab === 'text' ? (
        <>
          <textarea
            id="ingest-text-input"
            ref={textareaRef}
            className="ingest-textarea"
            placeholder="Paste a note, message snippet, code block, or anything you want to remember..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginBottom: 16 }}>
            ✨ Markdown formatting is fully supported. Use <kbd>Cmd+Enter</kbd> to submit.
          </div>
        </>
      ) : tab === 'link' ? (
        <input
          id="ingest-link-input"
          className="ingest-input"
          type="url"
          placeholder="https://amazon.in/product/... or any URL"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <>
          <input
            id="ingest-password-name"
            className="ingest-input mobile-full-width"
            placeholder="Account Name (e.g. Gmail)"
            value={passwordName}
            onChange={(e) => setPasswordName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ width: `max(40%, ${passwordName.length + 2}ch)`, maxWidth: '100%', transition: 'width 0.1s' }}
          />
          <div className="mobile-full-width" style={{ position: 'relative', marginTop: 12, width: `max(40%, ${passwordValue.length + 4}ch)`, maxWidth: '100%', transition: 'width 0.1s' }}>
            <input
              id="ingest-password-value"
              className="ingest-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ paddingRight: 40, width: '100%' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </>
      )}

      <div className="tags-input-wrap">
        <div className="tags-input-label">Tags (comma separated, optional)</div>
        <input
          id="ingest-tags-input"
          className="ingest-input"
          placeholder="e.g. shopping, whatsapp, work"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {error && (
        <p style={{ color: '#f87171', fontSize: 13, marginTop: 10 }}>⚠️ {error}</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          id="ingest-submit-btn"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || (tab === 'password' ? (!passwordName.trim() || !passwordValue.trim()) : !content.trim())}
        >
          {submitting
            ? tab === 'link' ? '🔍 Fetching preview…' : '💾 Saving…'
            : tab === 'link' ? '🔗 Save Link' : tab === 'password' ? '🔑 Save Password' : '📝 Save Note'}
        </button>
      </div>
    </div>
  )
}
