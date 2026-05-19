import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type FilterField = 'method' | 'domain' | 'path' | 'session' | 'search'

export interface ActiveFilter {
  field: FilterField
  value: string
  inverted: boolean
}

interface FilterBarProps {
  search: string
  onSearchChange: (next: string) => void
  filters: ActiveFilter[]
  onClear: () => void
  onRemove: (index: number) => void
  onToggleInvert: (index: number) => void
  onUpdateValue: (index: number, next: string) => void
  sessionView: boolean
  onToggleSessionView: () => void
  filterMode: boolean
  onToggleFilterMode: () => void
  addFilterMode: boolean
  onToggleAddFilterMode: () => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
}

const FIELD_LABELS: Record<FilterField, string> = {
  method: 'method',
  domain: 'domain',
  path: 'path',
  session: 'session',
  search: 'search',
}

export function FilterBar({
  search,
  onSearchChange,
  filters,
  onClear,
  onRemove,
  onToggleInvert,
  onUpdateValue,
  sessionView,
  onToggleSessionView,
  filterMode,
  onToggleFilterMode,
  addFilterMode,
  onToggleAddFilterMode,
  searchInputRef,
}: FilterBarProps) {
  const fallbackRef = useRef<HTMLInputElement>(null)
  const inputRef = searchInputRef ?? fallbackRef

  useEffect(() => {
    if (filters.length === 0 && !search) return
  }, [filters.length, search])

  return (
    <div className="app-no-drag flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search URL, method, status…"
        className={cn(
          'allow-select h-7 flex-1 rounded-md border border-border bg-muted px-2.5 text-sm',
          'text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary',
        )}
      />
      <button
        type="button"
        onClick={onToggleAddFilterMode}
        className={cn(
          'h-7 rounded-md border px-2.5 text-xs font-medium',
          addFilterMode
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-muted text-foreground hover:bg-accent',
        )}
        title="Toggle add-filter mode (A) — click a cell in the list to add a filter"
      >
        Add Filter
        <span className="ml-1.5 rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">
          A
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleFilterMode}
        className={cn(
          'h-7 rounded-md border px-2.5 text-xs font-medium',
          filterMode
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-muted text-foreground hover:bg-accent',
        )}
        title="Toggle filter application (F) — when off, filters stay but don't filter the list"
      >
        Filter Mode
        <span className="ml-1.5 rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">
          F
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleSessionView}
        className={cn(
          'h-7 rounded-md border px-2.5 text-xs font-medium',
          sessionView
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-muted text-foreground hover:bg-accent',
        )}
        title="Toggle session view (S) — color rows by session cookie"
      >
        Session View
        <span className="ml-1.5 rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">
          S
        </span>
      </button>
      {filters.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="h-7 rounded-md border border-border bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          Clear
        </button>
      )}

      {filters.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-1.5 overflow-x-auto',
            !filterMode && 'opacity-50',
          )}
          title={filterMode ? undefined : 'Filters paused — toggle Filter Mode (F) to apply'}
        >
          {filters.map((f, i) => (
            <FilterChip
              key={`${f.field}:${i}`}
              filter={f}
              onToggleInvert={() => onToggleInvert(i)}
              onRemove={() => onRemove(i)}
              onUpdateValue={(next) => onUpdateValue(i, next)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FilterChipProps {
  filter: ActiveFilter
  onToggleInvert: () => void
  onRemove: () => void
  onUpdateValue: (next: string) => void
}

function FilterChip({ filter, onToggleInvert, onRemove, onUpdateValue }: FilterChipProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(filter.value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(filter.value)
      queueMicrotask(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [editing, filter.value])

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      onRemove()
    } else if (trimmed !== filter.value) {
      onUpdateValue(trimmed)
    }
    setEditing(false)
  }

  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-[22rem] items-center gap-1.5 rounded-full border px-2 text-xs',
        filter.inverted
          ? 'border-status-5xx/40 bg-status-5xx/10 text-foreground'
          : 'border-border bg-accent text-accent-foreground',
      )}
      title={`${filter.field} ${filter.inverted ? '≠' : '='} ${filter.value} — double-click value to edit`}
    >
      <button
        type="button"
        onClick={onToggleInvert}
        className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
        title="Invert"
      >
        {filter.inverted ? '≠' : '='}
      </button>
      <span className="text-muted-foreground">{FIELD_LABELS[filter.field]}</span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
          onBlur={commit}
          className="allow-select min-w-0 flex-1 rounded border border-border bg-background px-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="allow-select min-w-0 flex-1 truncate font-mono"
        >
          {filter.value}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Remove filter"
      >
        ×
      </button>
    </span>
  )
}
