import { useMemo, useState } from 'react'

export type RedisItem =
  | { key: string; type: 'string'; value: string }
  | { key: string; type: 'list'; value: string[] }
  | { key: string; type: 'set'; value: string[] }
  | { key: string; type: 'hash'; value: Record<string, string> }
  | { key: string; type: 'zset'; value: { member: string; score: number }[] }

type Props = {
  items: RedisItem[]
}

export function RedisTable({ items }: Props) {
  const [sortAsc, setSortAsc] = useState(true)

  const rows = useMemo(() => {
    return [...items].sort((a, b) => (sortAsc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)))
  }, [items, sortAsc])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  const valueAsText = (it: RedisItem): string => {
    switch (it.type) {
      case 'string':
        return it.value
      default:
        return JSON.stringify(it.value)
    }
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="key-col" onClick={() => setSortAsc((s) => !s)}>
              Key {sortAsc ? '▲' : '▼'}
            </th>
            <th>Type</th>
            <th>Value</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => (
            <tr key={it.key}>
              <td className="mono" title={it.key}>{it.key}</td>
              <td className="mono" title={it.type}>{it.type}</td>
              <td>
                <ValueCell item={it} />
              </td>
              <td>
                <button onClick={() => copy(`${it.key}=${valueAsText(it)}`)}>Copy pair</button>
                <button onClick={() => copy(valueAsText(it))}>Copy value</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ValueCell({ item }: { item: RedisItem }) {
  if (item.type === 'string') {
    const value = item.value
    const looksJsonish = value.trim().startsWith('{') || value.trim().startsWith('[')
    if (looksJsonish) {
      // Try JSON first
      try {
        const parsed = JSON.parse(value)
        return <pre className="code-block">{JSON.stringify(parsed, null, 2)}</pre>
      } catch {
        // Best-effort Python-like repr → JSON
        try {
          const converted = value
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/\bNone\b/g, 'null')
            .replace(/'/g, '"')
          const parsed2 = JSON.parse(converted)
          return <pre className="code-block">{JSON.stringify(parsed2, null, 2)}</pre>
        } catch {
          // fall through to plain text
        }
      }
    }
    return <span className="value" title={value}>{value}</span>
  }

  // Non-string: pretty print JSON with a compact header for quick glance
  const header = (() => {
    switch (item.type) {
      case 'list':
        return `list(${item.value.length})`
      case 'set':
        return `set(${item.value.length})`
      case 'hash':
        return `hash(${Object.keys(item.value).length})`
      case 'zset':
        return `zset(${item.value.length})`
    }
  })()

  return (
    <details>
      <summary className="mono">{header}</summary>
      <pre className="code-block" style={{ marginTop: 6 }}>{JSON.stringify(item.value, null, 2)}</pre>
    </details>
  )
}
