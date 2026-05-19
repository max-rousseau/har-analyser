interface EmptyStateProps {
  onOpen: () => void
  error: string | null
}

export function EmptyState({ onOpen, error }: EmptyStateProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="text-xl font-medium text-foreground">HAR Analyser</div>
        <p className="text-sm text-muted-foreground">
          Open a <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.har</code> file
          to inspect its HTTP transactions. Drop a file anywhere in this window, or use{' '}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            ⌘O
          </kbd>
          .
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open HAR file…
        </button>
        {error && (
          <p className="mt-2 max-w-full rounded-md border border-border bg-muted px-3 py-2 text-left font-mono text-xs text-foreground/80 whitespace-pre-wrap">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
