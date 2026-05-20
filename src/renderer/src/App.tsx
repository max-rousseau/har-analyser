import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from './components/empty-state'
import { EntryDetail } from './components/entry-detail'
import { EntryList, type ListItem } from './components/entry-list'
import { FilterBar, type ActiveFilter, type FilterField } from './components/filter-bar'
import { SplitPane } from './components/split-pane'
import { StatusBar } from './components/status-bar'
import { TitleBar } from './components/title-bar'
import { useHar } from './hooks/use-har'
import { parseEntryUrl, sessionKeyFor, type HarEntry } from './lib/har'
import {
  applyTheme,
  currentResolvedTheme,
  type ResolvedTheme,
  type Theme,
  type ThemePack,
} from './lib/theme'

interface AppProps {
  initialTheme: Theme
  initialThemePack: ThemePack
}

export default function App({ initialTheme, initialThemePack }: AppProps) {
  const doc = useHar()
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [themePack, setThemePackState] = useState<ThemePack>(initialThemePack)
  const [, setResolvedTheme] = useState<ResolvedTheme>(currentResolvedTheme())
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [search, setSearch] = useState('')
  const [sessionView, setSessionView] = useState(false)
  const [filterMode, setFilterMode] = useState(true)
  const [addFilterMode, setAddFilterMode] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set())
  const [primaryIndex, setPrimaryIndex] = useState<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const selectSingle = useCallback((index: number) => {
    setPrimaryIndex(index)
    setSelectedIndices(new Set([index]))
  }, [])

  const clearSelection = useCallback(() => {
    setPrimaryIndex(null)
    setSelectedIndices(new Set())
  }, [])

  useEffect(() => {
    applyTheme(theme, themePack, setResolvedTheme)
  }, [theme, themePack])

  useEffect(() => {
    const offTheme = window.api.onThemeChanged((next) => setThemeState(next))
    const offPack = window.api.onThemePackChanged((next) => setThemePackState(next))
    return () => {
      offTheme()
      offPack()
    }
  }, [])

  const confirmCanProceed = useCallback(async (): Promise<boolean> => {
    if (!doc.dirty) return true
    const choice = await window.api.confirmDiscard(doc.state.name)
    if (choice === 'cancel') return false
    if (choice === 'discard') return true
    return doc.save()
  }, [doc])

  const handleOpen = useCallback(async () => {
    if (!(await confirmCanProceed())) return
    const file = await window.api.openFile()
    if (file) {
      doc.adoptOpened(file)
      setFilters([])
      setSearch('')
      clearSelection()
    }
  }, [doc, confirmCanProceed, clearSelection])

  const handleOpenExternal = useCallback(
    async (path: string) => {
      if (!(await confirmCanProceed())) return
      const file = await window.api.readFile(path)
      doc.adoptOpened(file)
      setFilters([])
      setSearch('')
      clearSelection()
    },
    [doc, confirmCanProceed, clearSelection],
  )

  useEffect(() => {
    const offOpen = window.api.onMenuOpen(handleOpen)
    const offSave = window.api.onMenuSave(() => void doc.save())
    const offSaveAs = window.api.onMenuSaveAs(() => void doc.saveAs())
    const offExternal = window.api.onFileOpenedExternally(handleOpenExternal)
    const offFind = window.api.onMenuFind(() => searchInputRef.current?.focus())
    const offSession = window.api.onMenuToggleSessionView(() =>
      setSessionView((v) => !v),
    )
    const offClear = window.api.onMenuClearFilters(() => {
      setFilters([])
      setSearch('')
    })
    const offInvert = window.api.onMenuInvertFilter(() => {
      setFilters((fs) => {
        if (fs.length === 0) return fs
        const last = fs.length - 1
        return fs.map((f, i) => (i === last ? { ...f, inverted: !f.inverted } : f))
      })
    })
    const offDelete = window.api.onMenuDeleteEntry(() => {
      if (selectedIndices.size > 0) {
        for (const i of selectedIndices) doc.deleteEntry(i)
        clearSelection()
      }
    })
    return () => {
      offOpen()
      offSave()
      offSaveAs()
      offExternal()
      offFind()
      offSession()
      offClear()
      offInvert()
      offDelete()
    }
  }, [doc, handleOpen, handleOpenExternal, selectedIndices, clearSelection])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (e.key === 'Escape') {
        if (inField) return
        if (primaryIndex != null || selectedIndices.size > 0) {
          clearSelection()
        } else if (filters.length > 0 || search) {
          setFilters([])
          setSearch('')
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
        if (inField) return
        e.preventDefault()
        selectAllRef.current()
        return
      }
      if (!inField && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          setFilterMode((v) => !v)
          return
        }
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          setAddFilterMode((v) => !v)
          return
        }
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault()
          setSessionView((v) => !v)
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primaryIndex, selectedIndices.size, filters.length, search, clearSelection])

  useEffect(() => {
    document.title = doc.dirty
      ? `${doc.state.name} — HAR Analyser (modified)`
      : doc.state.path
        ? `${doc.state.name} — HAR Analyser`
        : 'HAR Analyser'
  }, [doc.state.name, doc.state.path, doc.dirty])

  useEffect(() => {
    window.api.setCurrentFile(doc.state.path)
  }, [doc.state.path])

  useEffect(() => {
    window.api.setDirty(doc.dirty)
  }, [doc.dirty])

  useEffect(() => {
    return window.api.onCloseRequested(async () => {
      const choice = await window.api.confirmDiscard(doc.state.name)
      if (choice === 'cancel') {
        window.api.cancelClose()
        return
      }
      if (choice === 'save') {
        const saved = await doc.save()
        if (!saved) {
          window.api.cancelClose()
          return
        }
      }
      window.api.allowClose()
    })
  }, [doc])

  const visibleItems = useMemo<ListItem[]>(() => {
    if (!doc.state.har) return []
    const needle = search.trim().toLowerCase()
    const applyChipFilters = filterMode && filters.length > 0
    const result: ListItem[] = []
    doc.entries.forEach((entry, i) => {
      if (doc.state.deletedIndices.has(i)) return
      if (applyChipFilters && !matchesFilters(entry, filters, doc.sessionCookieNames)) return
      if (needle && !matchesSearch(entry, needle)) return
      result.push({ originalIndex: i, entry })
    })
    return result
  }, [
    doc.state.har,
    doc.state.deletedIndices,
    doc.entries,
    doc.sessionCookieNames,
    filters,
    filterMode,
    search,
  ])

  useEffect(() => {
    const visibleSet = new Set(visibleItems.map((it) => it.originalIndex))
    setSelectedIndices((prev) => {
      let changed = false
      const next = new Set<number>()
      for (const i of prev) {
        if (visibleSet.has(i)) next.add(i)
        else changed = true
      }
      return changed ? next : prev
    })
    setPrimaryIndex((prev) => (prev != null && visibleSet.has(prev) ? prev : null))
  }, [visibleItems])

  const selectAllVisible = useCallback(() => {
    setSelectedIndices(new Set(visibleItems.map((it) => it.originalIndex)))
    setPrimaryIndex(visibleItems[0]?.originalIndex ?? null)
  }, [visibleItems])

  const selectAllRef = useRef(selectAllVisible)
  useEffect(() => {
    selectAllRef.current = selectAllVisible
  }, [selectAllVisible])

  const deleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return
    for (const i of selectedIndices) doc.deleteEntry(i)
    clearSelection()
  }, [selectedIndices, doc, clearSelection])

  const addFilter = useCallback(
    (field: FilterField, value: string) => {
      setFilters((fs) => {
        if (fs.some((f) => f.field === field && f.value === value && !f.inverted)) {
          return fs
        }
        return [...fs, { field, value, inverted: false }]
      })
    },
    [],
  )

  const handleListFilter = useCallback(
    (field: 'method' | 'domain' | 'path' | 'session', value: string) => {
      addFilter(field, value)
      setAddFilterMode(false)
    },
    [addFilter],
  )

  const removeFilter = (i: number) => setFilters((fs) => fs.filter((_, idx) => idx !== i))
  const toggleInvertFilter = (i: number) =>
    setFilters((fs) => fs.map((f, idx) => (idx === i ? { ...f, inverted: !f.inverted } : f)))
  const updateFilterValue = (i: number, value: string) =>
    setFilters((fs) => fs.map((f, idx) => (idx === i ? { ...f, value } : f)))

  const selectedEntry =
    primaryIndex != null && doc.state.har ? doc.entries[primaryIndex] ?? null : null

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <TitleBar
        fileName={doc.state.path ? doc.state.name : null}
        dirty={doc.dirty}
        entryCount={doc.entries.length || undefined}
      />
      {doc.state.har ? (
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onClear={() => {
              setFilters([])
              setSearch('')
            }}
            onRemove={removeFilter}
            onToggleInvert={toggleInvertFilter}
            onUpdateValue={updateFilterValue}
            sessionView={sessionView}
            onToggleSessionView={() => setSessionView((v) => !v)}
            filterMode={filterMode}
            onToggleFilterMode={() => setFilterMode((v) => !v)}
            addFilterMode={addFilterMode}
            onToggleAddFilterMode={() => setAddFilterMode((v) => !v)}
            searchInputRef={searchInputRef}
          />
          {selectedEntry ? (
            <SplitPane
              storageKey="har-analyser:split:left-px"
              minLeft={360}
              minRight={320}
              defaultLeftPx={640}
              left={
                <EntryList
                  items={visibleItems}
                  selectedIndices={selectedIndices}
                  primaryIndex={primaryIndex}
                  onSelect={selectSingle}
                  onClearSelection={clearSelection}
                  onDelete={deleteSelected}
                  onDeleteEntry={doc.deleteEntry}
                  sessionView={sessionView}
                  sessionCookieNames={doc.sessionCookieNames}
                  sessionColorMap={doc.sessionColorMap}
                  addFilterMode={addFilterMode}
                  onFilter={handleListFilter}
                />
              }
              right={<EntryDetail entry={selectedEntry} index={primaryIndex} />}
            />
          ) : (
            <div className="flex min-h-0 flex-1">
              <EntryList
                items={visibleItems}
                selectedIndices={selectedIndices}
                primaryIndex={primaryIndex}
                onSelect={selectSingle}
                onClearSelection={clearSelection}
                onDelete={deleteSelected}
                onDeleteEntry={doc.deleteEntry}
                sessionView={sessionView}
                sessionCookieNames={doc.sessionCookieNames}
                sessionColorMap={doc.sessionColorMap}
                addFilterMode={addFilterMode}
                onFilter={handleListFilter}
              />
            </div>
          )}
          <StatusBar
            visibleCount={visibleItems.length}
            totalCount={doc.entries.length}
            deletedCount={doc.state.deletedIndices.size}
            onRestoreDeleted={doc.clearDeletions}
            fileName={doc.state.path}
            sessionView={sessionView}
            sessionCount={doc.sessionColorMap.size}
            parseError={doc.state.parseError}
          />
        </>
      ) : (
        <EmptyState onOpen={handleOpen} error={doc.state.parseError} />
      )}
    </div>
  )
}

function matchesFilters(
  entry: HarEntry,
  filters: ActiveFilter[],
  sessionCookieNames: string[],
): boolean {
  for (const f of filters) {
    const hit = matchesFilter(entry, f, sessionCookieNames)
    if (f.inverted ? hit : !hit) return false
  }
  return true
}

function matchesFilter(
  entry: HarEntry,
  filter: ActiveFilter,
  sessionCookieNames: string[],
): boolean {
  const url = parseEntryUrl(entry.request.url)
  switch (filter.field) {
    case 'method':
      return entry.request.method === filter.value
    case 'domain':
      return url.domain === filter.value
    case 'path':
      return url.path === filter.value
    case 'session':
      return sessionKeyFor(entry, sessionCookieNames) === filter.value
    case 'search':
      return matchesSearch(entry, filter.value.toLowerCase())
  }
}

function matchesSearch(entry: HarEntry, needle: string): boolean {
  if (!needle) return true
  if (entry.request.method.toLowerCase().includes(needle)) return true
  if (String(entry.response.status).includes(needle)) return true
  return entry.request.url.toLowerCase().includes(needle)
}
