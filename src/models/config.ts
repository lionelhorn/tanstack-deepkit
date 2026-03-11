export interface FeatureFlag {
  key: string
  enabled: boolean
  rolloutPercent: number
}

export interface AppConfig {
  apiUrl: string
  debug: boolean
  maxRetries: number
  features: FeatureFlag[]
  theme: {
    primary: string
    secondary: string
    mode: 'light' | 'dark'
  }
}
