import { useState } from 'react'

export function SearchBox({ placeholder = 'Search...' }: { placeholder?: string }) {
  const [query, setQuery] = useState('')
  return (
    <div className="border rounded p-3">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border rounded px-2 py-1"
      />
      {query && <p className="text-xs text-gray-400 mt-1">Searching: "{query}"</p>}
    </div>
  )
}
