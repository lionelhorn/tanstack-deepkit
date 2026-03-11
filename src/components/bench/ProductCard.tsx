import { useState } from 'react'
import { validate } from '@deepkit/type'
import type { Product } from '~/models/product'

export function ProductCard({ product }: { product: Product }) {
  const [showValidation, setShowValidation] = useState(false)
  const errors = validate<Product>(product)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-sm">{product.price} {product.currency}</p>
      <button onClick={() => setShowValidation(!showValidation)} className="text-xs text-blue-500 mt-1">
        {showValidation ? 'Hide' : 'Validate'}
      </button>
      {showValidation && (
        <p className="text-xs mt-1">{errors.length === 0 ? 'Valid' : `${errors.length} error(s)`}</p>
      )}
    </div>
  )
}
