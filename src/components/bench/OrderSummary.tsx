import { useState } from 'react'
import { typeOf, ReflectionKind } from '@deepkit/type'
import type { Order } from '~/models/order'

const orderType = typeOf<Order>()

export function OrderSummary({ order }: { order: Order }) {
  const [showMeta, setShowMeta] = useState(false)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">Order #{order.id}</h3>
      <p className="text-sm">{order.items.length} items — {order.status}</p>
      <p className="text-sm font-medium">${order.total}</p>
      <button onClick={() => setShowMeta(!showMeta)} className="text-xs text-blue-500 mt-1">
        {showMeta ? 'Hide' : 'Show'} type
      </button>
      {showMeta && (
        <p className="text-xs text-gray-400 mt-1">kind={ReflectionKind[orderType.kind]}</p>
      )}
    </div>
  )
}
