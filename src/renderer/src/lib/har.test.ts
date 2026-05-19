import { describe, expect, it } from 'vitest'
import {
  buildSessionColorMap,
  findSessionCookieNames,
  formatBody,
  parseEntryUrl,
  parseHar,
  serializeHar,
  sessionKeyFor,
  type HarEntry,
  type HarFile,
} from './har'

const makeEntry = (overrides: Partial<HarEntry> = {}): HarEntry => ({
  request: {
    method: 'GET',
    url: 'https://example.com/api/users',
    httpVersion: 'HTTP/2',
    headers: [{ name: 'host', value: 'example.com' }],
    cookies: [],
    queryString: [],
  },
  response: {
    status: 200,
    statusText: 'OK',
    httpVersion: 'HTTP/2',
    headers: [],
    cookies: [],
  },
  ...overrides,
})

const minimalHar: HarFile = {
  log: {
    version: '1.2',
    creator: { name: 'test', version: '1' },
    entries: [makeEntry(), makeEntry({ request: { ...makeEntry().request, method: 'POST' } })],
  },
}

describe('parseHar', () => {
  it('parses a valid HAR file', () => {
    const parsed = parseHar(JSON.stringify(minimalHar))
    expect(parsed.log.entries).toHaveLength(2)
  })

  it('throws on non-JSON input', () => {
    expect(() => parseHar('not json')).toThrow(/JSON/)
  })

  it('throws when log is missing', () => {
    expect(() => parseHar(JSON.stringify({}))).toThrow(/log/)
  })

  it('throws when entries is missing', () => {
    expect(() => parseHar(JSON.stringify({ log: {} }))).toThrow(/entries/)
  })
})

describe('serializeHar', () => {
  it('drops deleted entries on serialize', () => {
    const out = serializeHar(minimalHar, new Set([0]))
    const reparsed = JSON.parse(out) as HarFile
    expect(reparsed.log.entries).toHaveLength(1)
    expect(reparsed.log.entries[0].request.method).toBe('POST')
  })

  it('preserves unknown fields', () => {
    const har: HarFile = {
      log: {
        ...minimalHar.log,
        _custom: 'preserved',
      } as HarFile['log'],
    }
    const out = JSON.parse(serializeHar(har, new Set()))
    expect(out.log._custom).toBe('preserved')
  })
})

describe('parseEntryUrl', () => {
  it('splits into domain/path/query', () => {
    const u = parseEntryUrl('https://api.example.com:8443/v1/users?id=1&q=x')
    expect(u.domain).toBe('api.example.com:8443')
    expect(u.path).toBe('/v1/users')
    expect(u.query).toBe('id=1&q=x')
  })

  it('falls back when URL parsing fails', () => {
    const u = parseEntryUrl('not-a-url')
    expect(u.domain).toBe('not-a-url')
    expect(u.path).toBe('')
  })
})

describe('session helpers', () => {
  const entries: HarEntry[] = [
    makeEntry({
      request: {
        ...makeEntry().request,
        cookies: [{ name: 'sessionId', value: 'aaa' }],
      },
    }),
    makeEntry({
      request: {
        ...makeEntry().request,
        cookies: [{ name: 'sessionId', value: 'bbb' }],
      },
    }),
    makeEntry({
      request: {
        ...makeEntry().request,
        cookies: [{ name: 'SESSION_TOKEN', value: 'ccc' }],
      },
    }),
  ]

  it('finds cookies whose name contains "session"', () => {
    expect(findSessionCookieNames(entries)).toEqual(['SESSION_TOKEN', 'sessionId'])
  })

  it('returns the first matching session value for an entry', () => {
    expect(sessionKeyFor(entries[0], ['SESSION_TOKEN', 'sessionId'])).toBe(
      'sessionId:aaa',
    )
  })

  it('returns null when no session cookie present', () => {
    expect(sessionKeyFor(makeEntry(), ['sessionId'])).toBeNull()
  })

  it('assigns a stable color per session key', () => {
    const map = buildSessionColorMap(entries, ['SESSION_TOKEN', 'sessionId'])
    expect(map.size).toBe(3)
  })
})

describe('formatBody', () => {
  it('pretty-prints JSON', () => {
    expect(formatBody('{"a":1}', 'application/json')).toBe('{\n  "a": 1\n}')
  })

  it('leaves non-JSON unchanged', () => {
    expect(formatBody('hello', 'text/plain')).toBe('hello')
  })

  it('falls back when JSON parse fails', () => {
    expect(formatBody('{bad', 'application/json')).toBe('{bad')
  })

  it('truncates very long bodies', () => {
    const big = 'a'.repeat(60_000)
    expect(formatBody(big, 'text/plain').length).toBe(50_000)
  })
})
