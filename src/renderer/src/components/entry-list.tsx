import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { parseEntryUrl, sessionKeyFor, type HarEntry } from '@/lib/har'
import {
  COLUMN_MIN_WIDTH,
  useColumnWidths,
  type UseColumnWidths,
} from '@/hooks/use-column-widths'
import { ColumnMenu, type ColumnMenuItem } from './column-menu'
import { ContextMenu } from './context-menu'

export interface ListItem {
  originalIndex: number
  entry: HarEntry
}

interface EntryListProps {
  items: ListItem[]
  selectedIndices: Set<number>
  primaryIndex: number | null
  onSelect: (originalIndex: number) => void
  onClearSelection: () => void
  onDelete: () => void
  onDeleteEntry: (originalIndex: number) => void
  sessionView: boolean
  sessionCookieNames: string[]
  sessionColorMap: Map<string, string>
  addFilterMode: boolean
  onFilter: (field: 'method' | 'domain' | 'path' | 'session', value: string) => void
}

function methodClasses(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-method-get'
    case 'POST':
      return 'text-method-post'
    case 'PUT':
      return 'text-method-put'
    case 'PATCH':
      return 'text-method-patch'
    case 'DELETE':
      return 'text-method-delete'
    default:
      return 'text-foreground'
  }
}

function statusClasses(status: number): string {
  if (status >= 500) return 'text-status-5xx'
  if (status >= 400) return 'text-status-4xx'
  if (status >= 300) return 'text-status-3xx'
  if (status >= 200) return 'text-status-2xx'
  return 'text-muted-foreground'
}

// Web-perf rule of thumb (RAIL / Web Vitals lineage):
//   < 200ms  → snappy, feels instant
//   < 1000ms → still acceptable, but the user notices
//   ≥ 1000ms → slow, worth investigating
function timeClasses(ms: number): string {
  if (ms < 200) return 'text-status-2xx'
  if (ms < 1000) return 'text-status-4xx'
  return 'text-status-5xx'
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function EntryList({
  items,
  selectedIndices,
  primaryIndex,
  onSelect,
  onClearSelection,
  onDelete,
  onDeleteEntry,
  sessionView,
  sessionCookieNames,
  sessionColorMap,
  addFilterMode,
  onFilter,
}: EntryListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)
  const cols = useColumnWidths()
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [rowMenu, setRowMenu] = useState<{
    x: number
    y: number
    entry: HarEntry
    originalIndex: number
  } | null>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [primaryIndex])

  const fixedLabels: Record<'method' | 'status' | 'domain' | 'path' | 'time', string> = {
    method: 'Method',
    status: 'Status',
    domain: 'Domain',
    path: 'Path',
    time: 'Time',
  }
  const labelFor = (id: 'method' | 'status' | 'domain' | 'path' | 'time'): string =>
    cols.getAlias(id) ?? fixedLabels[id]
  const cookieLabel = (name: string): string =>
    cols.getAlias({ cookie: name }) ?? name

  const menuItems: ColumnMenuItem[] = [
    {
      id: 'method',
      label: labelFor('method'),
      defaultLabel: fixedLabels.method,
      checked: cols.isVisible('method'),
    },
    {
      id: 'status',
      label: labelFor('status'),
      defaultLabel: fixedLabels.status,
      checked: cols.isVisible('status'),
    },
    {
      id: 'domain',
      label: labelFor('domain'),
      defaultLabel: fixedLabels.domain,
      checked: cols.isVisible('domain'),
    },
    {
      id: 'path',
      label: labelFor('path'),
      defaultLabel: fixedLabels.path,
      checked: cols.isVisible('path'),
    },
    ...sessionCookieNames.map((name) => ({
      id: `cookie:${name}`,
      label: cookieLabel(name),
      defaultLabel: name,
      checked: cols.isVisible({ cookie: name }),
    })),
    {
      id: 'time',
      label: labelFor('time'),
      defaultLabel: fixedLabels.time,
      checked: cols.isVisible('time'),
    },
  ]

  const onToggleColumn = (id: string) => {
    if (id.startsWith('cookie:')) {
      const name = id.slice('cookie:'.length)
      cols.setVisible({ cookie: name }, !cols.isVisible({ cookie: name }))
      return
    }
    const fid = id as 'method' | 'status' | 'domain' | 'path' | 'time'
    cols.setVisible(fid, !cols.isVisible(fid))
  }

  const onRenameColumn = (id: string, value: string) => {
    if (id.startsWith('cookie:')) {
      cols.setAlias({ cookie: id.slice('cookie:'.length) }, value)
      return
    }
    cols.setAlias(id as 'method' | 'status' | 'domain' | 'path' | 'time', value)
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col overflow-hidden font-mono text-[12.5px]"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!items.length) return
        const currentIdx =
          primaryIndex == null
            ? -1
            : items.findIndex((it) => it.originalIndex === primaryIndex)
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          const next = Math.min(items.length - 1, currentIdx + 1)
          onSelect(items[Math.max(0, next)].originalIndex)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          const next = Math.max(0, currentIdx - 1)
          onSelect(items[next].originalIndex)
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          if (selectedIndices.size > 0) {
            e.preventDefault()
            onDelete()
          }
        }
      }}
    >
      <div
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuPos({ x: e.clientX, y: e.clientY })
        }}
      >
        <ListHeader
          sessionCookieNames={sessionCookieNames}
          cols={cols}
          labelFor={labelFor}
          cookieLabel={cookieLabel}
        />
      </div>
      <div className="flex-1 overflow-y-auto" onClick={(e) => {
        if (e.target === e.currentTarget) onClearSelection()
      }}>
        {items.map((it) => {
          const { entry, originalIndex } = it
          const url = parseEntryUrl(entry.request.url)
          const selected = selectedIndices.has(originalIndex)
          const isPrimary = primaryIndex === originalIndex
          const cookieLookup = new Map<string, string>()
          for (const c of entry.request.cookies ?? []) cookieLookup.set(c.name, c.value)
          const sessionKey = sessionView ? sessionKeyFor(entry, sessionCookieNames) : null
          const sessionColor =
            sessionView && sessionKey ? sessionColorMap.get(sessionKey) : null

          return (
            <div
              key={originalIndex}
              ref={isPrimary ? selectedRef : undefined}
              onClick={() => onSelect(originalIndex)}
              onContextMenu={(e) => {
                e.preventDefault()
                onSelect(originalIndex)
                setRowMenu({ x: e.clientX, y: e.clientY, entry, originalIndex })
              }}
              className={cn(
                'group flex h-6 items-center border-b border-border/40 pl-3 whitespace-nowrap',
                addFilterMode ? 'cursor-crosshair' : 'cursor-pointer',
                selected
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted',
                isPrimary && selectedIndices.size > 1 && 'ring-1 ring-inset ring-primary/50',
              )}
              style={
                !selected && sessionColor
                  ? {
                      backgroundColor: hexToRgba(sessionColor, 0.18),
                      boxShadow: `inset 3px 0 0 0 ${sessionColor}`,
                    }
                  : undefined
              }
            >
              {cols.isVisible('method') && (
                <Cell width={cols.widths.method}>
                  <FilterableValue
                    addFilterMode={addFilterMode}
                    onFilter={() => onFilter('method', entry.request.method)}
                    title={addFilterMode ? 'Filter by method' : entry.request.method}
                    className={cn(
                      'block w-full truncate text-left font-semibold',
                      methodClasses(entry.request.method),
                    )}
                  >
                    {entry.request.method}
                  </FilterableValue>
                </Cell>
              )}
              {cols.isVisible('status') && (
                <Cell width={cols.widths.status}>
                  <span
                    className={cn(
                      'block w-full text-center',
                      statusClasses(entry.response.status),
                    )}
                  >
                    {entry.response.status}
                  </span>
                </Cell>
              )}
              {cols.isVisible('domain') && (
                <Cell width={cols.widths.domain}>
                  <FilterableValue
                    addFilterMode={addFilterMode}
                    onFilter={() => onFilter('domain', url.domain)}
                    title={addFilterMode ? `Filter by domain: ${url.domain}` : url.domain}
                    className="block w-full truncate text-left text-foreground/90"
                  >
                    {url.domain}
                  </FilterableValue>
                </Cell>
              )}
              {cols.isVisible('path') && (
                <Cell flex>
                  <FilterableValue
                    addFilterMode={addFilterMode}
                    onFilter={() => onFilter('path', url.path)}
                    title={
                      (addFilterMode ? `Filter by path: ` : '') +
                      url.path +
                      (url.query ? `?${url.query}` : '')
                    }
                    className="block w-full truncate text-left text-foreground/80"
                  >
                    {url.path}
                    {url.query && (
                      <span className="text-muted-foreground">?{url.query}</span>
                    )}
                  </FilterableValue>
                </Cell>
              )}
              {sessionCookieNames.map((name) => {
                if (!cols.isVisible({ cookie: name })) return null
                const value = cookieLookup.get(name) ?? ''
                return (
                  <Cell key={name} width={cols.cookieWidth(name)}>
                    <FilterableValue
                      addFilterMode={addFilterMode && !!value}
                      onFilter={() => onFilter('session', `${name}:${value}`)}
                      title={value ? `${name}=${value}` : ''}
                      className="block w-full truncate text-left font-mono text-[11px] text-muted-foreground"
                    >
                      {value || '—'}
                    </FilterableValue>
                  </Cell>
                )
              })}
              {cols.isVisible('time') && (
                <Cell width={cols.widths.time} align="right">
                  <span
                    className={cn(
                      'block w-full truncate text-right text-[11px]',
                      typeof entry.time === 'number'
                        ? timeClasses(entry.time)
                        : 'text-muted-foreground',
                    )}
                    title={`${entry.time?.toFixed?.(0) ?? '–'} ms`}
                  >
                    {typeof entry.time === 'number' ? `${Math.round(entry.time)}ms` : ''}
                  </span>
                </Cell>
              )}
            </div>
          )
        })}
        {items.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No entries match the current filters.
          </div>
        )}
      </div>
      {menuPos && (
        <ColumnMenu
          x={menuPos.x}
          y={menuPos.y}
          items={menuItems}
          onToggle={onToggleColumn}
          onRename={onRenameColumn}
          onClose={() => setMenuPos(null)}
          onReset={() => {
            cols.reset()
            setMenuPos(null)
          }}
        />
      )}
      {rowMenu && (
        <ContextMenu
          x={rowMenu.x}
          y={rowMenu.y}
          items={[
            {
              kind: 'action',
              label: 'Copy this packet',
              onClick: () => {
                void navigator.clipboard.writeText(
                  JSON.stringify(rowMenu.entry, null, 2),
                )
              },
            },
            { kind: 'separator' },
            {
              kind: 'action',
              label: 'Delete entry',
              onClick: () => onDeleteEntry(rowMenu.originalIndex),
            },
          ]}
          onClose={() => setRowMenu(null)}
        />
      )}
    </div>
  )
}

function Cell({
  width,
  flex,
  align = 'left',
  children,
}: {
  width?: number
  flex?: boolean
  align?: 'left' | 'right'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'min-w-0 shrink-0 px-1.5',
        flex && 'flex-1 shrink',
        align === 'right' && 'text-right',
      )}
      style={width != null ? { width } : undefined}
    >
      {children}
    </div>
  )
}

function FilterableValue({
  addFilterMode,
  onFilter,
  className,
  title,
  children,
}: {
  addFilterMode: boolean
  onFilter: () => void
  className?: string
  title?: string
  children: React.ReactNode
}) {
  if (!addFilterMode) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onFilter()
      }}
      className={cn(className, 'cursor-crosshair hover:underline')}
      title={title}
    >
      {children}
    </button>
  )
}

interface HeaderProps {
  sessionCookieNames: string[]
  cols: UseColumnWidths
  labelFor: (id: 'method' | 'status' | 'domain' | 'path' | 'time') => string
  cookieLabel: (name: string) => string
}

function ListHeader({ sessionCookieNames, cols, labelFor, cookieLabel }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex h-6 items-center border-b border-border bg-muted pl-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground select-none">
      {cols.isVisible('method') && (
        <HeaderCell
          label={labelFor('method')}
          width={cols.widths.method}
          onResize={(w) => cols.setFixed('method', w)}
        />
      )}
      {cols.isVisible('status') && (
        <HeaderCell
          label={labelFor('status')}
          align="center"
          width={cols.widths.status}
          onResize={(w) => cols.setFixed('status', w)}
        />
      )}
      {cols.isVisible('domain') && (
        <HeaderCell
          label={labelFor('domain')}
          width={cols.widths.domain}
          onResize={(w) => cols.setFixed('domain', w)}
        />
      )}
      {cols.isVisible('path') && (
        <div className="min-w-0 flex-1 px-1.5 truncate">{labelFor('path')}</div>
      )}
      {sessionCookieNames.map((name) =>
        cols.isVisible({ cookie: name }) ? (
          <HeaderCell
            key={name}
            label={cookieLabel(name)}
            width={cols.cookieWidth(name)}
            onResize={(w) => cols.setCookie(name, w)}
            title={cookieLabel(name) === name ? name : `${cookieLabel(name)} (${name})`}
          />
        ) : null,
      )}
      {cols.isVisible('time') && (
        <HeaderCell
          label={labelFor('time')}
          align="right"
          width={cols.widths.time}
          onResize={(w) => cols.setFixed('time', w)}
          last
        />
      )}
    </div>
  )
}

function HeaderCell({
  label,
  width,
  align = 'left',
  onResize,
  title,
  last = false,
}: {
  label: string
  width: number
  align?: 'left' | 'right' | 'center'
  onResize: (next: number) => void
  title?: string
  last?: boolean
}) {
  return (
    <div className="relative flex h-full items-center" style={{ width }}>
      <span
        className={cn(
          'block w-full truncate px-1.5',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
        )}
        title={title}
      >
        {label}
      </span>
      {!last && <ColumnResizer width={width} onChange={onResize} />}
    </div>
  )
}

function ColumnResizer({
  width,
  onChange,
}: {
  width: number
  onChange: (next: number) => void
}) {
  const startRef = useRef<{ x: number; w: number } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      startRef.current = { x: e.clientX, w: width }
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    },
    [width],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = startRef.current
      if (!start) return
      const next = Math.max(COLUMN_MIN_WIDTH, start.w + (e.clientX - start.x))
      onChange(next)
    },
    [onChange],
  )

  const end = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }, [])

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize hover:bg-primary/40"
      title="Drag to resize"
    />
  )
}
