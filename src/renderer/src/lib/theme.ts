export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type ThemePack = 'plain' | 'forest' | 'midnight' | 'solarflare' | 'cherry' | 'terminal'

const THEME_PACK_CLASSES: ThemePack[] = [
  'plain',
  'forest',
  'midnight',
  'solarflare',
  'cherry',
  'terminal',
]

let mediaQuery: MediaQueryList | null = null
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

function resolve(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyChrome(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function applyThemePack(pack: ThemePack): void {
  const root = document.documentElement
  for (const p of THEME_PACK_CLASSES) {
    root.classList.toggle(`pack-${p}`, p === pack)
  }
}

export function applyTheme(
  theme: Theme,
  pack: ThemePack,
  onResolvedChange?: (r: ResolvedTheme) => void,
): void {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
    mediaQuery = null
    mediaListener = null
  }

  const resolved = resolve(theme)
  applyThemePack(pack)
  applyChrome(resolved)
  onResolvedChange?.(resolved)

  if (theme === 'system') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaListener = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? 'dark' : 'light'
      applyChrome(next)
      onResolvedChange?.(next)
    }
    mediaQuery.addEventListener('change', mediaListener)
  }
}

export function currentResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
