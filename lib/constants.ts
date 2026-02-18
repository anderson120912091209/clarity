'use client'
import { IndexedDBStorage } from '@instantdb/core'
import { InstantReactWeb } from '@instantdb/react'

export const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID as string

if (!APP_ID) {
  console.error('NEXT_PUBLIC_INSTANT_APP_ID is not set. Please check your .env.local file.')
}

const IDB_CLOSING_MESSAGE = 'database connection is closing'

function isClosingIndexedDbError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return (
      error.name === 'InvalidStateError' &&
      error.message.toLowerCase().includes(IDB_CLOSING_MESSAGE)
    )
  }

  if (!error || typeof error !== 'object') return false

  const record = error as {
    message?: unknown
    target?: { error?: { name?: unknown; message?: unknown } }
  }

  const message =
    (typeof record.message === 'string' && record.message) ||
    (typeof record.target?.error?.message === 'string' && record.target.error.message) ||
    ''
  const name =
    (typeof record.target?.error?.name === 'string' && record.target.error.name) || ''

  return name === 'InvalidStateError' && message.toLowerCase().includes(IDB_CLOSING_MESSAGE)
}

class ResilientIndexedDBStorage extends IndexedDBStorage {
  private async withReconnectRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (!isClosingIndexedDbError(error)) throw error

      // Safari/webview can close the current IndexedDB connection mid-flight.
      // Re-open and retry once against a fresh connection.
      this._dbPromise = this._init()
      await Promise.resolve()
      return operation()
    }
  }

  override getItem(k: string): Promise<unknown> {
    return this.withReconnectRetry(() => super.getItem(k))
  }

  override setItem(k: string, v: unknown): Promise<void> {
    return this.withReconnectRetry(() => super.setItem(k, v))
  }

  override multiSet(keyValuePairs: Array<[string, unknown]>): Promise<void> {
    return this.withReconnectRetry(() => super.multiSet(keyValuePairs))
  }

  override removeItem(k: string): Promise<void> {
    return this.withReconnectRetry(() => super.removeItem(k))
  }

  override getAllKeys(): Promise<string[]> {
    return this.withReconnectRetry(() => super.getAllKeys())
  }
}

class ResilientInstantReactWeb extends InstantReactWeb {
  static override Storage = ResilientIndexedDBStorage
}

export const db = new ResilientInstantReactWeb({ appId: APP_ID || '' })
export const RAILWAY_ENDPOINT_URL = process.env.NEXT_PUBLIC_RAILWAY_ENDPOINT_URL as string;
