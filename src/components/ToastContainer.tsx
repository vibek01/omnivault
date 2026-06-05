'use client'

import { useEffect, useRef, useId } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: '💡',
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  useEffect(() => {
    if (toasts.length === 0) return
    const latest = toasts[toasts.length - 1]
    const timer = setTimeout(() => onRemove(latest.id), 4000)
    return () => clearTimeout(timer)
  }, [toasts, onRemove])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{ICONS[t.type]}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            className="btn-icon"
            style={{ padding: '2px 6px', fontSize: 11, flexShrink: 0 }}
            onClick={() => onRemove(t.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
