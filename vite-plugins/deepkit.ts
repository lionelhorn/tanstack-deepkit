import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { deepkitType, type Options } from '@deepkit/vite'
import type { Plugin } from 'vite'

const root = path.resolve(import.meta.dirname, '..')

/** Widens `@deepkit/vite` Options — upstream types `include`/`exclude` as `string` but arrays work at runtime. */
interface DeepkitTypeOptions extends Omit<Options, 'include' | 'exclude'> {
  include?: string | string[]
  exclude?: string | string[]
}

/**
 * Deepkit type compiler — ONLY for server .ts files.
 * Must be listed before tanstackStart since it uses enforce: 'pre'.
 *
 * Set DEEPKIT_OXC=1 to swap the engine to the Oxc/Rust native addon
 * (`@lionelhorn/deepkit-vite-oxc`) instead of the official `@deepkit/type-compiler`.
 * Same `__type` bytecode + same `@deepkit/type` runtime — only the transform engine
 * differs, so both can be A/B timed against the identical file scope. The oxc package
 * and its ~4 MB native addon are loaded lazily (see `deepkitTypeOxc`), so the default
 * path never touches them.
 */
export function deepkitTypeCompiler(options: DeepkitTypeOptions = {}): Plugin {
  // Both engines transform the same scope (server .ts only) so the A/B timings compare like for like.
  const include = options.include ?? './server/**/*.ts'
  if (process.env.DEEPKIT_OXC) {
    return deepkitTypeOxc({ ...options, include })
  }
  return deepkitType({
    ...options,
    // @ts-expect-error -- upstream types `include`/`exclude` as `string` but arrays work at runtime
    include,
    compilerOptions: { sourceMap: true, ...options.compilerOptions },
  })
}

/** A Rollup `transform` hook in its bare-function form (what `@lionelhorn/deepkit-vite-oxc` returns). */
type TransformFn = (this: unknown, code: string, id: string) => { code: string; map?: string } | null

/**
 * Oxc/Rust engine swap for `deepkitTypeCompiler`, active under `DEEPKIT_OXC=1`.
 *
 * The package is pulled in with a lazy `await import()` in `buildStart`, not at factory time, so
 * it — and its native addon — stays entirely unloaded unless `DEEPKIT_OXC=1`. `@vite-ignore` keeps
 * rolldown from tracing the vendored `.node`. The factory stays synchronous (a Vite Plugin factory
 * cannot be async) by returning a thin wrapper that delegates the package plugin's lone `transform` hook.
 */
function deepkitTypeOxc(options: DeepkitTypeOptions): Plugin {
  // NB: NOT named `transform` — the deepkit reflection build rewrites a plugin's `transform(code, id)`
  // method shorthand into a named function expression whose own name would shadow a same-named local.
  let innerTransform: TransformFn | undefined
  return {
    name: 'deepkit-type-oxc',
    enforce: 'pre',
    async buildStart() {
      const mod = (await import(/* @vite-ignore */ '@lionelhorn/deepkit-vite-oxc')) as {
        deepkitType: (o?: { include?: string | string[]; exclude?: string | string[] }) => Plugin
      }
      // The package owns its own include/exclude filtering; forward the caller's globs. Its plugin
      // has a single bare-function `transform` hook (no buildStart/other hooks), so delegating that
      // one hook is complete. Accept the ObjectHook form defensively in case a future version wraps it.
      const hook = mod.deepkitType({ include: options.include, exclude: options.exclude }).transform as
        | TransformFn
        | { handler: TransformFn }
        | undefined
      innerTransform = typeof hook === 'function' ? hook : hook?.handler
      if (!innerTransform) {
        throw new Error(
          'DEEPKIT_OXC=1 but @lionelhorn/deepkit-vite-oxc deepkitType() returned a plugin with no transform hook. ' +
          'Run pnpm install so the package is wired into devkit.',
        )
      }
    },
    transform(code, id) {
      if (!innerTransform) return null
      const start = performance.now()
      const out = innerTransform.call(this, code, id)
      if (out && (process.env.DEBUG ?? '').includes('deepkit')) {
        const took = performance.now() - start
        const norm = id.split('?')[0].replace(/\\/g, '/')
        console.debug(`[oxc] Transform file with reflection=default took ${took.toFixed(3)}ms (esm) ${norm} via config none.`)
      }
      return out
    },
  }
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
