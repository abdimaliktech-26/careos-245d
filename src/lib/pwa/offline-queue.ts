const DB_NAME = 'higsi-offline'
const DB_VERSION = 1
const STORE_NAME = 'mutations'

export type OfflineMutation = {
  id?: number
  url: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers: Record<string, string>
  body: string | null
  timestamp: number
  retries: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('retries', 'retries', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueue(
  url: string,
  method: OfflineMutation['method'],
  headers: Record<string, string>,
  body: string | null
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await new Promise<void>((resolve, reject) => {
    const req = store.add({ url, method, headers, body, timestamp: Date.now(), retries: 0 })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const all = await new Promise<OfflineMutation[]>((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  let success = 0
  let failed = 0

  for (const mutation of all) {
    try {
      const opts: RequestInit = { method: mutation.method, headers: mutation.headers }
      if (mutation.body) opts.body = mutation.body

      const res = await fetch(mutation.url, opts)
      if (res.ok) {
        store.delete(mutation.id!)
        success++
      } else {
        store.put({ ...mutation, retries: mutation.retries + 1 })
        failed++
      }
    } catch {
      store.put({ ...mutation, retries: mutation.retries + 1 })
      failed++
    }
  }

  return { success, failed }
}

export async function getQueueSize(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  return new Promise((resolve, reject) => {
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await new Promise<void>((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
