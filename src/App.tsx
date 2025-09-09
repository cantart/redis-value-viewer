import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RedisTable } from './components/RedisTable'

type KV = Record<string, string>

const DEFAULT_ENDPOINT = '/api/redis' // you can change or proxy in vite.config.ts

export function App() {
  const [data, setData] = useState<KV | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT)
  const [filter, setFilter] = useState('')
  const [intervalMs, setIntervalMs] = useState<number>(0) // 0 = off
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(endpoint, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const body = await res.json()
      setData(body as KV)
    } catch (e: any) {
      // Fallback to sample when API isn't ready
      try {
        const res = await fetch('/sample-data.json')
        const body = await res.json()
        setData(body as KV)
        setError(`Using sample data (API not available${e?.message ? `: ${e.message}` : ''})`)
      } catch (e2: any) {
        setError(e2?.message ?? 'Unknown error')
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [endpoint])

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
    if (!data) return null
    if (!filter.trim()) return data
    const q = filter.toLowerCase()
    return Object.fromEntries(
      Object.entries(data).filter(([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q))
    )
  }, [data, filter])

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
        {error && <p className="notice">{error}</p>}
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
      </section>

      {filtered ? (
        <RedisTable data={filtered} />
      ) : (
        <p className="empty">No data loaded.</p>
      )}
    </div>
  )
}
