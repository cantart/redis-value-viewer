import { useMemo, useState } from 'react'

type Props = {
  data: Record<string, string>
}

export function RedisTable({ data }: Props) {
  const [sortAsc, setSortAsc] = useState(true)

  const rows = useMemo(() => {
    return Object.entries(data).sort(([a], [b]) => (sortAsc ? a.localeCompare(b) : b.localeCompare(a)))
  }, [data, sortAsc])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
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
            <th>Value</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="mono" title={k}>{k}</td>
              <td>
                <ValueCell value={v} />
              </td>
              <td>
                <button onClick={() => copy(`${k}=${v}`)}>Copy pair</button>
                <button onClick={() => copy(v)}>Copy value</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ValueCell({ value }: { value: string }) {
  // Detect JSON-looking payloads and pretty print; else show as text
  const isJson = value.trim().startsWith('{') || value.trim().startsWith('[')
  if (isJson) {
    try {
      const parsed = JSON.parse(value)
      return <pre className="code-block">{JSON.stringify(parsed, null, 2)}</pre>
    } catch {
      // fall through to plain text
    }
  }

  return <span className="value" title={value}>{value}</span>
}

