/**
 * Quick Edit Debug Logger
 *
 * Toggle via browser console:
 *   window.__QE_DEBUG = true   // enable
 *   window.__QE_DEBUG = false  // disable
 *
 * Enabled by default when NEXT_PUBLIC_NODE_ENV !== 'production'
 * or when localStorage has 'qe:debug' === '1'.
 */

declare global {
  interface Window {
    __QE_DEBUG?: boolean
    __QE_LAST_STREAM?: {
      fullResponse: string
      extractedCode: string
      selection: { text: string; start: number; end: number }
      instructions: string
      error?: string
      timestamp: number
    }
  }
}

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (window.__QE_DEBUG !== undefined) return window.__QE_DEBUG
  try {
    if (window.localStorage.getItem('qe:debug') === '1') return true
  } catch {
    // ignore
  }
  // Auto-enable in development
  return process.env.NODE_ENV !== 'production'
}

const STYLE_PREFIX = 'color:#6D78E7;font-weight:bold'
const STYLE_WARN = 'color:#f59e0b;font-weight:bold'
const STYLE_ERROR = 'color:#ef4444;font-weight:bold'
const STYLE_SUCCESS = 'color:#22c55e;font-weight:bold'

export const qeDebug = {
  log(label: string, ...args: unknown[]) {
    if (!isEnabled()) return
    console.log(`%c[QE] ${label}`, STYLE_PREFIX, ...args)
  },

  warn(label: string, ...args: unknown[]) {
    if (!isEnabled()) return
    console.warn(`%c[QE] ${label}`, STYLE_WARN, ...args)
  },

  error(label: string, ...args: unknown[]) {
    // Always log errors
    console.error(`%c[QE] ${label}`, STYLE_ERROR, ...args)
  },

  success(label: string, ...args: unknown[]) {
    if (!isEnabled()) return
    console.log(`%c[QE] ${label}`, STYLE_SUCCESS, ...args)
  },

  /** Store last stream data for inspection via `window.__QE_LAST_STREAM` */
  storeStreamData(data: NonNullable<Window['__QE_LAST_STREAM']>) {
    if (typeof window !== 'undefined') {
      window.__QE_LAST_STREAM = data
    }
  },

  /** Dump a summary table to the console */
  table(label: string, obj: Record<string, unknown>) {
    if (!isEnabled()) return
    console.groupCollapsed(`%c[QE] ${label}`, STYLE_PREFIX)
    console.table(obj)
    console.groupEnd()
  },

  /** Enable debug mode programmatically */
  enable() {
    if (typeof window !== 'undefined') {
      window.__QE_DEBUG = true
      window.localStorage.setItem('qe:debug', '1')
      console.log('%c[QE] Debug mode ENABLED', STYLE_SUCCESS)
    }
  },

  /** Disable debug mode programmatically */
  disable() {
    if (typeof window !== 'undefined') {
      window.__QE_DEBUG = false
      window.localStorage.removeItem('qe:debug')
      console.log('%c[QE] Debug mode DISABLED', STYLE_WARN)
    }
  },
}

// Auto-enable in development
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).qeDebug = qeDebug
}

export default qeDebug
