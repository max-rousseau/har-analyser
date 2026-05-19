import { cn } from '@/lib/utils'

interface StatusBarProps {
  visibleCount: number
  totalCount: number
  deletedCount: number
  onRestoreDeleted: () => void
  fileName: string | null
  sessionView: boolean
  sessionCount: number
  parseError: string | null
}

export function StatusBar({
  visibleCount,
  totalCount,
  deletedCount,
  onRestoreDeleted,
  fileName,
  sessionView,
  sessionCount,
  parseError,
}: StatusBarProps) {
  return (
    <div
      className={cn(
        'flex h-6 shrink-0 items-center gap-3 border-t border-border bg-muted px-3 text-[11px] text-muted-foreground',
      )}
    >
      {parseError ? (
        <span className="truncate text-status-5xx">⚠ {parseError}</span>
      ) : (
        <>
          <span>
            <span className="font-medium text-foreground">{visibleCount}</span>
            <span className="text-muted-foreground">/{totalCount}</span> entries
          </span>
          {deletedCount > 0 && (
            <button
              type="button"
              onClick={onRestoreDeleted}
              title="Click to restore all deleted entries"
              className="rounded px-1 hover:bg-accent hover:text-foreground"
            >
              <span className="font-medium text-status-5xx">{deletedCount}</span> deleted
            </button>
          )}
          {sessionView && sessionCount > 0 && (
            <span>
              <span className="font-medium text-foreground">{sessionCount}</span> sessions
            </span>
          )}
          <span className="ml-auto truncate" title={fileName ?? ''}>
            {fileName ?? ''}
          </span>
        </>
      )}
    </div>
  )
}
