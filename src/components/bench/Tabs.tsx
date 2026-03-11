import { useState } from 'react'

export function Tabs({ items }: { items: string[] }) {
  const [active, setActive] = useState(0)
  return (
    <div className="border rounded p-3">
      <div className="flex gap-1">
        {items.map((item, i) => (
          <button
            key={item}
            onClick={() => setActive(i)}
            className={`text-xs px-2 py-1 rounded ${i === active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="text-sm mt-2">Active: {items[active]}</p>
    </div>
  )
}
