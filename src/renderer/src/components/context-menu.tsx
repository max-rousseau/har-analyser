import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type ContextMenuItem =
  | { kind: 'action'; label: string; onClick: () => void; disabled?: boolean }
  | { kind: 'separator' }

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const width = 220
  const estHeight =
    items.reduce((acc, it) => acc + (it.kind === 'separator' ? 9 : 28), 8) + 4
  const margin = 8
  const left = Math.min(x, window.innerWidth - width - margin)
  const top = Math.min(y, window.innerHeight - estHeight - margin)

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left, top, width }}
      className="fixed z-50 rounded-md border border-border bg-background py-1 text-xs shadow-lg"
    >
      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return <div key={i} className="my-1 border-t border-border" />
        }
        return (
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={cn(
              'block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground',
              item.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
