import { useState } from 'react'
import { typeOf, validate, ReflectionKind } from '@deepkit/type'
import type { AnalyticsSummary, PageView } from '~/models/analytics'

const summaryType = typeOf<AnalyticsSummary>()
const pageViewType = typeOf<PageView>()

export function AnalyticsDashboard({ summary }: { summary: AnalyticsSummary }) {
  const [tab, setTab] = useState<'overview' | 'pages'>('overview')
  const errors = validate<AnalyticsSummary>(summary)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">Analytics</h3>
      <div className="flex gap-2 mt-1">
        <button onClick={() => setTab('overview')} className={`text-xs ${tab === 'overview' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>Overview</button>
        <button onClick={() => setTab('pages')} className={`text-xs ${tab === 'pages' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>Pages</button>
      </div>
      {tab === 'overview' ? (
        <div className="text-sm mt-1">
          <p>{summary.totalViews} views, {summary.uniqueVisitors} unique</p>
          <p className="text-xs text-gray-400">Types: {ReflectionKind[summaryType.kind]}, {ReflectionKind[pageViewType.kind]}</p>
        </div>
      ) : (
        <ul className="text-sm mt-1">
          {summary.topPages.slice(0, 3).map(p => (
            <li key={p.path}>{p.path}: {p.views}</li>
          ))}
        </ul>
      )}
      {errors.length > 0 && <p className="text-xs text-red-500 mt-1">{errors.length} validation error(s)</p>}
    </div>
  )
}
