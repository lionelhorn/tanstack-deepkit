import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import type { ViteInspectAPI } from 'vite-plugin-inspect'

const OUTPUT_PATH = 'tmp/inspect-metrics.json'

function getInspectApi(server: ViteDevServer): ViteInspectAPI | undefined {
  const plugin = server.config.plugins.find(
    (p) => p.name === 'vite-plugin-inspect',
  )
  const api = (plugin as any)?.api as ViteInspectAPI | undefined
  return api?.rpc ? api : undefined
}

export function perfInspect(): Plugin {
  return {
    name: 'perf-inspect',

    configureServer(server) {
      const originalClose = server.close.bind(server)
      server.close = async () => {
        const api = getInspectApi(server)
        if (api) {
          try {
            const metadata = await api.rpc.getMetadata()
            const query = {
              vite: metadata.instances[0].vite,
              env: metadata.instances[0].environments[0],
            }
            const [pluginMetrics, modules] = await Promise.all([
              api.rpc.getPluginMetrics(query),
              api.rpc.getModulesList(query),
            ])
            const outDir = path.dirname(OUTPUT_PATH)
            if (!fs.existsSync(outDir))
              fs.mkdirSync(outDir, { recursive: true })
            fs.writeFileSync(
              OUTPUT_PATH,
              JSON.stringify({ pluginMetrics, modules }, null, 2),
            )
            console.log(`[perf-inspect] Metrics written to ${OUTPUT_PATH}`)
          } catch (err) {
            console.warn('[perf-inspect] Failed to dump metrics:', err)
          }
        }
        return originalClose()
      }
    },
  }
}
