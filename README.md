# Redis Value Viewer

Minimal React + Vite TypeScript UI to inspect Redis key/value data from an API. Includes search, sort, copy, auto‑refresh, and a sample fallback for local dev.

## Features
- Searchable, sortable table of key/value pairs
- Copy value or `key=value`
- Auto‑refresh: Off, 1s, 3s, 5s, 10s
- Endpoint input; falls back to `public/sample-data.json`
- Pagination: `limit`, `skip`, Prev/Next, total and page counts

## Quick Start
- `npm install`
- `npm run dev` (http://localhost:5173)
- `npm run build` / `npm run preview`

## API Spec
- Method: `GET`
- Endpoint: configurable in the UI (default `/api/redis`)
- Query params:
  - `limit`: number of items to return (default 100)
  - `skip`: number of items to skip for pagination (default 0)
- Response (required shape):
  - `{ total_count?: number, values: [{ key, type, value }] }`
- Item types:
  - `string`: `value: string`
  - `list`: `value: string[]`
  - `set`: `value: string[]`
  - `hash`: `value: Record<string, string>`
  - `zset`: `value: { member: string, score: number }[]` (also accepts `[member, score][]`)
- Total count (optional):
  - Prefer `X-Total-Count` response header
  - Or include `total_count` (or `total`/`count`) in the JSON body
- Content-Type: `application/json`

### Example cURL:
  ```bash
  curl -s "http://localhost:8002/redis/get/all?limit=100&skip=0" -H "accept: application/json"
  ```

### Example response
```json
{
  "total_count": 4,
  "values": [
    { "key": "arq:job_monitoring_agent:active", "type": "string", "value": "1" },
    { "key": "dispatcher:concurrency:connector:07ef...b366", "type": "string", "value": "0" }
  ]
}
```
