import { useState } from 'react'
import { cast } from '@deepkit/type'
import type { AppConfig } from '~/models/config'

const defaultConfig = cast<AppConfig>({
  apiUrl: 'http://localhost:3000',
  debug: false,
  maxRetries: 3,
  features: [{ key: 'darkMode', enabled: true, rolloutPercent: 100 }],
  theme: { primary: '#3b82f6', secondary: '#64748b', mode: 'light' },
})

export function ConfigPanel() {
  const [config, setConfig] = useState(defaultConfig)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">Config</h3>
      <p className="text-sm">API: {config.apiUrl}</p>
      <p className="text-sm">Theme: {config.theme.mode}</p>
      <button
        onClick={() => setConfig({ ...config, debug: !config.debug })}
        className="text-xs text-blue-500 mt-1"
      >
        Debug: {config.debug ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
