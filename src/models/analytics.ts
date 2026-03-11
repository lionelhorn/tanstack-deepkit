export interface PageView {
  path: string
  timestamp: number
  referrer: string | null
  sessionId: string
}

export interface AnalyticsEvent {
  name: string
  properties: Record<string, string | number | boolean>
  timestamp: number
  userId: string | null
}

export interface AnalyticsSummary {
  totalViews: number
  uniqueVisitors: number
  avgSessionDuration: number
  topPages: Array<{ path: string; views: number }>
  events: AnalyticsEvent[]
}
