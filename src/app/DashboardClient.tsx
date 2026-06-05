'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VaultItemCard from '@/components/VaultItemCard'
import UploadDropzone from '@/components/UploadDropzone'
import IngestPanel from '@/components/IngestPanel'
import ItemModal from '@/components/ItemModal'
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

const TABS = ['all', 'image', 'video', 'link', 'text', 'document'] as const

export default function DashboardClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [items, setItems] = useState<CastItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [activeFolderId, setActiveFolderId] = useState<string>('all')
  const [folders, setFolders] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [showIngest, setShowIngest] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CastItem | null>(null)

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
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 400)
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
        setPastedFiles(files)
        setShowUpload(true)
        setShowIngest(false)
        return
      }

      const text = e.clipboardData?.getData('text')
      if (text) {
        setPastedText(text)
        setPastedTab(text.startsWith('http') ? 'link' : 'text')
        setShowIngest(true)
        setShowUpload(false)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const fetchItems = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setLoading(true)
    } else setLoadingMore(true)

    const params = new URLSearchParams({
      page: String(page),
      limit: '21',
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
  }, [activeFilter, debouncedSearch, dateFilter, customDateStart, customDateEnd, activeFolderId])

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
    } catch {}
  }, [activeFolderId])

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data)
    } catch {}
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
      window.addEventListener('vault-refresh', handleRefresh)
      return () => window.removeEventListener('vault-refresh', handleRefresh)
    } else if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, activeFilter, debouncedSearch, fetchItems, fetchCounts, router])

  const handleFilterChange = (f: string) => {
    setActiveFilter(f)
    setItems([])
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setItems((prev) => prev.filter((i) => i._id !== id))
      fetchCounts()
      addToast('Item deleted safely', 'success')
    } catch {
      addToast('Failed to delete item', 'error')
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
                aria-label="Search vault items"
              />
            </div>
            <div className="topbar-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select
                className="ingest-input"
                style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: '#1a1b23', cursor: 'pointer', outline: 'none' }}
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
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: '#1a1b23' }}
                  value={customDateStart}
                  onChange={(e) => { setCustomDateStart(e.target.value); setItems([]); }}
                />
              )}

              {dateFilter === 'range' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="date"
                    className="ingest-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: '#1a1b23' }}
                    value={customDateStart}
                    onChange={(e) => { setCustomDateStart(e.target.value); if (customDateEnd) setItems([]); }}
                  />
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>to</span>
                  <input
                    type="date"
                    className="ingest-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 36, backgroundColor: '#1a1b23' }}
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
                folderId={activeFolderId !== 'all' ? activeFolderId : undefined}
                folderName={activeFolderId !== 'all' ? folders.find(f => f._id === activeFolderId)?.name : 'Main Vault'}
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
                      background: activeFilter === t ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
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
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
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
                      onDelete={handleDelete}
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
          </div>
        </main>
      </div>

      {/* Upload overlay */}
      {showUpload && (
        <UploadDropzone
          onClose={() => { setShowUpload(false); setPastedFiles([]); }}
          onSuccess={handleSuccess}
          initialFiles={pastedFiles}
          folderId={activeFolderId !== 'all' ? activeFolderId : undefined}
          folderName={activeFolderId !== 'all' ? folders.find(f => f._id === activeFolderId)?.name : 'Main Vault'}
        />
      )}

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

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
