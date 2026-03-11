import { createFileRoute } from '@tanstack/react-router'
import { UserCard } from '~/components/bench/UserCard'
import { ProductCard } from '~/components/bench/ProductCard'
import { OrderSummary } from '~/components/bench/OrderSummary'
import { ConfigPanel } from '~/components/bench/ConfigPanel'
import { AnalyticsDashboard } from '~/components/bench/AnalyticsDashboard'
import { Counter } from '~/components/bench/Counter'
import { Toggle } from '~/components/bench/Toggle'
import { Tabs } from '~/components/bench/Tabs'
import { ProgressBar } from '~/components/bench/ProgressBar'
import { SearchBox } from '~/components/bench/SearchBox'

const sampleUser = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }
const sampleProduct = { id: 1, name: 'Widget', price: 9.99, currency: 'USD' as const, tags: ['gadget'], inStock: true }
const sampleOrder = {
  id: 1,
  user: sampleUser,
  items: [{ product: sampleProduct, quantity: 2, subtotal: 19.98 }],
  total: 19.98,
  status: 'confirmed' as const,
  createdAt: '2026-01-15',
}
const sampleAnalytics = {
  totalViews: 1234,
  uniqueVisitors: 567,
  avgSessionDuration: 180,
  topPages: [
    { path: '/', views: 500 },
    { path: '/posts', views: 300 },
    { path: '/bench', views: 200 },
  ],
  events: [],
}

function BenchPage() {
  return (
    <main>
      <h1 className="text-2xl font-bold mb-2">Bench — 10 components, 5 models</h1>
      <p className="text-sm text-gray-500 mb-6">
        Top row: Deepkit-transformed (typeOf/cast/validate). Bottom row: plain React.
      </p>
      <h2 className="text-lg font-semibold mb-2">Deepkit components</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <UserCard user={sampleUser} />
        <ProductCard product={sampleProduct} />
        <OrderSummary order={sampleOrder} />
        <ConfigPanel />
        <AnalyticsDashboard summary={sampleAnalytics} />
      </div>
      <h2 className="text-lg font-semibold mb-2">Plain components</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Counter label="Counter" />
        <Toggle label="Toggle" />
        <Tabs items={['Tab A', 'Tab B', 'Tab C']} />
        <ProgressBar />
        <SearchBox />
      </div>
    </main>
  )
}

export const Route = createFileRoute('/bench')({
  component: BenchPage,
})
