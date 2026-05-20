import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatBody, type HarCookie, type HarEntry } from '@/lib/har'

interface EntryDetailProps {
  entry: HarEntry | null
  index: number | null
}

type Tab = 'headers' | 'cookies' | 'request' | 'response' | 'timings'

export function EntryDetail({ entry, index }: EntryDetailProps) {
  const [tab, setTab] = useState<Tab>('headers')

  if (!entry || index == null) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
        Select an entry to inspect.
      </div>
    )
  }

  const { request, response, timings } = entry

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Entry #{index + 1}</span>
          {entry.serverIPAddress && <span>· {entry.serverIPAddress}</span>}
          {typeof entry.time === 'number' && <span>· {Math.round(entry.time)} ms</span>}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
            {request.method}
          </span>
          <span
            className={cn(
              'rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold',
              statusTextClass(response.status),
            )}
          >
            {response.status} {response.statusText}
          </span>
          <span
            className="allow-select break-all font-mono text-xs text-foreground/80"
            title={request.url}
          >
            {request.url}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-3">
        <TabButton current={tab} value="headers" onClick={() => setTab('headers')}>
          Headers
        </TabButton>
        <TabButton current={tab} value="cookies" onClick={() => setTab('cookies')}>
          Cookies
        </TabButton>
        <TabButton current={tab} value="request" onClick={() => setTab('request')}>
          Request Body
        </TabButton>
        <TabButton current={tab} value="response" onClick={() => setTab('response')}>
          Response Body
        </TabButton>
        <TabButton current={tab} value="timings" onClick={() => setTab('timings')}>
          Timings
        </TabButton>
      </div>

      <div className="flex-1 overflow-auto bg-background">
        {tab === 'headers' && <HeadersTab entry={entry} />}
        {tab === 'cookies' && <CookiesTab entry={entry} />}
        {tab === 'request' && <RequestBodyTab entry={entry} />}
        {tab === 'response' && <ResponseBodyTab entry={entry} />}
        {tab === 'timings' && <TimingsTab time={entry.time} timings={timings} />}
      </div>
    </div>
  )
}

function statusTextClass(status: number): string {
  if (status >= 500) return 'text-status-5xx'
  if (status >= 400) return 'text-status-4xx'
  if (status >= 300) return 'text-status-3xx'
  if (status >= 200) return 'text-status-2xx'
  return 'text-muted-foreground'
}

function TabButton({
  children,
  value,
  current,
  onClick,
}: {
  children: React.ReactNode
  value: Tab
  current: Tab
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 border-b-2 px-3 text-xs font-medium',
        current === value
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 bg-muted/50 px-4 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block w-2 select-none text-[10px] leading-none transition-transform',
            open ? 'rotate-90' : 'rotate-0',
          )}
        >
          ▶
        </span>
        <span>{title}</span>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}

function KeyValueList({
  entries,
  emptyLabel = '—',
}: {
  entries: { name: string; value: string }[]
  emptyLabel?: string
}) {
  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground">{emptyLabel}</div>
  }
  return (
    <div className="allow-select grid grid-cols-[minmax(120px,200px)_1fr] gap-x-3 gap-y-1 font-mono text-xs">
      {entries.map((kv, i) => (
        <div key={`${kv.name}:${i}`} className="contents">
          <div className="truncate text-muted-foreground" title={kv.name}>
            {kv.name}
          </div>
          <div className="break-all text-foreground/90">{kv.value}</div>
        </div>
      ))}
    </div>
  )
}

function HeadersTab({ entry }: { entry: HarEntry }) {
  return (
    <>
      <Section title="Request headers">
        <KeyValueList entries={entry.request.headers ?? []} />
      </Section>
      <Section title="Query parameters">
        <KeyValueList entries={entry.request.queryString ?? []} />
      </Section>
      <Section title="Response headers">
        <KeyValueList entries={entry.response.headers ?? []} />
      </Section>
    </>
  )
}

function CookiesTab({ entry }: { entry: HarEntry }) {
  return (
    <>
      <Section title="Request cookies">
        <CookieList cookies={entry.request.cookies ?? []} emptyLabel="No request cookies" />
      </Section>
      <Section title="Response cookies">
        <CookieList cookies={entry.response.cookies ?? []} emptyLabel="No response cookies" />
      </Section>
    </>
  )
}

function CookieList({
  cookies,
  emptyLabel,
}: {
  cookies: HarCookie[]
  emptyLabel: string
}) {
  if (cookies.length === 0) {
    return <div className="text-xs text-muted-foreground">{emptyLabel}</div>
  }
  return (
    <div className="space-y-1.5">
      {cookies.map((c, i) => (
        <CookieRow key={`${c.name}:${i}`} cookie={c} />
      ))}
    </div>
  )
}

function CookieRow({ cookie }: { cookie: HarCookie }) {
  const [open, setOpen] = useState(false)
  const hasAttrs =
    cookie.domain || cookie.path || cookie.expires || cookie.httpOnly || cookie.secure
  return (
    <div className="allow-select rounded-md border border-border bg-muted/40 font-mono text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-baseline gap-1.5 px-2.5 py-1.5 text-left',
          open ? 'border-b border-border' : '',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block w-2 shrink-0 select-none text-[10px] leading-none text-muted-foreground transition-transform',
            open ? 'rotate-90' : 'rotate-0',
          )}
        >
          ▶
        </span>
        <span className="break-all font-semibold text-method-get">{cookie.name}</span>
        <span className="text-muted-foreground">=</span>
        {cookie.value ? (
          <span
            className={cn(
              'min-w-0 flex-1 text-method-post',
              open ? 'break-all' : 'truncate',
            )}
          >
            {cookie.value}
          </span>
        ) : (
          <span className="italic text-muted-foreground">(empty)</span>
        )}
      </button>
      {open && hasAttrs && (
        <div className="flex flex-wrap gap-1 px-2.5 py-1.5 text-[11px]">
          {cookie.domain && <CookieAttr label="domain" value={cookie.domain} />}
          {cookie.path && <CookieAttr label="path" value={cookie.path} />}
          {cookie.expires && <CookieAttr label="expires" value={cookie.expires} />}
          {cookie.httpOnly && <CookieFlag>HttpOnly</CookieFlag>}
          {cookie.secure && <CookieFlag>Secure</CookieFlag>}
        </div>
      )}
    </div>
  )
}

function CookieAttr({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded border border-border bg-background px-1.5 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground/80 break-all">{value}</span>
    </span>
  )
}

function CookieFlag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
      {children}
    </span>
  )
}

function RequestBodyTab({ entry }: { entry: HarEntry }) {
  const post = entry.request.postData
  if (!post) {
    return <div className="p-4 text-xs text-muted-foreground">No request body.</div>
  }
  return (
    <>
      <Section title="Post data">
        <div className="mb-2 text-xs text-muted-foreground">
          MIME type:{' '}
          <span className="font-mono text-foreground">{post.mimeType ?? '—'}</span>
        </div>
        {post.text ? (
          <pre className="allow-select max-h-[60vh] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 font-mono text-xs">
            {formatBody(post.text, post.mimeType)}
          </pre>
        ) : (
          <div className="text-xs text-muted-foreground">No body text.</div>
        )}
        {post.params && post.params.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Params
            </div>
            <KeyValueList entries={post.params} />
          </div>
        )}
      </Section>
    </>
  )
}

function ResponseBodyTab({ entry }: { entry: HarEntry }) {
  const content = entry.response.content
  if (!content) {
    return <div className="p-4 text-xs text-muted-foreground">No response content.</div>
  }
  return (
    <Section title="Response content">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          MIME type:{' '}
          <span className="font-mono text-foreground">{content.mimeType ?? '—'}</span>
        </span>
        {typeof content.size === 'number' && (
          <span>
            Size: <span className="font-mono text-foreground">{content.size} B</span>
          </span>
        )}
        {content.encoding && (
          <span>
            Encoding: <span className="font-mono text-foreground">{content.encoding}</span>
          </span>
        )}
      </div>
      {content.text ? (
        <pre className="allow-select max-h-[60vh] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 font-mono text-xs">
          {formatBody(content.text, content.mimeType)}
        </pre>
      ) : (
        <div className="text-xs text-muted-foreground">No body text.</div>
      )}
    </Section>
  )
}

function TimingsTab({
  time,
  timings,
}: {
  time?: number
  timings: HarEntry['timings']
}) {
  if (!timings && typeof time !== 'number') {
    return <div className="p-4 text-xs text-muted-foreground">No timing data.</div>
  }
  const rows: { name: string; value: number | undefined }[] = [
    { name: 'Total', value: typeof time === 'number' ? time : undefined },
    { name: 'Blocked', value: timings?.blocked },
    { name: 'DNS', value: timings?.dns },
    { name: 'Connect', value: timings?.connect },
    { name: 'SSL', value: timings?.ssl },
    { name: 'Send', value: timings?.send },
    { name: 'Wait', value: timings?.wait },
    { name: 'Receive', value: timings?.receive },
  ]
  const total = typeof time === 'number' && time > 0 ? time : null
  return (
    <Section title="Timings (ms)">
      <div className="space-y-1.5 font-mono text-xs">
        {rows.map((r) => {
          const present = typeof r.value === 'number' && r.value >= 0
          const pct = present && total ? Math.min(100, (r.value! / total) * 100) : 0
          return (
            <div key={r.name} className="grid grid-cols-[80px_60px_1fr] items-center gap-2">
              <span className="text-muted-foreground">{r.name}</span>
              <span className="text-right">
                {present ? r.value!.toFixed(2) : '—'}
              </span>
              <div className="h-1.5 overflow-hidden rounded bg-muted">
                {present && (
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
