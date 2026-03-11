import { useState } from 'react'

export function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">{label}</h3>
      <button onClick={() => setCount(c => c + 1)} className="text-sm text-blue-500 mt-1">
        Count: {count}
      </button>
    </div>
  )
}
