import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface ColumnMenuItem {
  id: string
  label: string
  defaultLabel: string
  checked: boolean
}

interface ColumnMenuProps {
  x: number
  y: number
  items: ColumnMenuItem[]
  onToggle: (id: string) => void
  onRename: (id: string, label: string) => void
  onClose: () => void
  onReset?: () => void
}

export function ColumnMenu({
  x,
  y,
  items,
  onToggle,
  onRename,
  onClose,
  onReset,
}: ColumnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null)
          return
        }
        onClose()
      }
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, editingId])

  const width = 260
  const height = items.length * 28 + (onReset ? 36 : 8) + 24
  const margin = 8
  const left = Math.min(x, window.innerWidth - width - margin)
  const top = Math.min(y, window.innerHeight - height - margin)

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ left, top, width }}
      className="fixed z-50 rounded-md border border-border bg-background py-1 text-xs shadow-lg"
    >
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Columns — double-click name to rename
      </div>
      {items.map((item) => (
        <ColumnRow
          key={item.id}
          item={item}
          editing={editingId === item.id}
          onToggle={() => onToggle(item.id)}
          onStartEdit={() => setEditingId(item.id)}
          onCommitEdit={(next) => {
            const trimmed = next.trim()
            if (trimmed !== item.label) {
              onRename(item.id, trimmed === item.defaultLabel ? '' : trimmed)
            }
            setEditingId(null)
          }}
          onCancelEdit={() => setEditingId(null)}
        />
      ))}
      {onReset && (
        <>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={onReset}
            className="block w-full px-3 py-1.5 text-left text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Reset columns
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}

function ColumnRow({
  item,
  editing,
  onToggle,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: {
  item: ColumnMenuItem
  editing: boolean
  onToggle: () => void
  onStartEdit: () => void
  onCommitEdit: (next: string) => void
  onCancelEdit: () => void
}) {
  const [draft, setDraft] = useState(item.label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(item.label)
      // Defer focus so the input is mounted.
      queueMicrotask(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [editing, item.label])

  if (editing) {
    return (
      <div className="flex w-full items-center gap-2 px-3 py-1.5">
        <span
          className={cn(
            'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
            item.checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background',
          )}
        >
          {item.checked && <span className="text-[9px] leading-none">✓</span>}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          placeholder={item.defaultLabel}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onCommitEdit(draft)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancelEdit()
            }
          }}
          onBlur={() => onCommitEdit(draft)}
          className="allow-select min-w-0 flex-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    )
  }

  return (
    <div
      role="menuitemcheckbox"
      aria-checked={item.checked}
      className="group flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
            item.checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background',
          )}
        >
          {item.checked && <span className="text-[9px] leading-none">✓</span>}
        </span>
        <span
          onDoubleClick={(e) => {
            e.stopPropagation()
            onStartEdit()
          }}
          className="min-w-0 flex-1 truncate"
          title={item.label === item.defaultLabel ? item.label : `${item.label} (${item.defaultLabel})`}
        >
          {item.label}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onStartEdit()
        }}
        title="Rename column"
        className="shrink-0 px-1 text-[11px] text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
      >
        ✎
      </button>
    </div>
  )
}
