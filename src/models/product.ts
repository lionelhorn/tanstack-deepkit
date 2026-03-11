export interface Product {
  id: number
  name: string
  price: number
  currency: 'USD' | 'EUR' | 'GBP'
  tags: string[]
  inStock: boolean
}
