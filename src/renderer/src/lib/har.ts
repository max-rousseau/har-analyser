// HAR (HTTP Archive) types and parsing helpers.
// Only the fields the app reads are typed strictly; everything else is preserved
// verbatim when the file is saved so we don't drop custom (`_foo`) extensions.

export interface HarNameValue {
  name: string
  value: string
}

export interface HarCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: string
  httpOnly?: boolean
  secure?: boolean
}

export interface HarPostData {
  mimeType?: string
  text?: string
  params?: HarNameValue[]
}

export interface HarRequest {
  method: string
  url: string
  httpVersion: string
  headers: HarNameValue[]
  cookies: HarCookie[]
  queryString: HarNameValue[]
  postData?: HarPostData
  headersSize?: number
  bodySize?: number
}

export interface HarContent {
  size?: number
  mimeType?: string
  text?: string
  encoding?: string
  compression?: number
}

export interface HarResponse {
  status: number
  statusText: string
  httpVersion: string
  headers: HarNameValue[]
  cookies: HarCookie[]
  content?: HarContent
  redirectURL?: string
  headersSize?: number
  bodySize?: number
}

export interface HarTimings {
  blocked?: number
  dns?: number
  connect?: number
  send?: number
  wait?: number
  receive?: number
  ssl?: number
}

export interface HarEntry {
  startedDateTime?: string
  time?: number
  request: HarRequest
  response: HarResponse
  timings?: HarTimings
  serverIPAddress?: string
  connection?: string
  [extra: string]: unknown
}

export interface HarLog {
  version: string
  creator: { name: string; version: string }
  entries: HarEntry[]
  pages?: unknown[]
  [extra: string]: unknown
}

export interface HarFile {
  log: HarLog
  [extra: string]: unknown
}

export class HarParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HarParseError'
  }
}

export function parseHar(raw: string): HarFile {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new HarParseError(`Not valid JSON: ${(err as Error).message}`)
  }
  if (!data || typeof data !== 'object') {
    throw new HarParseError('Root is not an object')
  }
  const log = (data as { log?: unknown }).log
  if (!log || typeof log !== 'object') {
    throw new HarParseError('Missing required "log" object')
  }
  const entries = (log as { entries?: unknown }).entries
  if (!Array.isArray(entries)) {
    throw new HarParseError('Missing required "log.entries" array')
  }
  return data as HarFile
}

export function serializeHar(har: HarFile, deletedIndices: ReadonlySet<number>): string {
  if (deletedIndices.size === 0) return JSON.stringify(har, null, 2)
  const trimmed: HarFile = {
    ...har,
    log: {
      ...har.log,
      entries: har.log.entries.filter((_, i) => !deletedIndices.has(i)),
    },
  }
  return JSON.stringify(trimmed, null, 2)
}

export interface ParsedUrl {
  domain: string
  path: string
  query: string
}

export function parseEntryUrl(url: string): ParsedUrl {
  try {
    const u = new URL(url)
    return { domain: u.host, path: u.pathname, query: u.search.replace(/^\?/, '') }
  } catch {
    return { domain: url, path: '', query: '' }
  }
}

const SESSION_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#95e1d3',
  '#dda0dd',
  '#87ceeb',
  '#f0e68c',
  '#98d8c8',
  '#ffb347',
  '#b19cd9',
] as const

export function findSessionCookieNames(entries: HarEntry[]): string[] {
  const names = new Set<string>()
  for (const entry of entries) {
    for (const c of entry.request.cookies ?? []) {
      if (c.name.toLowerCase().includes('session')) names.add(c.name)
    }
  }
  return [...names].sort()
}

export function sessionKeyFor(entry: HarEntry, sessionCookieNames: string[]): string | null {
  const lookup = new Map<string, string>()
  for (const c of entry.request.cookies ?? []) lookup.set(c.name, c.value)
  for (const name of sessionCookieNames) {
    const value = lookup.get(name)
    if (value) return `${name}:${value}`
  }
  return null
}

export function buildSessionColorMap(
  entries: HarEntry[],
  sessionCookieNames: string[],
): Map<string, string> {
  const unique = new Set<string>()
  for (const e of entries) {
    const k = sessionKeyFor(e, sessionCookieNames)
    if (k) unique.add(k)
  }
  const map = new Map<string, string>()
  ;[...unique].sort().forEach((key, i) => {
    map.set(key, SESSION_COLORS[i % SESSION_COLORS.length])
  })
  return map
}

export function formatBody(text: string, mimeType: string | undefined): string {
  const max = 50_000
  const truncated = text.length > max ? text.slice(0, max) : text
  if (mimeType && mimeType.toLowerCase().includes('json')) {
    try {
      return JSON.stringify(JSON.parse(truncated), null, 2)
    } catch {
      // fall through — leave as-is
    }
  }
  return truncated
}
