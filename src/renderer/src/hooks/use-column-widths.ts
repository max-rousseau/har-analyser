import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'har-analyser:list-columns:v1'
const MIN_WIDTH = 32

export type FixedColumnId = 'method' | 'status' | 'domain' | 'path' | 'time'

export interface ColumnWidths {
  method: number
  status: number
  domain: number
  time: number
  cookies: Record<string, number>
}

interface PersistedShape {
  widths: ColumnWidths
  visibility: {
    method: boolean
    status: boolean
    domain: boolean
    path: boolean
    time: boolean
    cookies: Record<string, boolean>
  }
  aliases: {
    method?: string
    status?: string
    domain?: string
    path?: string
    time?: string
    cookies: Record<string, string>
  }
}

const DEFAULT_WIDTHS: ColumnWidths = {
  method: 60,
  status: 44,
  domain: 224,
  time: 60,
  cookies: {},
}

const DEFAULT_VISIBILITY: PersistedShape['visibility'] = {
  method: true,
  status: true,
  domain: true,
  path: true,
  time: true,
  cookies: {},
}

const DEFAULT_ALIASES: PersistedShape['aliases'] = { cookies: {} }

const DEFAULT_COOKIE_WIDTH = 120

function load(): PersistedShape {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<PersistedShape> & Partial<ColumnWidths>
    // v0 stored widths fields at the top level — accept either shape.
    const legacyWidths = !('widths' in parsed) ? (parsed as Partial<ColumnWidths>) : undefined
    const widthsRaw = (parsed.widths ?? legacyWidths ?? {}) as Partial<ColumnWidths>
    return {
      widths: {
        method: numberOr(widthsRaw.method, DEFAULT_WIDTHS.method),
        status: numberOr(widthsRaw.status, DEFAULT_WIDTHS.status),
        domain: numberOr(widthsRaw.domain, DEFAULT_WIDTHS.domain),
        time: numberOr(widthsRaw.time, DEFAULT_WIDTHS.time),
        cookies:
          widthsRaw.cookies && typeof widthsRaw.cookies === 'object'
            ? Object.fromEntries(
                Object.entries(widthsRaw.cookies as Record<string, unknown>)
                  .filter(
                    ([, v]) => typeof v === 'number' && (v as number) >= MIN_WIDTH,
                  )
                  .map(([k, v]) => [k, v as number]),
              )
            : {},
      },
      visibility: {
        method: parsed.visibility?.method ?? true,
        status: parsed.visibility?.status ?? true,
        domain: parsed.visibility?.domain ?? true,
        path: parsed.visibility?.path ?? true,
        time: parsed.visibility?.time ?? true,
        cookies:
          parsed.visibility?.cookies && typeof parsed.visibility.cookies === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.visibility.cookies as Record<string, unknown>)
                  .filter(([, v]) => typeof v === 'boolean')
                  .map(([k, v]) => [k, v as boolean]),
              )
            : {},
      },
      aliases: {
        method: stringOrUndef(parsed.aliases?.method),
        status: stringOrUndef(parsed.aliases?.status),
        domain: stringOrUndef(parsed.aliases?.domain),
        path: stringOrUndef(parsed.aliases?.path),
        time: stringOrUndef(parsed.aliases?.time),
        cookies:
          parsed.aliases?.cookies && typeof parsed.aliases.cookies === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.aliases.cookies as Record<string, unknown>)
                  .filter(([, v]) => typeof v === 'string' && (v as string).length > 0)
                  .map(([k, v]) => [k, v as string]),
              )
            : {},
      },
    }
  } catch {
    return defaults()
  }
}

function defaults(): PersistedShape {
  return {
    widths: { ...DEFAULT_WIDTHS, cookies: {} },
    visibility: { ...DEFAULT_VISIBILITY, cookies: {} },
    aliases: { ...DEFAULT_ALIASES, cookies: {} },
  }
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && v >= MIN_WIDTH ? v : fallback
}

function stringOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export interface UseColumnWidths {
  widths: ColumnWidths
  cookieWidth: (name: string) => number
  setFixed: (id: 'method' | 'status' | 'domain' | 'time', value: number) => void
  setCookie: (name: string, value: number) => void
  isVisible: (id: FixedColumnId | { cookie: string }) => boolean
  setVisible: (id: FixedColumnId | { cookie: string }, value: boolean) => void
  getAlias: (id: FixedColumnId | { cookie: string }) => string | undefined
  setAlias: (id: FixedColumnId | { cookie: string }, value: string) => void
  clearAlias: (id: FixedColumnId | { cookie: string }) => void
  reset: () => void
}

export function useColumnWidths(): UseColumnWidths {
  const [state, setState] = useState<PersistedShape>(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota / private mode
    }
  }, [state])

  const setFixed = useCallback(
    (id: 'method' | 'status' | 'domain' | 'time', value: number) => {
      setState((prev) => ({
        ...prev,
        widths: { ...prev.widths, [id]: Math.max(MIN_WIDTH, value) },
      }))
    },
    [],
  )

  const setCookie = useCallback((name: string, value: number) => {
    setState((prev) => ({
      ...prev,
      widths: {
        ...prev.widths,
        cookies: { ...prev.widths.cookies, [name]: Math.max(MIN_WIDTH, value) },
      },
    }))
  }, [])

  const cookieWidth = useCallback(
    (name: string) => state.widths.cookies[name] ?? DEFAULT_COOKIE_WIDTH,
    [state.widths.cookies],
  )

  const isVisible = useCallback(
    (id: FixedColumnId | { cookie: string }) => {
      if (typeof id === 'string') return state.visibility[id]
      return state.visibility.cookies[id.cookie] ?? true
    },
    [state.visibility],
  )

  const setVisible = useCallback(
    (id: FixedColumnId | { cookie: string }, value: boolean) => {
      setState((prev) => {
        if (typeof id === 'string') {
          return { ...prev, visibility: { ...prev.visibility, [id]: value } }
        }
        return {
          ...prev,
          visibility: {
            ...prev.visibility,
            cookies: { ...prev.visibility.cookies, [id.cookie]: value },
          },
        }
      })
    },
    [],
  )

  const getAlias = useCallback(
    (id: FixedColumnId | { cookie: string }) => {
      if (typeof id === 'string') return state.aliases[id]
      return state.aliases.cookies[id.cookie]
    },
    [state.aliases],
  )

  const setAlias = useCallback(
    (id: FixedColumnId | { cookie: string }, value: string) => {
      const trimmed = value.trim()
      setState((prev) => {
        if (typeof id === 'string') {
          const next = { ...prev.aliases }
          if (trimmed) next[id] = trimmed
          else delete next[id]
          return { ...prev, aliases: next }
        }
        const cookies = { ...prev.aliases.cookies }
        if (trimmed) cookies[id.cookie] = trimmed
        else delete cookies[id.cookie]
        return { ...prev, aliases: { ...prev.aliases, cookies } }
      })
    },
    [],
  )

  const clearAlias = useCallback(
    (id: FixedColumnId | { cookie: string }) => setAlias(id, ''),
    [setAlias],
  )

  const reset = useCallback(() => {
    setState(defaults())
  }, [])

  return {
    widths: state.widths,
    cookieWidth,
    setFixed,
    setCookie,
    isVisible,
    setVisible,
    getAlias,
    setAlias,
    clearAlias,
    reset,
  }
}

export { MIN_WIDTH as COLUMN_MIN_WIDTH, DEFAULT_COOKIE_WIDTH }
