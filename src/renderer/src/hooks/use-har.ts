import { useCallback, useMemo, useState } from 'react'
import {
  buildSessionColorMap,
  findSessionCookieNames,
  parseHar,
  serializeHar,
  type HarEntry,
  type HarFile,
} from '@/lib/har'

export interface HarState {
  path: string | null
  name: string
  har: HarFile | null
  deletedIndices: Set<number>
  parseError: string | null
}

const INITIAL: HarState = {
  path: null,
  name: 'No file',
  har: null,
  deletedIndices: new Set(),
  parseError: null,
}

export interface HarDocument {
  state: HarState
  entries: HarEntry[]
  sessionCookieNames: string[]
  sessionColorMap: Map<string, string>
  dirty: boolean
  adoptOpened: (file: { path: string; name: string; content: string }) => void
  deleteEntry: (index: number) => void
  restoreEntry: (index: number) => void
  clearDeletions: () => void
  save: () => Promise<boolean>
  saveAs: () => Promise<boolean>
}

export function useHar(): HarDocument {
  const [state, setState] = useState<HarState>(INITIAL)

  const entries = state.har?.log.entries ?? []
  const sessionCookieNames = useMemo(
    () => findSessionCookieNames(entries),
    [entries],
  )
  const sessionColorMap = useMemo(
    () => buildSessionColorMap(entries, sessionCookieNames),
    [entries, sessionCookieNames],
  )

  const dirty = state.deletedIndices.size > 0

  const adoptOpened = useCallback(
    (file: { path: string; name: string; content: string }) => {
      try {
        const har = parseHar(file.content)
        setState({
          path: file.path,
          name: file.name,
          har,
          deletedIndices: new Set(),
          parseError: null,
        })
      } catch (err) {
        setState({
          path: file.path,
          name: file.name,
          har: null,
          deletedIndices: new Set(),
          parseError: err instanceof Error ? err.message : String(err),
        })
      }
    },
    [],
  )

  const deleteEntry = useCallback((index: number) => {
    setState((prev) => {
      if (!prev.har) return prev
      const next = new Set(prev.deletedIndices)
      next.add(index)
      return { ...prev, deletedIndices: next }
    })
  }, [])

  const restoreEntry = useCallback((index: number) => {
    setState((prev) => {
      const next = new Set(prev.deletedIndices)
      next.delete(index)
      return { ...prev, deletedIndices: next }
    })
  }, [])

  const clearDeletions = useCallback(() => {
    setState((prev) =>
      prev.deletedIndices.size === 0
        ? prev
        : { ...prev, deletedIndices: new Set() },
    )
  }, [])

  const snapshot = useCallback(
    (): Promise<HarState> =>
      new Promise((resolve) =>
        setState((prev) => {
          resolve(prev)
          return prev
        }),
      ),
    [],
  )

  const save = useCallback(async (): Promise<boolean> => {
    const s = await snapshot()
    if (!s.har || !s.path) return false
    const content = serializeHar(s.har, s.deletedIndices)
    await window.api.saveFile(s.path, content)
    const har: HarFile = {
      ...s.har,
      log: {
        ...s.har.log,
        entries: s.har.log.entries.filter((_, i) => !s.deletedIndices.has(i)),
      },
    }
    setState({
      path: s.path,
      name: s.name,
      har,
      deletedIndices: new Set(),
      parseError: null,
    })
    return true
  }, [snapshot])

  const saveAs = useCallback(async (): Promise<boolean> => {
    const s = await snapshot()
    if (!s.har) return false
    const content = serializeHar(s.har, s.deletedIndices)
    const suggested = s.name || 'export.har'
    const result = await window.api.saveFileAs(content, suggested)
    if (!result) return false
    const har: HarFile = {
      ...s.har,
      log: {
        ...s.har.log,
        entries: s.har.log.entries.filter((_, i) => !s.deletedIndices.has(i)),
      },
    }
    setState({
      path: result.path,
      name: result.name,
      har,
      deletedIndices: new Set(),
      parseError: null,
    })
    return true
  }, [snapshot])

  return {
    state,
    entries,
    sessionCookieNames,
    sessionColorMap,
    dirty,
    adoptOpened,
    deleteEntry,
    restoreEntry,
    clearDeletions,
    save,
    saveAs,
  }
}
