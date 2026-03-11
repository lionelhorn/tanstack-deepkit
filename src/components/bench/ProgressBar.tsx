import { useState } from 'react'

export function ProgressBar({ initial = 30 }: { initial?: number }) {
  const [value, setValue] = useState(initial)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold text-sm">Progress</h3>
      <div className="w-full bg-gray-200 rounded h-2 mt-2">
        <div className="bg-blue-500 h-2 rounded transition-all" style={{ width: `${value}%` }} />
      </div>
      <div className="flex gap-1 mt-2">
        <button onClick={() => setValue(v => Math.max(0, v - 10))} className="text-xs text-blue-500">-10</button>
        <span className="text-xs text-gray-500">{value}%</span>
        <button onClick={() => setValue(v => Math.min(100, v + 10))} className="text-xs text-blue-500">+10</button>
      </div>
    </div>
  )
}
