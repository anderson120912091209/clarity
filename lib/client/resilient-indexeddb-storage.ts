const FALLBACK_KEY_PREFIX = 'instantdb_fallback:'

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error ?? '')
}

function isRecoverableIndexedDbError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase()

  if (error instanceof DOMException) {
    return (
      error.name === 'InvalidStateError' ||
      error.name === 'AbortError' ||
      message.includes('connection is closing')
    )
  }

  return message.includes('invalidstateerror') || message.includes('connection is closing')
}

export class ResilientIndexedDBStorage {
  private readonly dbName: string
  private readonly storeName = 'kv'
  private dbPromise: Promise<IDBDatabase>

  constructor(dbName: string) {
    this.dbName = dbName
    this.dbPromise = this.openDb()
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB is unavailable'))
        return
      }

      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
    })
  }

  private resetDbConnection() {
    this.dbPromise = this.openDb()
  }

  private fallbackKey(key: string): string {
    return `${FALLBACK_KEY_PREFIX}${this.dbName}:${key}`
  }

  private readFallback(key: string): string | null {
    try {
      return window.localStorage.getItem(this.fallbackKey(key))
    } catch {
      return null
    }
  }

  private writeFallback(key: string, value: string) {
    try {
      window.localStorage.setItem(this.fallbackKey(key), value)
    } catch {
      // Ignore storage quota / privacy mode failures.
    }
  }

  private async readFromIndexedDb(key: string): Promise<string | null> {
    const db = await this.dbPromise

    return new Promise((resolve, reject) => {
      let request: IDBRequest<unknown>

      try {
        const tx = db.transaction([this.storeName], 'readonly')
        const store = tx.objectStore(this.storeName)
        request = store.get(key)
      } catch (error) {
        reject(error)
        return
      }

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to read from IndexedDB'))
      }

      request.onsuccess = () => {
        const value = request.result
        resolve(typeof value === 'string' ? value : value == null ? null : String(value))
      }
    })
  }

  private async writeToIndexedDb(key: string, value: string): Promise<void> {
    const db = await this.dbPromise

    return new Promise((resolve, reject) => {
      let request: IDBRequest<IDBValidKey>

      try {
        const tx = db.transaction([this.storeName], 'readwrite')
        const store = tx.objectStore(this.storeName)
        request = store.put(value, key)
      } catch (error) {
        reject(error)
        return
      }

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to write to IndexedDB'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.readFromIndexedDb(key)
    } catch (error) {
      if (isRecoverableIndexedDbError(error)) {
        this.resetDbConnection()
        try {
          return await this.readFromIndexedDb(key)
        } catch {
          return this.readFallback(key)
        }
      }

      return this.readFallback(key)
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.writeToIndexedDb(key, value)
      this.writeFallback(key, value)
      return
    } catch (error) {
      if (isRecoverableIndexedDbError(error)) {
        this.resetDbConnection()
        try {
          await this.writeToIndexedDb(key, value)
          this.writeFallback(key, value)
          return
        } catch {
          this.writeFallback(key, value)
          return
        }
      }

      this.writeFallback(key, value)
    }
  }
}
