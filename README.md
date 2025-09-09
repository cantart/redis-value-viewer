# Redis Value Viewer

Minimal React + Vite TypeScript UI to inspect Redis key/value data from an API. Includes search, sort, copy, auto‑refresh, and a sample fallback for local dev.

## Features
- Searchable, sortable table of key/value pairs
- Copy value or `key=value`
- Auto‑refresh: Off, 1s, 3s, 5s, 10s
- Endpoint input; falls back to `public/sample-data.json`

## Quick Start
- `npm install`
- `npm run dev` (http://localhost:5173)
- `npm run build` / `npm run preview`

## API
- Default endpoint: `/api/redis` (change in `src/App.tsx` or via input)
- Optional dev proxy: set `server.proxy` in `vite.config.ts`

## Structure
- `src/App.tsx`: fetching, filters, refresh
- `src/components/RedisTable.tsx`: table + actions
- `public/sample-data.json`: sample data

## Backend API
- Expected: `GET /api/redis` → JSON object mapping `string -> string`.
- Example (Node/Express + ioredis):
  ```js
  import express from 'express'
  import Redis from 'ioredis'
  const app = express(); const redis = new Redis(process.env.REDIS_URL)
  app.get('/api/redis', async (req, res) => {
    const out = {}
    for await (const key of redis.scanIterator({ match: '*' })) {
      const v = await redis.get(key)
      if (v != null) out[key] = v
    }
    res.json(out)
  })
  app.listen(3000)
  ```
- Dev proxy (Vite): in `vite.config.ts` add `server.proxy = { '/api': 'http://localhost:3000' }` to avoid CORS.

## Example Payload
```
{
  "dispatcher:concurrency:connector:07ef5707-0fcb-4002-a8e0-cb39fed4b366": "0",
  "arq:queue:health-check": "Sep-09 04:19:13 j_complete=0 j_failed=0 j_retried=0 j_ongoing=0 queued=0",
  "dispatcher:redispatch_lock": "95a5d25a8d3611f0a6b536807b5645e0",
  "arq:job_monitoring_agent:active": "1"
}
```
