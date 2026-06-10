const STATIC_CACHE = 'careintake-static-v3'
const NAV_CACHE = 'careintake-nav-v3'
const API_CACHE = 'careintake-api-v3'

const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

const DB_NAME = 'careintake-offline'
const DB_VERSION = 1
const STORE_NAME = 'mutations'

function openDB() {
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

async function saveMutation(request) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const body = request.method === 'GET' ? null : await request.clone().text()
    const headers = {}
    request.headers.forEach((value, key) => { headers[key] = value })
    store.add({ url: request.url, method: request.method, headers, body, timestamp: Date.now(), retries: 0 })
  } catch {}
}

async function getMutations() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
  } catch { return [] }
}

async function replayMutations() {
  const mutations = await getMutations()
  if (mutations.length === 0) return { success: 0, fail: 0 }
  const db = await openDB()
  let success = 0; let fail = 0
  for (const m of mutations) {
    try {
      const opts = { method: m.method, headers: Object.assign({}, m.headers) }
      if (m.body) opts.body = m.body
      else delete opts.headers['content-type']
      const res = await fetch(m.url, opts)
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      if (res.ok) { store.delete(m.id); success++ }
      else { store.put({ ...m, retries: (m.retries || 0) + 1 }); fail++ }
    } catch {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ ...m, retries: (m.retries || 0) + 1 }); fail++
    }
  }
  return { success, fail }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_URLS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const valid = [STATIC_CACHE, NAV_CACHE, API_CACHE]
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !valid.includes(k)).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp|avif)$/i.test(url.pathname)
  )
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/')
}

function isMutation(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
}

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return new Response('', { status: 408 })
  }
}

async function networkFirstNavigation(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(NAV_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    const offline = await caches.match('/offline')
    if (offline) return offline
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirstApi(req) {
  try {
    const res = await fetch(req)
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(API_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are offline. Cached data may be stale.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function handleApiMutation(req) {
  try {
    const res = await fetch(req.clone())
    return res
  } catch {
    await saveMutation(req)
    return new Response(
      JSON.stringify({ queued: true, message: 'Saved offline. Will sync when connection returns.' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req)
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok && res.type === 'basic') {
        caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()))
      }
      return res
    })
    .catch(() => cached || new Response('', { status: 408 }))
  return cached || fetchPromise
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (!url.protocol.startsWith('http')) return

  if (isApiCall(url) && isMutation(request.method)) {
    event.respondWith(handleApiMutation(request))
    return
  }
  if (isApiCall(url)) {
    event.respondWith(networkFirstApi(request))
    return
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }
  event.respondWith(staleWhileRevalidate(request))
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(replayMutations())
  }
})

self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'SYNC_NOW') {
    event.waitUntil(
      replayMutations().then((result) => {
        if (event.source && event.source.postMessage) {
          event.source.postMessage({ type: 'SYNC_RESULT', ...result })
        }
      })
    )
  }
  if (event.data.type === 'GET_QUEUE_SIZE') {
    getMutations().then((mutations) => {
      if (event.source && event.source.postMessage) {
        event.source.postMessage({ type: 'QUEUE_SIZE', size: mutations.length })
      }
    })
  }
})
