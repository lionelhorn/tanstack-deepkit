import { useState } from 'react'

export function Toggle({ label }: { label: string }) {
  const [on, setOn] = useState(false)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">{label}</h3>
      <button onClick={() => setOn(!on)} className={`text-sm mt-1 ${on ? 'text-green-500' : 'text-gray-400'}`}>
        {on ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
