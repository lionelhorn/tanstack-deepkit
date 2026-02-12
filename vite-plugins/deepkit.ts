import path from 'node:path'
import { deepkitType } from '@deepkit/vite'
import type { Plugin } from 'vite'

const root = path.resolve(import.meta.dirname, '..')

/**
 * Deepkit type compiler — ONLY for server .ts files.
 * Must be listed before tanstackStart since it uses enforce: 'pre'.
 */
export function deepkitTypeCompiler(): Plugin {
  return deepkitType({
    include: './server/**/*.ts',
    compilerOptions: { sourceMap: true },
  })
}

/**
 * Conditional alias: ~/rpc/transport resolves per Vite environment.
 * - SSR: transport.server.ts (DirectClient, in-process)
 * - Client: transport.client.ts (RpcWebSocketClient, WebSocket)
 */
export function deepkitTransportAlias(): Plugin {
  return {
    name: 'deepkit-transport-alias',
    enforce: 'pre',
    resolveId(id) {
      if (id === '~/rpc/transport') {
        const env = this.environment.name
        const resolved =
          env === 'ssr'
            ? path.resolve(root, 'src/rpc/transport.server.ts')
            : path.resolve(root, 'src/rpc/transport.client.ts')
        console.log(`[deepkit-transport-alias] env=${env} → ${resolved}`)
        return resolved
      }
    },
  }
}
