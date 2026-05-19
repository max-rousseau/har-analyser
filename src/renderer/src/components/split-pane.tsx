import { useCallback, useEffect, useRef, useState } from 'react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  minLeft?: number
  minRight?: number
  storageKey?: string
  defaultLeftPx?: number
}

export function SplitPane({
  left,
  right,
  minLeft = 360,
  minRight = 320,
  storageKey,
  defaultLeftPx = 640,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragOriginRef = useRef<{ startX: number; startLeft: number } | null>(null)
  const [leftPx, setLeftPx] = useState<number>(() => {
    if (storageKey) {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const n = Number(raw)
        if (Number.isFinite(n) && n > 0) return n
      }
    }
    return defaultLeftPx
  })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!storageKey) return
    window.localStorage.setItem(storageKey, String(leftPx))
  }, [storageKey, leftPx])

  // Clamp on container resize so the divider never drifts off-screen.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      const total = el.clientWidth
      if (total <= 0) return
      setLeftPx((prev) => Math.min(prev, Math.max(minLeft, total - minRight)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [minLeft, minRight])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current
      if (!el) return
      dragOriginRef.current = { startX: e.clientX, startLeft: leftPx }
      setDragging(true)
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    },
    [leftPx],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const origin = dragOriginRef.current
      const el = containerRef.current
      if (!origin || !el) return
      const total = el.clientWidth
      const max = Math.max(minLeft, total - minRight)
      const next = Math.max(minLeft, Math.min(max, origin.startLeft + (e.clientX - origin.startX)))
      setLeftPx(next)
    },
    [minLeft, minRight],
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragOriginRef.current = null
    setDragging(false)
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }, [])

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1">
      <div style={{ width: leftPx }} className="flex shrink-0 flex-col">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => setLeftPx(defaultLeftPx)}
        className={
          'group relative z-10 w-px shrink-0 cursor-col-resize bg-border ' +
          (dragging ? 'bg-primary' : 'hover:bg-primary/60')
        }
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
      <div className="min-w-0 flex-1">{right}</div>
    </div>
  )
}
