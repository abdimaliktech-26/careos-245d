import { processQueue, getQueueSize } from './offline-queue'

export class SyncManager {
  private static instance: SyncManager
  private syncing = false
  private listeners: Array<(status: SyncStatus) => void> = []
  private periodicTimer: ReturnType<typeof setInterval> | null = null

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  async registerSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const reg = await navigator.serviceWorker.ready
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (reg as any).sync.register('sync-mutations')
      } catch {
        // Background sync not supported — fall back to periodic check
      }
    }
    this.startPeriodicSync()
  }

  startPeriodicSync(intervalMs = 15 * 60 * 1000): void {
    if (this.periodicTimer) return
    this.periodicTimer = setInterval(() => {
      if (navigator.onLine) this.syncNow()
    }, intervalMs)
  }

  stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer)
      this.periodicTimer = null
    }
  }

  async syncNow(): Promise<SyncResult> {
    if (this.syncing) return { success: 0, failed: 0 }
    this.syncing = true
    this.notify({ status: 'syncing' })
    try {
      const result = await processQueue()
      this.notify({ status: result.failed > 0 ? 'partial' : 'idle', pending: await getQueueSize() })
      return result
    } finally {
      this.syncing = false
    }
  }

  onStatusChange(cb: (status: SyncStatus) => void): () => void {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }

  private notify(status: SyncStatus): void {
    for (const fn of this.listeners) fn(status)
  }
}

export type SyncStatus =
  | { status: 'idle'; pending?: number }
  | { status: 'syncing' }
  | { status: 'partial'; pending: number }

export type SyncResult = { success: number; failed: number }
