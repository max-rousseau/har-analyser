import { cn } from '@/lib/utils'

interface TitleBarProps {
  fileName: string | null
  dirty: boolean
  entryCount?: number
}

export function TitleBar({ fileName, dirty, entryCount }: TitleBarProps) {
  return (
    <div
      className={cn(
        'app-drag relative flex h-9 shrink-0 items-center border-b border-border bg-background',
        'select-none',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate font-medium">{fileName ?? 'No file open'}</span>
          {dirty && (
            <span aria-label="Unsaved changes" className="text-foreground">
              •
            </span>
          )}
          {typeof entryCount === 'number' && (
            <span className="text-muted-foreground/70">— {entryCount} entries</span>
          )}
        </div>
      </div>
    </div>
  )
}
