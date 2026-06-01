import path from 'node:path'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
import { deepkitType } from '@deepkit/vite'
import type { Plugin } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

/**
 * Deepkit type compiler — ONLY for server .ts files.
 * Must be listed before tanstackStart since it uses enforce: 'pre'.
 *
 * Set DEEPKIT_OXC=1 to swap the engine to the experimental Oxc/Rust native addon
 * (`@deepkit/type-compiler-oxc`, linked from the local spike) instead of the official
 * TypeScript transformer. Same `__type` bytecode + same `@deepkit/type` runtime — only the
 * transform engine differs. The addon is loaded lazily so the default path never touches it.
 */
export function deepkitTypeCompiler(): Plugin {
  if (process.env.DEEPKIT_OXC) {
    const { transform } = require('@deepkit/type-compiler-oxc') as {
      transform: (
        code: string,
        filename: string,
        options?: { reflection?: string; tsConfigPath?: string; sourceMaps?: boolean },
      ) => { code: string; map?: string }
    }
    // Same scope as the official plugin below: server .ts only, skip node_modules.
    return {
      name: 'deepkit-type-oxc',
      enforce: 'pre',
      transform(code, id) {
        const file = id.split('?')[0].replace(/\\/g, '/')
        if (!file.endsWith('.ts') || file.includes('/node_modules/')) return null
        if (!file.includes('/server/')) return null
        const reflection = 'default'
        const tsConfigPath: string | undefined = undefined
        // Mirror @deepkit/type-compiler's per-file debug line (gated on DEBUG=deepkit), prefixed
        // [oxc] so the two engines' timings can be A/B compared in the same build output. The
        // `reflection`/`config` fields reflect what this plugin passes the addon; `took` is the
        // measured wall time of the native transform call. Timed with performance.now() for sub-ms
        // precision (the official side's `took` is Date.now()/integer-ms inside @deepkit/type-compiler).
        const start = performance.now()
        const out = transform(code, file, { reflection, tsConfigPath, sourceMaps: true })
        if ((process.env.DEBUG ?? '').includes('deepkit')) {
          const took = performance.now() - start
          console.debug(
            `[oxc] Transform file with reflection=${reflection} took ${took.toFixed(3)}ms (esm) ${file} via config ${tsConfigPath || 'none'}.`,
          )
        }
        return { code: out.code, map: out.map }
      },
    }
  }
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
