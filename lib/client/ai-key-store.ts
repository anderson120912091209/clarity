/**
 * Client-side encrypted API key storage using Web Crypto API.
 *
 * Keys are encrypted with AES-256-GCM using a device-derived key (PBKDF2).
 * Plaintext keys NEVER touch localStorage — only ciphertext is persisted.
 * All storage is scoped per userId to prevent cross-account leakage.
 */

export type AIProvider = 'anthropic' | 'google' | 'openai'

interface EncryptedEntry {
  ciphertext: string // base64
  iv: string // base64
  model: string
  lastValidated: number | null
  maskedKey?: string // e.g., "sk-ant-••••wxyz"
}

interface EncryptedKeyStore {
  version: 1
  keys: Partial<Record<AIProvider, EncryptedEntry>>
}

// Legacy unscoped keys (pre-migration)
const LEGACY_STORE_KEY = 'clarity:ai-keys:v1'
const LEGACY_ACTIVE_KEY = 'clarity:ai-active-provider'

function getStoreKey(userId: string): string {
  return `clarity:ai-keys:v1:${userId}`
}

function getActiveProviderKey(userId: string): string {
  return `clarity:ai-active-provider:${userId}`
}

const SALT_KEY = 'clarity:ai-key-salt'
const PBKDF2_ITERATIONS = 100_000

// ---------------------------------------------------------------------------
// Migration: move unscoped data to per-user scoped keys (runs once)
// ---------------------------------------------------------------------------

export function migrateUnscoped(userId: string): void {
  if (typeof window === 'undefined') return

  const raw = localStorage.getItem(LEGACY_STORE_KEY)
  if (!raw) return

  const scopedKey = getStoreKey(userId)
  if (localStorage.getItem(scopedKey)) {
    // User already has scoped data — just remove the legacy key
    localStorage.removeItem(LEGACY_STORE_KEY)
    localStorage.removeItem(LEGACY_ACTIVE_KEY)
    return
  }

  // Move data to scoped key
  localStorage.setItem(scopedKey, raw)
  localStorage.removeItem(LEGACY_STORE_KEY)

  // Migrate active provider
  const oldActive = localStorage.getItem(LEGACY_ACTIVE_KEY)
  if (oldActive) {
    localStorage.setItem(getActiveProviderKey(userId), oldActive)
    localStorage.removeItem(LEGACY_ACTIVE_KEY)
  }
}

// ---------------------------------------------------------------------------
// Device fingerprint (not secret — just adds device-binding)
// ---------------------------------------------------------------------------

function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr'
  const parts = [
    navigator.userAgent,
    screen.width.toString(),
    screen.height.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]
  return parts.join('|')
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

async function getOrCreateSalt(): Promise<Uint8Array> {
  const existing = localStorage.getItem(SALT_KEY)
  if (existing) {
    return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0))
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)))
  return salt
}

async function deriveEncryptionKey(userId: string): Promise<CryptoKey> {
  const salt = await getOrCreateSalt()
  const rawMaterial = new TextEncoder().encode(userId + '|' + getDeviceFingerprint())

  const baseKey = await crypto.subtle.importKey('raw', rawMaterial, 'PBKDF2', false, [
    'deriveKey',
  ])

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

async function encrypt(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes)
  return new TextDecoder().decode(decrypted)
}

// ---------------------------------------------------------------------------
// Masking helper
// ---------------------------------------------------------------------------

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '••••••••'
  const prefix = apiKey.slice(0, Math.min(apiKey.indexOf('-', 3) + 1, 8) || 4)
  const suffix = apiKey.slice(-4)
  return `${prefix}••••${suffix}`
}

// ---------------------------------------------------------------------------
// Store helpers (scoped per userId)
// ---------------------------------------------------------------------------

function readStore(userId: string): EncryptedKeyStore {
  try {
    const raw = localStorage.getItem(getStoreKey(userId))
    if (!raw) return { version: 1, keys: {} }
    const parsed = JSON.parse(raw) as EncryptedKeyStore
    if (parsed.version !== 1) return { version: 1, keys: {} }
    return parsed
  } catch {
    return { version: 1, keys: {} }
  }
}

function writeStore(userId: string, store: EncryptedKeyStore): void {
  localStorage.setItem(getStoreKey(userId), JSON.stringify(store))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function saveProviderKey(
  userId: string,
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<void> {
  const key = await deriveEncryptionKey(userId)
  const { ciphertext, iv } = await encrypt(apiKey, key)

  const store = readStore(userId)
  store.keys[provider] = { ciphertext, iv, model, lastValidated: null, maskedKey: maskApiKey(apiKey) }
  writeStore(userId, store)
}

export async function getProviderKey(
  userId: string,
  provider: AIProvider
): Promise<{ apiKey: string; model: string } | null> {
  const store = readStore(userId)
  const entry = store.keys[provider]
  if (!entry) return null

  try {
    const key = await deriveEncryptionKey(userId)
    const apiKey = await decrypt(entry.ciphertext, entry.iv, key)
    return { apiKey, model: entry.model }
  } catch {
    // Decryption failed (different device, corrupted data, etc.)
    return null
  }
}

export function removeProviderKey(userId: string, provider: AIProvider): void {
  const store = readStore(userId)
  delete store.keys[provider]
  writeStore(userId, store)
}

export function hasAnyConfiguredProvider(userId: string): boolean {
  const store = readStore(userId)
  return Object.keys(store.keys).length > 0
}

export function getConfiguredProviders(userId: string): Array<{
  provider: AIProvider
  model: string
  lastValidated: number | null
  maskedKey?: string
}> {
  const store = readStore(userId)
  return (Object.entries(store.keys) as [AIProvider, EncryptedEntry][]).map(([provider, entry]) => ({
    provider,
    model: entry.model,
    lastValidated: entry.lastValidated,
    maskedKey: entry.maskedKey,
  }))
}

export function updateProviderModel(userId: string, provider: AIProvider, model: string): void {
  const store = readStore(userId)
  const entry = store.keys[provider]
  if (entry) {
    entry.model = model
    writeStore(userId, store)
  }
}

export function markProviderValidated(userId: string, provider: AIProvider): void {
  const store = readStore(userId)
  const entry = store.keys[provider]
  if (entry) {
    entry.lastValidated = Date.now()
    writeStore(userId, store)
  }
}

export function getActiveProvider(userId: string): AIProvider | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(getActiveProviderKey(userId))
  if (stored === 'anthropic' || stored === 'google' || stored === 'openai') return stored
  // Fall back to first configured provider
  const configured = getConfiguredProviders(userId)
  return configured.length > 0 ? configured[0].provider : null
}

export function setActiveProvider(userId: string, provider: AIProvider): void {
  localStorage.setItem(getActiveProviderKey(userId), provider)
}

export function clearAllKeys(userId: string): void {
  localStorage.removeItem(getStoreKey(userId))
  localStorage.removeItem(SALT_KEY)
  localStorage.removeItem(getActiveProviderKey(userId))
}
