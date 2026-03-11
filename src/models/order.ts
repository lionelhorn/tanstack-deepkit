import type { Product } from './product'
import type { User } from './user'

export interface OrderItem {
  product: Product
  quantity: number
  subtotal: number
}

export interface Order {
  id: number
  user: User
  items: OrderItem[]
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
  createdAt: string
}
