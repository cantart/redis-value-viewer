import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RedisTable, type RedisItem } from './components/RedisTable'

// Legacy shape: Record<string, string>
type LegacyKV = Record<string, string>

// New flexible API shapes:
// - Array<RedisItem>
// - Wrapped: { values: RedisItem[], total_count?: number }
// - Record<string, { type: string; value: any }> (object map form)
type ApiResponse =
  | LegacyKV
  | RedisItem[]
  | { values: any[]; [k: string]: any }
  | Record<string, { type: RedisItem['type']; value: any }>

const DEFAULT_ENDPOINT = '/api/redis' // you can change or proxy in vite.config.ts

export function App() {
  const [items, setItems] = useState<RedisItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT)
  const [filter, setFilter] = useState('')
  const [intervalMs, setIntervalMs] = useState<number>(0) // 0 = off
  const [limit, setLimit] = useState<number>(100)
  const [skip, setSkip] = useState<number>(0)
  const [total, setTotal] = useState<number | null>(null)
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('skip', String(skip))
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const body = (await res.json()) as ApiResponse
      const normalized = normalize(body)
      setItems(normalized)
      // Try total from header first, then body fields, else null
      const hdrTotal = res.headers.get('x-total-count')
      let totalFromBody: number | null = null
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const anyBody = body as any
        if (typeof anyBody.total_count === 'number') totalFromBody = anyBody.total_count
        else if (typeof anyBody.total === 'number') totalFromBody = anyBody.total
        else if (typeof anyBody.count === 'number') totalFromBody = anyBody.count
        else if (anyBody.data && typeof anyBody.data.total === 'number') totalFromBody = anyBody.data.total
      }
      setTotal(hdrTotal != null ? Number(hdrTotal) : totalFromBody)
    } catch (e: any) {
      // Fallback to sample when API isn't ready
      try {
        const res = await fetch('/sample-data.json')
        const body = (await res.json()) as ApiResponse
        const normalized = normalize(body)
        setItems(normalized)
        setTotal(Array.isArray(normalized) ? normalized.length : null)
        setError(`Using sample data (API not available${e?.message ? `: ${e.message}` : ''})`)
      } catch (e2: any) {
        setError(e2?.message ?? 'Unknown error')
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [endpoint, limit, skip])

  useEffect(() => {
    void load()
  }, [load])

  // Auto-refresh at a chosen interval; 0 disables
  useEffect(() => {
    if (!intervalMs) return
    const id = setInterval(() => void load(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, load])

  const filtered = useMemo(() => {
    if (!items) return null
    if (!filter.trim()) return items
    const q = filter.toLowerCase()
    return items.filter((it) => {
      const keyHit = it.key.toLowerCase().includes(q)
      const typeHit = it.type.toLowerCase().includes(q)
      const valueStr = it.type === 'string' ? it.value : JSON.stringify(it.value)
      const valueHit = valueStr.toLowerCase().includes(q)
      return keyHit || typeHit || valueHit
    })
  }, [items, filter])

  return (
    <div className="container">
      <header className="header">
        <h1>Redis Values Viewer</h1>
        <div className="actions">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="API endpoint, e.g. /api/redis"
            className="endpoint"
          />
          <button onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <p className="notice">
          {error ? `${error} — ` : ''}
          {`Total: ${total ?? (items?.length ?? 0)} | Page items: ${items?.length ?? 0}`}
        </p>
      </header>

      <section className="toolbar">
        <input
          className="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by key or value…"
        />
        <label>
          Auto-refresh:
          <select
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            style={{ marginLeft: 6 }}
          >
            <option value={0}>Off</option>
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </label>
        <label style={{ marginLeft: 8 }}>
          Limit:
          <input
            type="number"
            min={1}
            step={1}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Number(e.target.value)))}
            style={{ width: 80, marginLeft: 6 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <button
            onClick={() => setSkip((s) => Math.max(0, s - limit))}
            disabled={loading || skip <= 0}
          >
            ◀ Prev
          </button>
          <button
            onClick={() => setSkip((s) => s + limit)}
            disabled={loading || (total != null && skip + (items?.length ?? 0) >= total)}
          >
            Next ▶
          </button>
        </div>
      </section>

      {filtered ? (
        <RedisTable items={filtered} />
      ) : (
        <p className="empty">No data loaded.</p>
      )}
    </div>
  )
}

function normalize(body: ApiResponse): RedisItem[] {
  // If array of items already – also normalize zset pairs if needed
  const normalizeArray = (arr: any[]): RedisItem[] =>
    arr.map((it): RedisItem => {
      if (!it || typeof it !== 'object' || !('type' in it) || !('key' in it)) {
        return { key: String((it as any)?.key ?? ''), type: 'string', value: String((it as any)?.value ?? '') }
      }
      if (it.type === 'zset') {
        const raw = Array.isArray(it.value) ? it.value : []
        const val = raw.map((e: any) =>
          Array.isArray(e) && e.length >= 2
            ? { member: String(e[0]), score: Number(e[1]) }
            : { member: String(e?.member ?? ''), score: Number(e?.score ?? 0) }
        )
        return { key: String(it.key), type: 'zset', value: val }
      }
      if (it.type === 'list' || it.type === 'set') {
        const arr2 = Array.isArray(it.value) ? it.value.map(String) : []
        return { key: String(it.key), type: it.type, value: arr2 } as RedisItem
      }
      if (it.type === 'hash') {
        const obj = it.value && typeof it.value === 'object' ? it.value : {}
        return { key: String(it.key), type: 'hash', value: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, String(v)])) }
      }
      return { key: String(it.key), type: 'string', value: String(it.value ?? '') }
    })

  if (Array.isArray(body)) {
    return normalizeArray(body as any[])
  }
  // Wrapped: { values: [...] }
  if (body && typeof body === 'object' && Array.isArray((body as any).values)) {
    return normalizeArray((body as any).values)
  }
  // If legacy map of string -> string
  const isLegacy = typeof body === 'object' && body != null && Object.values(body).every((v) => typeof v === 'string')
  if (isLegacy) {
    return Object.entries(body as LegacyKV).map(([key, value]) => ({ key, type: 'string', value }))
  }
  // Map form: key -> { type, value }
  const obj = body as Record<string, { type: RedisItem['type']; value: any }>
  return Object.entries(obj).map(([key, v]) => {
    if (!v || typeof v !== 'object' || !('type' in v)) {
      // Fallback to string stringification
      return { key, type: 'string', value: String((v as any) ?? '') } as RedisItem
    }
    switch (v.type) {
      case 'string':
        return { key, type: 'string', value: String(v.value ?? '') }
      case 'list':
        return { key, type: 'list', value: Array.isArray(v.value) ? v.value.map(String) : [] }
      case 'set':
        return { key, type: 'set', value: Array.isArray(v.value) ? v.value.map(String) : [] }
      case 'hash':
        return { key, type: 'hash', value: (v.value && typeof v.value === 'object') ? Object.fromEntries(Object.entries(v.value).map(([k, val]) => [k, String(val)])) : {} }
      case 'zset':
        return {
          key,
          type: 'zset',
          value: Array.isArray(v.value)
            ? v.value.map((e: any) => ({ member: String(e.member), score: Number(e.score) }))
            : []
        }
      default:
        return { key, type: 'string', value: JSON.stringify(v.value) } as RedisItem
    }
  })
}
