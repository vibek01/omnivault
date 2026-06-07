'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VaultItemCard from '@/components/VaultItemCard'
import UploadDropzone from '@/components/UploadDropzone'
import IngestPanel from '@/components/IngestPanel'
import ItemModal from '@/components/ItemModal'
import ShortcutsModal from '@/components/ShortcutsModal'
import ToastContainer, { Toast, ToastType } from '@/components/ToastContainer'
import type { IVaultItem } from '@/models/VaultItem'

type CastItem = IVaultItem & { _id: string }

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
}

const TABS = ['all', 'text', 'image', 'link', 'document', 'video'] as const

export default function DashboardClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [items, setItems] = useState<CastItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [activeFolderId, setActiveFolderId] = useState<string>('all')
  const [folders, setFolders] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [sortFilter, setSortFilter] = useState<string>('date_desc')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [showIngest, setShowIngest] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CastItem | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const [pastedFiles, setPastedFiles] = useState<File[]>([])
  const [pastedText, setPastedText] = useState('')
  const [pastedTab, setPastedTab] = useState<'text' | 'link'>('text')

  const [toasts, setToasts] = useState<Toast[]>([])
  const searchRef = useRef<NodeJS.Timeout | null>(null)

  // Counts per type (refetched lightly)
  const [counts, setCounts] = useState({ all: 0, image: 0, video: 0, link: 0, text: 0, document: 0 })

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [search])

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLElement) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      }

      const files = Array.from(e.clipboardData?.files || [])
      if (files.length > 0) {
        e.preventDefault()
        setPastedFiles(files)
        setShowUpload(true)
        setShowIngest(false)
        return
      }

      const text = e.clipboardData?.getData('text')
      if (text) {
        e.preventDefault()
        setPastedText(text)
        setPastedTab(text.startsWith('http') ? 'link' : 'text')
        setShowIngest(true)
        setShowUpload(false)
      }
    }

    window.addEventListener('paste', handlePaste)

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable

      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setShowShortcuts(true)
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }

      // Cmd-based shortcuts work even if an input is focused
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault()
        setShowUpload(true)
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyU') {
        e.preventDefault()
        setPastedTab('text')
        setShowIngest(true)
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault()
        setPastedTab('password')
        setShowIngest(true)
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault()
        setPastedTab('link')
        setShowIngest(true)
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault()
        window.dispatchEvent(new Event('toggle-sidebar'))
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === 'KeyU') {
        e.preventDefault()
        document.getElementById('native-upload-input')?.click()
      }

      if (!isInput) {
        // Theme Toggles (Ctrl+T and Ctrl+Shift+T)
        if (e.ctrlKey && !e.metaKey && e.code === 'KeyT') {
          e.preventDefault()
          if (e.shiftKey) {
            // Cycle Themes
            const themes = ['dark', 'light', 'dracula']
            const current = document.documentElement.getAttribute('data-theme') || 'dark'
            const next = themes[(themes.indexOf(current) + 1) % themes.length]
            document.documentElement.setAttribute('data-theme', next)
            localStorage.setItem('theme', next)
          } else {
            // Toggle Light/Dark
            const current = document.documentElement.getAttribute('data-theme') || 'dark'
            const next = current === 'light' ? 'dark' : 'light'
            document.documentElement.setAttribute('data-theme', next)
            localStorage.setItem('theme', next)
          }
        }
        // Filter Tags (Ctrl+1 to 6 or Option+1 to 6)
        else if ((e.ctrlKey || e.altKey) && !e.shiftKey && !e.metaKey) {
          const isNum = (n: number) => e.key === String(n) || e.code === `Digit${n}` || e.code === `Numpad${n}`
          
          if (isNum(1)) { e.preventDefault(); handleFilterChange('all'); }
          else if (isNum(2)) { e.preventDefault(); handleFilterChange('text'); }
          else if (isNum(3)) { e.preventDefault(); handleFilterChange('image'); }
          else if (isNum(4)) { e.preventDefault(); handleFilterChange('link'); }
          else if (isNum(5)) { e.preventDefault(); handleFilterChange('document'); }
          else if (isNum(6)) { e.preventDefault(); handleFilterChange('video'); }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('paste', handlePaste)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeFilter])

  const fetchItems = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setLoading(true)
    } else setLoadingMore(true)

    const params = new URLSearchParams({
      page: String(page),
      limit: '21',
      sort: sortFilter,
      ...(activeFilter !== 'all' ? { type: activeFilter } : {}),
      ...(activeFolderId === 'all' ? { folderId: 'root' } : { folderId: activeFolderId }),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(dateFilter !== 'all' && dateFilter !== 'custom' && dateFilter !== 'range' ? { date: dateFilter } : {}),
      ...(dateFilter === 'custom' && customDateStart ? { customDate: customDateStart } : {}),
      ...(dateFilter === 'range' && customDateStart && customDateEnd ? { startDate: customDateStart, endDate: customDateEnd } : {}),
    })

    try {
      const res = await fetch(`/api/items?${params}&t=${Date.now()}`)
      const data = await res.json()
      setItems((prev) => append ? [...prev, ...data.items] : data.items)
      setPagination(data.pagination)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeFilter, debouncedSearch, dateFilter, sortFilter, customDateStart, customDateEnd, activeFolderId])

  const fetchCounts = useCallback(async () => {
    try {
      const folderParam = activeFolderId === 'all' ? '&folderId=root' : `&folderId=${activeFolderId}`
      const results = await Promise.all(
        TABS.map((t) =>
          fetch(`/api/items?limit=1${t !== 'all' ? `&type=${t}` : ''}${folderParam}`)
            .then((r) => r.json())
            .then((d) => [t, d.pagination?.total ?? 0])
        )
      )
      const c: Record<string, number> = {}
      results.forEach(([t, n]) => { c[t as string] = n as number })
      setCounts(c as typeof counts)
    } catch { }
  }, [activeFolderId])

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data)
    } catch { }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItems(1)
      fetchCounts()
      fetchFolders()

      const handleRefresh = () => {
        fetchItems(1)
        fetchCounts()
      }
      
      const handleToast = (e: any) => {
        if (e.detail && e.detail.message) {
          addToast(e.detail.message, e.detail.type || 'info')
        }
      }

      window.addEventListener('vault-refresh', handleRefresh)
      window.addEventListener('vault-toast', handleToast)
      
      return () => {
        window.removeEventListener('vault-refresh', handleRefresh)
        window.removeEventListener('vault-toast', handleToast)
      }
    } else if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, activeFilter, debouncedSearch, fetchItems, fetchCounts, router])

  const handleFilterChange = (f: string) => {
    if (f !== activeFilter) {
      setActiveFilter(f)
      setItems([])
      setSelectedItems(new Set())
    }
  }

  const handleDeleteRequest = (id: string) => {
    setItemToDelete(id)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch(`/api/items/${itemToDelete}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setItems((prev) => prev.filter((i) => i._id !== itemToDelete))
      setSelectedItems(prev => { const n = new Set(prev); n.delete(itemToDelete); return n; })
      fetchCounts()
      addToast('Item deleted safely', 'success')
    } catch {
      addToast('Failed to delete item', 'error')
    } finally {
      setItemToDelete(null)
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    try {
      const promises = Array.from(selectedItems).map(id => fetch(`/api/items/${id}`, { method: 'DELETE' }))
      await Promise.all(promises)
      setItems(prev => prev.filter(i => !selectedItems.has(i._id)))
      setSelectedItems(new Set())
      fetchCounts()
      addToast(`Deleted items`, 'success')
    } catch {
      addToast('Failed to delete some items', 'error')
    } finally {
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleNextItem = () => {
    if (!selectedItem) return
    const index = items.findIndex(i => i._id === selectedItem._id)
    if (index >= 0 && index < items.length - 1) {
      setSelectedItem(items[index + 1])
    }
  }

  const handlePrevItem = () => {
    if (!selectedItem) return
    const index = items.findIndex(i => i._id === selectedItem._id)
    if (index > 0) {
      setSelectedItem(items[index - 1])
    }
  }

  const handleSuccess = () => {
    fetchItems(1)
    fetchCounts()
    addToast('Saved to vault! ✨', 'success')
  }

  const handleLoadMore = () => {
    if (pagination?.hasNext) fetchItems(pagination.page + 1, true)
  }

  if (status === 'loading') return null

  const FILTER_LABELS: Record<string, string> = {
    all: '⚡ All',
    image: '🖼️ Images',
    video: '🎬 Videos',
    link: '🔗 Links',
    text: '📝 Notes',
    document: '📄 Documents',
  }

  return (
    <>
      <div className="app-layout">
        {session && (
          <Sidebar
            session={session}
            counts={counts}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            folders={folders}
            activeFolderId={activeFolderId}
            setActiveFolderId={(id: string) => { setActiveFolderId(id); setItems([]); }}
            refreshFolders={fetchFolders}
          />
        )}

        <main className="main-content">
          {/* Topbar */}
          <header className="topbar">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                id="global-search"
                className="search-input"
                placeholder="Search your vault…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.currentTarget.blur()
                  }
                }}
                aria-label="Search vault items"
              />
            </div>
            <div className="topbar-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select
                className="custom-select"
                value={sortFilter}
                onChange={(e) => {
                  setSortFilter(e.target.value);
                  setItems([]);
                }}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="size_desc">Size (Largest)</option>
                <option value="size_asc">Size (Smallest)</option>
              </select>

              <select
                className="custom-select"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'custom' && e.target.value !== 'range') setItems([]);
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="year">This Year</option>
                <option value="custom">Specific Date</option>
                <option value="range">Date Range</option>
              </select>

              {dateFilter === 'custom' && (
                <input
                  type="date"
                  className="ingest-input"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: 'var(--input-bg)' }}
                  value={customDateStart}
                  onChange={(e) => { setCustomDateStart(e.target.value); setItems([]); }}
                />
              )}

              {dateFilter === 'range' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="date"
                    className="ingest-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: 'var(--input-bg)' }}
                    value={customDateStart}
                    onChange={(e) => { setCustomDateStart(e.target.value); if (customDateEnd) setItems([]); }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="date"
                    className="ingest-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: 'var(--input-bg)' }}
                    value={customDateEnd}
                    onChange={(e) => { setCustomDateEnd(e.target.value); if (customDateStart) setItems([]); }}
                  />
                </div>
              )}
              <button
                id="open-ingest-btn"
                className="btn btn-ghost"
                onClick={() => { setShowIngest(true); setShowUpload(false) }}
                aria-label="Quick capture text or link"
              >
                ✨ Capture
              </button>
              <button
                id="open-upload-btn"
                className="btn btn-primary"
                onClick={() => { setShowUpload(true); setShowIngest(false) }}
                aria-label="Upload files"
              >
                ⬆️ Upload
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="page-content">

            {/* Ingest panel */}
            {showIngest && (
              <IngestPanel
                onClose={() => { setShowIngest(false); setPastedText(''); }}
                onSuccess={handleSuccess}
                initialContent={pastedText}
                initialTab={pastedTab}
                folderId={activeFolderId !== 'all' && activeFolderId !== 'pinned' ? activeFolderId : undefined}
                folderName={activeFolderId === 'pinned' ? 'Main Vault' : activeFolderId !== 'all' ? folders.find(f => f._id === activeFolderId)?.name : 'Main Vault'}
              />
            )}

            {/* Top Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px', opacity: 0.8 }}>🗄️</div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{counts.all}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Items</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px', opacity: 0.8 }}>🖼️</div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{counts.image}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Images</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px', opacity: 0.8 }}>🎬</div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{counts.video}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Videos</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px', opacity: 0.8 }}>🔗</div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{counts.link}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Links</div>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={activeFilter === t}
                  className={`filter-tab ${activeFilter === t ? 'active' : ''}`}
                  onClick={() => handleFilterChange(t)}
                >
                  <span style={{ fontSize: '14px' }}>
                    {t === 'all' && '⚡'}
                    {t === 'image' && '🖼️'}
                    {t === 'video' && '🎬'}
                    {t === 'link' && '🔗'}
                    {t === 'text' && '📝'}
                    {t === 'document' && '📄'}
                  </span>
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                  {counts[t as keyof typeof counts] !== undefined && (
                    <span style={{
                      background: activeFilter === t ? 'var(--accent-primary-alpha-20)' : 'var(--border-overlay)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      marginLeft: '4px'
                    }}>
                      {counts[t as keyof typeof counts]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="vault-grid">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="vault-card skeleton"
                    style={{ height: [200, 280, 160, 220, 180][i % 5] }}
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🌌</span>
                <h2 className="empty-title">
                  {debouncedSearch ? 'No results found' : 'Your vault is empty'}
                </h2>
                <p className="empty-text">
                  {debouncedSearch
                    ? `Nothing matched "${debouncedSearch}". Try a different search.`
                    : 'Start by uploading files or capturing a note or link.'}
                </p>
                <button className="btn btn-primary" onClick={() => document.getElementById('native-upload-input')?.click()}>
                  ⬆️ Upload Files
                </button>
              </div>
            ) : (
              <>
                <div className="vault-grid" role="feed" aria-label="Vault items">
                  {items.map((item) => (
                    <VaultItemCard
                      key={item._id}
                      item={item}
                      onOpen={setSelectedItem}
                      onDelete={handleDeleteRequest}
                      isSelected={selectedItems.has(item._id)}
                      isSelectionMode={selectedItems.size > 0}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>

                {pagination?.hasNext && (
                  <div className="load-more-wrap">
                    <button
                      id="load-more-btn"
                      className="btn btn-ghost"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading…' : `Load more (${pagination.total - items.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Bulk actions bar */}
            {selectedItems.size > 0 && (
              <div style={{
                position: 'fixed',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--accent-primary)',
                boxShadow: 'var(--shadow-glow)',
                padding: '12px 24px',
                borderRadius: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                zIndex: 50,
                animation: 'slideDown 0.2s reverse'
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{selectedItems.size} selected</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleBulkDelete}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Upload overlay */}
      <input
        type="file"
        id="native-upload-input"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setPastedFiles(Array.from(e.target.files))
            setShowUpload(true)
            e.target.value = ''
          }
        }}
      />

      {showUpload && (
        <UploadDropzone
          onClose={() => { setShowUpload(false); setPastedFiles([]); }}
          onSuccess={handleSuccess}
          initialFiles={pastedFiles}
          folderId={activeFolderId !== 'all' && activeFolderId !== 'pinned' ? activeFolderId : undefined}
          folderName={activeFolderId === 'pinned' ? 'Main Vault' : activeFolderId !== 'all' ? folders.find(f => f._id === activeFolderId)?.name : 'Main Vault'}
        />
      )}

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          folders={folders}
          onUpdate={(updatedItem) => {
            if (updatedItem) {
              setItems(prev => prev.map(i => i._id === updatedItem._id ? updatedItem : i))
            } else {
              fetchItems(1)
              fetchCounts()
            }
          }}
          onNext={handleNextItem}
          onPrev={handlePrevItem}
          hasNext={items.findIndex(i => i._id === selectedItem._id) < items.length - 1}
          hasPrev={items.findIndex(i => i._id === selectedItem._id) > 0}
        />
      )}

      {/* Item Delete Modal */}
      {itemToDelete && (
        <div className="modal-overlay" onClick={() => setItemToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Item?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Are you sure you want to delete this item? The file will also be removed from Cloudinary.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--text-primary)' }} onClick={() => setItemToDelete(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>Delete {selectedItems.size} items?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Are you sure you want to delete {selectedItems.size} items? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--text-primary)' }} onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmBulkDelete}>Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
