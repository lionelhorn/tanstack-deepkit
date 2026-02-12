ex# TanStack Start Architecture Analysis for Deepkit Integration

> **Objective:** Integrate Deepkit Framework (DI, runtime types, binary RPC) with TanStack Start in a single Node.js process, replacing server functions with Deepkit RPC (`DirectClient` for SSR, `RpcWebSocketClient` for SPA).

---

## Table of Contents

1. [Codebase Map](#1-codebase-map)
2. [Vite Plugin System](#2-vite-plugin-system)
3. [Isomorphic Loader System & SSR Data Flow](#3-isomorphic-loader-system--ssr-data-flow)
4. [SSR Entry Point & HTTP Server](#4-ssr-entry-point--http-server)
5. [Server/Client Code Separation](#5-serverclient-code-separation)
6. [Middleware System](#6-middleware-system)
7. [Extension Points & Hooks](#7-extension-points--hooks)
8. [Integration Points](#8-concrete-integration-points-for-deepkit)
9. [Identified Obstacles](#9-identified-obstacles)
10. [PoC Action Plan](#10-poc-action-plan)

---

## 1. Codebase Map

### Plugin Vite (build-time)

| File                                                                                                                                                           | Role |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------|------|
| [packages/react-start/src/plugin/vite.ts](packages/react-start/src/plugin/vite.ts#L27)                                                                      | React plugin entry, delegates to core |
| [packages/start-plugin-core/src/plugin.ts](packages/start-plugin-core/src/plugin.ts#L41)                                                                     | Core orchestrator: 8+ sub-plugins, Vite environments |
| [packages/start-plugin-core/src/constants.ts](packages/start-plugin-core/src/constants.ts#L1)                                                                | Constants: `VITE_ENVIRONMENT_NAMES`, `ENTRY_POINTS`, virtual modules |
| [packages/start-plugin-core/src/start-compiler-plugin/compiler.ts](packages/start-plugin-core/src/start-compiler-plugin/compiler.ts#L292)                    | `StartCompiler` -- Babel AST transformation of `createServerFn()` |
| [packages/start-plugin-core/src/start-compiler-plugin/handleCreateServerFn.ts](packages/start-plugin-core/src/start-compiler-plugin/handleCreateServerFn.ts#L1) | RPC stub generation (client/server), SHA256/base64 IDs |
| [packages/start-plugin-core/src/start-compiler-plugin/handleEnvOnly.ts](packages/start-plugin-core/src/start-compiler-plugin/handleEnvOnly.ts#L17)           | `createServerOnlyFn()` / `createClientOnlyFn()` transforms |
| [packages/start-plugin-core/src/start-manifest-plugin/plugin.ts](packages/start-plugin-core/src/start-manifest-plugin/plugin.ts#L61)                         | Virtual module `virtual:tanstack-start-manifest:v` |
| [packages/start-plugin-core/src/dev-server-plugin/plugin.ts](packages/start-plugin-core/src/dev-server-plugin/plugin.ts#L15)                                 | Dev server middleware, HMR |

### Routing & Route Tree

| File | Role |
|------|------|
| [packages/router-generator/src/filesystem/physical/getRouteNodes.ts](packages/router-generator/src/filesystem/physical/getRouteNodes.ts#L39) | Recursive scan of `routes/`, detects `.tsx/.ts/.jsx/.js` |
| [packages/router-plugin/src/core/router-generator-plugin.ts](packages/router-plugin/src/core/router-generator-plugin.ts#L12) | `tanstack:router-generator` -- generates `routeTree.gen.ts` |
| [packages/router-plugin/src/core/constants.ts](packages/router-plugin/src/core/constants.ts#L17) | Code splitting constants (`?tsr-split`) |

### SSR & Hydration

| File | Role |
|------|------|
| [packages/router-core/src/load-matches.ts](packages/router-core/src/load-matches.ts#L617) | `runLoader()` -- direct execution of route loaders |
| [packages/router-core/src/ssr/ssr-server.ts](packages/router-core/src/ssr/ssr-server.ts#L199) | Dehydration: serialization of loader data into `window.$_TSR` |
| [packages/router-core/src/ssr/ssr-client.ts](packages/router-core/src/ssr/ssr-client.ts#L32) | Client-side hydration: restoring matches and data |
| [packages/router-core/src/ssr/transformStreamWithRouter.ts](packages/router-core/src/ssr/transformStreamWithRouter.ts#L100) | Injection of dehydration scripts into HTML stream |
| [packages/router-core/src/ssr/tsrScript.ts](packages/router-core/src/ssr/tsrScript.ts#L1) | Bootstrap script (~300 bytes gzip) |
| [packages/router-core/src/ssr/constants.ts](packages/router-core/src/ssr/constants.ts#L1) | `GLOBAL_TSR = '$_TSR'` |
| [packages/router-core/src/ssr/types.ts](packages/router-core/src/ssr/types.ts#L4) | `DehydratedMatch` interface |

### HTTP Server & Entry Points

| File | Role |
|------|------|
| [packages/react-start/src/default-entry/server.ts](packages/react-start/src/default-entry/server.ts#L1) | Default server entry -- exports WinterCG `fetch()` handler |
| [packages/start-server-core/src/createStartHandler.ts](packages/start-server-core/src/createStartHandler.ts#L353) | Full pipeline: URL -> middleware -> loaders -> dehydrate -> render |
| [packages/start-server-core/src/server-functions-handler.ts](packages/start-server-core/src/server-functions-handler.ts#L38) | Server function request interception (`/_serverFn/{id}`) |
| [packages/start-server-core/src/request-response.ts](packages/start-server-core/src/request-response.ts#L1) | Request/Response abstraction via H3 v2 + AsyncLocalStorage |
| [packages/react-start-server/src/defaultStreamHandler.tsx](packages/react-start-server/src/defaultStreamHandler.tsx#L7) | React streaming SSR (`renderToReadableStream`) |
| [packages/react-start-server/src/StartServer.tsx](packages/react-start-server/src/StartServer.tsx#L1) | `<StartServer>` component (thin `<RouterProvider>` wrapper) |

### Middleware

| File | Role |
|------|------|
| [packages/start-client-core/src/createMiddleware.ts](packages/start-client-core/src/createMiddleware.ts#L1) | `createMiddleware()` -- types, builder pattern, typed context |
| [packages/start-client-core/src/createServerFn.ts](packages/start-client-core/src/createServerFn.ts#L683) | `flattenMiddlewares()` -- dependency resolution, deduplication |
| [packages/start-client-core/src/createStart.ts](packages/start-client-core/src/createStart.ts#L103) | `createStart()` -- global middleware config (request + function) |
| [packages/start-storage-context/src/async-local-storage.ts](packages/start-storage-context/src/async-local-storage.ts#L1) | `AsyncLocalStorage` for per-request context |

### Server/Client Separation

| File | Role |
|------|------|
| [packages/router-core/src/isServer/server.ts](packages/router-core/src/isServer/server.ts#L1) | `export const isServer = true` (resolved via export conditions) |
| [packages/router-core/src/isServer/client.ts](packages/router-core/src/isServer/client.ts#L1) | `export const isServer = false` |
| [packages/start-client-core/src/client-rpc/createClientRpc.ts](packages/start-client-core/src/client-rpc/createClientRpc.ts#L6) | Client stub: HTTP fetch to `/_serverFn/{id}` |
| [packages/start-server-core/src/createServerRpc.ts](packages/start-server-core/src/createServerRpc.ts#L4) | Server wrapper: direct execution + metadata |
| [packages/start-server-core/src/createSsrRpc.ts](packages/start-server-core/src/createSsrRpc.ts#L8) | SSR RPC: in-process import or manifest lookup |

---

## 2. Vite Plugin System

### Plugin Composition Chain

TanStack Start returns **8+ interdependent Vite plugins** from [`TanStackStartVitePluginCore()`](packages/start-plugin-core/src/plugin.ts#L41):

```
1. 'tanstack-start-core:config'           (enforce: 'pre')   -- Environment setup, aliases
2. startCompilerPlugin()                   (enforce: 'pre')   -- Server function AST transforms
3. tanStackStartRouter()                   (enforce: 'pre')   -- Route tree generation
4. loadEnvPlugin()                         (enforce: 'pre')   -- .env file loading
5. startManifestPlugin()                   (enforce: 'pre')   -- Route + asset manifest
6. devServerPlugin()                       (default)          -- Dev server middleware
7. previewServerPlugin()                   (default)          -- Preview mode
8. 'tanstack-start:core:capture-bundle'    (enforce: 'post')  -- Bundle metadata capture
9. 'tanstack-start-core:post-build'        (enforce: 'post')  -- Post-build processing
```

### Vite Environments (Dual Build)

Two separate Vite environments are configured at [plugin.ts#L235](packages/start-plugin-core/src/plugin.ts#L235):

| Environment | Consumer | SSR | Entry Point | Output |
|-------------|----------|-----|-------------|--------|
| `client` | `'client'` | `false` | `virtual:tanstack-start-client-entry` | `dist/client/` |
| `ssr` | `'server'` | `true` | `virtual:tanstack-start-server-entry` | `dist/server/` |

Build order is sequential ([plugin.ts#L311](packages/start-plugin-core/src/plugin.ts#L311)):
1. Client environment builds first
2. Server environment builds second
3. Optional custom provider environment builds last

### Route Tree Generation

The route scanner at [getRouteNodes.ts#L39](packages/router-generator/src/filesystem/physical/getRouteNodes.ts#L39):
- Recursively scans `routesDirectory`
- Accepts `.tsx`, `.ts`, `.jsx`, `.js`, `.vue` files
- Filters by `routeFilePrefix`, `routeFileIgnorePrefix`, `routeFileIgnorePattern`
- Supports virtual routes via `__virtual.ts` files

The generator plugin at [router-generator-plugin.ts#L68](packages/router-plugin/src/core/router-generator-plugin.ts#L68) uses:
- `configResolved` hook to initialize
- `watchChange` hook to regenerate on file changes
- Outputs `routeTree.gen.ts` with TypeScript type declarations

### Server Function Transformation

**Detection patterns** ([compiler.ts#L84](packages/start-plugin-core/src/start-compiler-plugin/compiler.ts#L84)):

```typescript
KindDetectionPatterns = {
  ServerFn:      /\bcreateServerFn\b|\.\s*handler\s*\(/,
  Middleware:    /createMiddleware/,
  IsomorphicFn:  /createIsomorphicFn/,
  ServerOnlyFn:  /createServerOnlyFn/,
  ClientOnlyFn:  /createClientOnlyFn/,
  ClientOnlyJSX: /<ClientOnly|import\s*\{[^}]*\bClientOnly\b/,
}
```

**Per-environment transformation** ([handleCreateServerFn.ts#L87](packages/start-plugin-core/src/start-compiler-plugin/handleCreateServerFn.ts#L87)):

| Build Target | Replacement | Effect |
|--------------|-------------|--------|
| Client | `createClientRpc(functionId)` | HTTP fetch stub, handler code removed |
| Server (provider) | `createServerRpc({id, name, filename}, fn)` | Full handler preserved |
| SSR (caller) | `createSsrRpc(functionId, () => import(...))` | In-process import |

**Function ID generation** ([compiler.ts#L362](packages/start-plugin-core/src/start-compiler-plugin/compiler.ts#L362)):
- **Dev mode:** Base64url-encoded JSON `{file, export}` for readable debugging
- **Build mode:** SHA256 hash of `filename--functionName`, deduplication with `_N` suffix
- **Custom:** `serverFns.generateFunctionId` option in config

**Code extraction:** Uses query parameter `?tss-serverfn-split` to separate handler into its own module ([handleCreateServerFn.ts#L9](packages/start-plugin-core/src/start-compiler-plugin/handleCreateServerFn.ts#L9)).

### Virtual Modules

| Module ID | Plugin | Purpose |
|-----------|--------|---------|
| `virtual:tanstack-start-manifest:v` | [start-manifest-plugin](packages/start-plugin-core/src/start-manifest-plugin/plugin.ts#L68) | Route + chunk manifest |
| `#tanstack-start-server-fn-resolver` | [start-compiler-plugin](packages/start-plugin-core/src/start-compiler-plugin/plugin.ts#L369) | Server function manifest |
| `virtual:tanstack-start-client-entry` | config alias | Client entry point |
| `virtual:tanstack-start-server-entry` | config alias | Server entry point |
| `#tanstack-start-entry` | config alias | User's `start.ts` |
| `#tanstack-router-entry` | config alias | User's `router.ts` |

---

## 3. Isomorphic Loader System & SSR Data Flow

### Server-Side Loader Execution

Loaders are executed as **direct function calls**, not through the server function mechanism.

The core execution happens in [`runLoader()`](packages/router-core/src/load-matches.ts#L617):

```typescript
// load-matches.ts:639
const loaderResult = route.options.loader?.(
  getLoaderContext(inner, matchId, index, route),
)
```

The loader context ([load-matches.ts#L584](packages/router-core/src/load-matches.ts#L584)) provides:
- `params` -- Route parameters
- `deps` -- Loader dependencies
- `context` -- Route context chain
- `preload` -- Preload mode flag
- `abortController` -- For cancellation
- `location` -- Current URL location

When a loader **calls a server function** during SSR, the server function resolves via [`createSsrRpc()`](packages/start-server-core/src/createSsrRpc.ts#L8) which imports and calls the handler **in-process** (zero network overhead):

```typescript
// createSsrRpc.ts:8-26
const fn = async (...args) => {
  const serverFn = importer
    ? await importer()           // Direct import, in-process
    : await getServerFnById(id)  // Manifest lookup
  return serverFn(...args)
}
```

### Data Serialization for Hydration

The dehydration process at [ssr-server.ts#L199](packages/router-core/src/ssr/ssr-server.ts#L199) serializes loader data into `window.$_TSR`:

**Dehydrated match structure** ([types.ts#L4](packages/router-core/src/ssr/types.ts#L4)):

```typescript
interface DehydratedMatch {
  i: string          // Match ID
  b?: any            // beforeLoad context
  l?: any            // Loader data        <-- KEY FIELD
  e?: any            // Error
  u: number          // updatedAt timestamp
  s: string          // Match status
  ssr?: SSROption    // SSR mode
}
```

**Serialization library:** [seroval](https://github.com/niconiahi/seroval) with custom adapters.

**Bootstrap script** ([tsrScript.ts#L1](packages/router-core/src/ssr/tsrScript.ts#L1)):

```typescript
self.$_TSR = {
  h()       { /* hydration complete */ },
  e()       { /* stream ended */ },
  c()       { /* cleanup when both done */ },
  p(script) { /* buffer or execute deserialization scripts */ },
  buffer: [],
}
```

**Injection into HTML stream** via [transformStreamWithRouter.ts#L100](packages/router-core/src/ssr/transformStreamWithRouter.ts#L100) -- finds last closing tag and injects serialized state before `</body>`.

### Client-Side Hydration

[`hydrate()`](packages/router-core/src/ssr/ssr-client.ts#L32) restores match data:

```typescript
// ssr-client.ts:19-30
function hydrateMatch(match, dehydratedMatch) {
  match.loaderData = dehydratedMatch.l   // Restore loader data
  match.status = dehydratedMatch.s
  match.error = dehydratedMatch.e
  // ...
}
```

### SPA Navigation: Loader Re-Execution

During client-side navigation, **the same loader function re-executes** on the client ([load-matches.ts#L638](packages/router-core/src/load-matches.ts#L638)). If the loader contains server function calls, the **client stub** (HTTP fetch) takes over.

The swap happens via the [`ServerFunctionSerializationAdapter`](packages/start-client-core/src/client/ServerFunctionSerializationAdapter.ts#L5):

```typescript
// ServerFunctionSerializationAdapter.ts:5-16
{
  key: '$TSS/serverfn',
  test: (v) => typeof v === 'function' && TSS_SERVER_FUNCTION in v,
  toSerializable: ({ serverFnMeta }) => ({ functionId: serverFnMeta.id }),
  fromSerializable: ({ functionId }) => createClientRpc(functionId),  // HTTP stub
}
```

So during SSR, a server function is serialized as `{ functionId: 'abc123' }`, and on the client it's reconstructed as an HTTP-calling stub via [`createClientRpc()`](packages/start-client-core/src/client-rpc/createClientRpc.ts#L6).

### React Start Hydration Entry

[`hydrateStart()`](packages/react-start-client/src/hydrateStart.ts#L11) orchestrates client-side startup:
1. Gets the router instance
2. Registers serialization adapters (including `ServerFunctionSerializationAdapter`)
3. Calls `hydrate(router)` to restore dehydrated state
4. Returns the router for React rendering

---

## 4. SSR Entry Point & HTTP Server

### WinterCG Fetch Handler

TanStack Start exports a **standard WinterCG `fetch(request) => Response` handler**. Nitro is **NOT required** at runtime.

Default entry at [server.ts](packages/react-start/src/default-entry/server.ts):

```typescript
const fetch = createStartHandler(defaultStreamHandler)
export default createServerEntry({ fetch })
```

Handler type ([request-handler.ts#L22](packages/start-server-core/src/request-handler.ts#L22)):

```typescript
type RequestHandler<TRegister> = (
  request: Request,
  opts?: RequestOptions<TRegister>,
) => Promise<Response> | Response
```

### Request Processing Pipeline

Full pipeline in [`createStartHandler()`](packages/start-server-core/src/createStartHandler.ts#L424):

```
1. URL normalization                               (line 435)
2. Server function interception (/_serverFn/*)      (line 501)
3. Global request middleware execution              (line 532)
4. Manifest resolution + CDN transforms            (line 560)
5. SSR utils attachment                            (line 567)
6. Router context update                           (line 572)
7. Route loader execution (router.load())          (line 573)
8. Redirect handling                               (line 575)
9. State dehydration                               (line 579)
10. Render callback (stream or string)             (line 586)
```

### Nitro as Production Server

Core dependencies have **zero Nitro/Vinxi** references ([start-server-core/package.json](packages/start-server-core/package.json#L77)), but nitro is the **recommended production server** for TanStack Start (all official examples use it).

Nitro integration via `nitro/vite` plugin provides:
- **Static file serving** from `.output/public/` (critical — without it, assets return 404)
- **WebSocket support** via crossws (`defineWebSocketHandler` from `nitro/h3`)
- **Deployment presets** (node-server, cloudflare, vercel, etc.)
- **Route handlers** via `handlers` config or filesystem scanning (`server/routes/`)

In `start-bare`, nitro is configured with:
```typescript
nitro({
  experimental: { websocket: true } as any,
  handlers: [
    { route: '/rpc', handler: './server/routes/rpc.ts' },
  ],
})
```

Note: filesystem auto-scanning of `server/routes/` did NOT work with the TanStack Start vite plugin integration. Routes must be registered explicitly via `handlers` config.

### Custom Server Examples

- **Bun:** [examples/react/start-bun/server.ts](start-bun/server.ts) -- calls `handler.fetch(req)` directly
- **Express:** [examples/react/basic-ssr-file-based/server.js](basic-ssr-file-based/server.js#L54) -- custom middleware wrapping

### AsyncLocalStorage for Request Context

[request-response.ts](packages/start-server-core/src/request-response.ts#L46) uses `AsyncLocalStorage<H3Event>` for per-request isolation. Utilities exported:

- `getRequest()`, `getRequestHeaders()`, `getRequestIP()`
- `getCookies()`, `setCookie()`, `deleteCookie()`
- `getSession()`, `updateSession()`
- `setResponseHeaders()`, `setResponseStatus()`

---

## 5. Server/Client Code Separation

### Mechanism: Vite Environments API (Not Runtime Checks)

TanStack Start does **NOT** use `import.meta.env.SSR` or `typeof window === 'undefined'` at runtime. Instead, it uses Vite's **Environments API** to produce completely separate builds with different AST transformations.

Configuration at [plugin.ts#L235](packages/start-plugin-core/src/plugin.ts#L235):

```typescript
environments: {
  client: { consumer: 'client', build: { outDir: 'dist/client' } },
  ssr:    { consumer: 'server', build: { ssr: true, outDir: 'dist/server' } },
}
```

### Per-Environment Compiler Instances

The [`startCompilerPlugin()`](packages/start-plugin-core/src/start-compiler-plugin/plugin.ts#L215) creates separate `StartCompiler` instances per environment:

```typescript
// Per-environment via applyToEnvironment
{
  name: 'tanstack-start-core::server-fn:{envName}',
  enforce: 'pre',
  applyToEnvironment: (env) => isValidEnv(env.name),
  transform(code, id) {
    const kinds = detectKindsInCode(code, this.environment.name)
    if (kinds.size === 0) return null
    return compiler.compile(code, id, kinds)
  }
}
```

### Supported Patterns

| Pattern | Client Build | Server Build |
|---------|-------------|-------------|
| `createServerFn().handler(fn)` | `createClientRpc(id)` -- HTTP stub | `createServerRpc(meta, fn)` -- full impl |
| `createServerOnlyFn(fn)` | `() => { throw Error(...) }` | `fn` -- unwrapped |
| `createClientOnlyFn(fn)` | `fn` -- unwrapped | `() => { throw Error(...) }` |
| `createIsomorphicFn().server(a).client(b)` | `b` only | `a` only |
| `<ClientOnly>children</ClientOnly>` | Unchanged | Children removed |

Handler code: [handleEnvOnly.ts#L17](packages/start-plugin-core/src/start-compiler-plugin/handleEnvOnly.ts#L17), [handleClientOnlyJSX.ts#L20](packages/start-plugin-core/src/start-compiler-plugin/handleClientOnlyJSX.ts#L20)

### Dead Code Elimination

After AST transforms, [babel-dead-code-elimination](packages/router-utils/src/ast.ts#L136) removes unreachable branches:

```typescript
// router-utils/src/ast.ts:136-159
export function deadCodeElimination(ast, candidates) {
  stripTypeExports(ast)
  _deadCodeElimination(ast, candidates)
}
```

Called at [compiler.ts#L945](packages/start-plugin-core/src/start-compiler-plugin/compiler.ts#L945).

### Build-Time Constants

[plugin.ts#L294](packages/start-plugin-core/src/plugin.ts#L294) defines build-time replacements:

```typescript
define: {
  'process.env.TSS_SERVER_FN_BASE': '"/_serverFn/"',
  'process.env.TSS_ROUTER_BASEPATH': '"/"',
  'process.env.NODE_ENV': '"production"',  // enables bundler tree-shaking
}
```

### Package.json Export Conditions

[router-core/package.json#L71](packages/router-core/package.json#L71) uses per-environment exports:

```json
"./isServer": {
  "browser": "./dist/esm/isServer/client.js",
  "node": "./dist/esm/isServer/server.js"
}
```

This ensures `isServer` is `true` on Node.js and `false` in the browser, enabling bundler-level dead code elimination without runtime checks.

---

## 6. Middleware System

### `createMiddleware()` Definition

[createMiddleware.ts#L34](packages/start-client-core/src/createMiddleware.ts#L34) returns a builder with fluent API:

```typescript
createMiddleware({ type: 'request' | 'function' })
  .middleware([...deps])
  .inputValidator(schema)
  .client(async (ctx) => { ... })
  .server(async (ctx) => { ... })
```

Two types:
- **Request middleware** (`type: 'request'`, default) -- executes for every HTTP request, `.server()` only
- **Function middleware** (`type: 'function'`) -- executes per server function call, `.client()` + `.server()`

### Context Propagation

Context flows via typed objects through `next()`:

```typescript
.server(async ({ request, context, next }) => {
  return next({
    context: { userId: 'user-123', authenticated: true }
  })
})
```

Context is safely merged via `safeObjectMerge()` to prevent prototype pollution ([createServerFn.ts#L254](packages/start-client-core/src/createServerFn.ts#L254)).

### Execution Levels

| Level | When | Config Location |
|-------|------|-----------------|
| **Per HTTP request** | Every request, before routing | `createStart({ requestMiddleware: [...] })` |
| **Per server function** | Each `createServerFn()` invocation | `createStart({ functionMiddleware: [...] })` or `.middleware([...])` |
| **Per loader** | Via server functions called in loader | Implicit -- middleware of the called server fn |

Request middleware execution: [createStartHandler.ts#L529](packages/start-server-core/src/createStartHandler.ts#L529)
Function middleware execution: [createServerFn.ts#L190](packages/start-client-core/src/createServerFn.ts#L190)

### Dependency Flattening & Deduplication

[`flattenMiddlewares()`](packages/start-client-core/src/createServerFn.ts#L683):
- Recursively resolves middleware dependencies (depth-first)
- Deduplicates via `Set<Middleware>`
- Max depth 100 (circular reference protection)
- Global middleware executes first, then function-specific

Deduplication of request middleware already executed is tracked via `executedRequestMiddlewares` Set ([createServerFn.ts#L201](packages/start-client-core/src/createServerFn.ts#L201)).

### Per-Request Isolation

[AsyncLocalStorage](packages/start-storage-context/src/async-local-storage.ts#L1) provides per-request context:

```typescript
interface StartStorageContext {
  getRouter: () => Awaitable<RegisteredRouter>
  request: Request
  startOptions: any
  contextAfterGlobalMiddlewares: any
  executedRequestMiddlewares: Set<any>
}
```

Each request runs inside `runWithStartContext()` ([createStartHandler.ts#L595](packages/start-server-core/src/createStartHandler.ts#L595)).

---

## 7. Extension Points & Hooks

### Vite Plugin Hooks Used by TanStack Start

| Hook | Plugin | Enforce | Extensible By |
|------|--------|---------|---------------|
| `config` | [config](packages/start-plugin-core/src/plugin.ts#L104) | `pre` | Earlier `pre` plugin |
| `configEnvironment` | [react-start](packages/react-start/src/plugin/vite.ts#L33) | -- | Per-env config |
| `configResolved` | [compiler](packages/start-plugin-core/src/start-compiler-plugin/plugin.ts#L228) | `pre` | Any resolved hook |
| `transform` | [compiler](packages/start-plugin-core/src/start-compiler-plugin/plugin.ts#L232) | `pre` | Chained plugins |
| `resolveId` | [manifest](packages/start-plugin-core/src/start-manifest-plugin/plugin.ts#L68) | `pre` | Override virtual modules |
| `load` | [manifest](packages/start-plugin-core/src/start-manifest-plugin/plugin.ts#L77) | `pre` | Load virtual modules |
| `configureServer` | [dev-server](packages/start-plugin-core/src/dev-server-plugin/plugin.ts#L44) | -- | Add dev middleware |
| `generateBundle` | [capture](packages/start-plugin-core/src/plugin.ts#L396) | `post` | Post-build hooks |
| `buildApp` | [post-build](packages/start-plugin-core/src/plugin.ts#L359) | `post` | Build orchestration |

### Runtime Router Events

[router.ts#L561](packages/router-core/src/router.ts#L561):

```typescript
interface RouterEvents {
  onBeforeNavigate: NavigationEventInfo
  onBeforeLoad: NavigationEventInfo
  onLoad: NavigationEventInfo
  onResolved: NavigationEventInfo
  onBeforeRouteMount: NavigationEventInfo
  onRendered: NavigationEventInfo
  onInjectedHtml: { type: 'onInjectedHtml' }
  onSerializationFinished: { type: 'onSerializationFinished' }
}
```

Subscribe via `router.subscribe('onBeforeLoad', fn)`.

### SSR Lifecycle Hooks

[router.ts#L761](packages/router-core/src/router.ts#L761):

```typescript
interface ServerSsr {
  injectHtml(html: string): void
  injectScript(script: string): void
  onRenderFinished(listener: () => void): void
  onSerializationFinished(listener: () => void): void
  dehydrate(): Promise<void>
  liftScriptBarrier(): void
}
```

### `createRouter()` Options

Key options from [router.ts#L154](packages/router-core/src/router.ts#L154):

| Option | Type | Purpose |
|--------|------|---------|
| `context` | `InferRouterContext<TRouteTree>` | Global context for all routes |
| `dehydrate` | `() => TDehydrated` | Custom state serialization for SSR |
| `hydrate` | `(data) => void` | Custom state deserialization on client |
| `serializationAdapters` | `Array<AnySerializationAdapter>` | Custom type serialization |
| `defaultSsr` | `true \| false \| 'data-only'` | Default SSR mode |
| `basepath` | `string` | Router base path |

### Serialization Adapters

[transformer.ts#L42](packages/router-core/src/ssr/serializer/transformer.ts#L42):

```typescript
createSerializationAdapter({
  key: string,
  test: (value: unknown) => value is TInput,
  toSerializable: (value: TInput) => TOutput,
  fromSerializable: (value: TOutput) => TInput,
})
```

### App Configuration Schema

[schema.ts#L129](packages/start-plugin-core/src/schema.ts#L129):

```typescript
{
  srcDirectory: 'src',
  router: { entry, basepath, routesDirectory, generatedRouteTree },
  client: { entry, base },
  server: { entry, build: { staticNodeEnv } },
  serverFns: { base, generateFunctionId },
  vite: { installDevServerMiddleware },
}
```

### Server Route Handlers

[serverRoute.ts#L135](packages/start-client-core/src/serverRoute.ts#L135) -- routes can define HTTP method handlers:

```typescript
export const Route = createFileRoute('/api/users').createRoute({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ request }) => new Response(JSON.stringify(users)),
      POST: async ({ request }) => { /* ... */ },
    }
  }
})
```

---

## 8. Concrete Integration Points for Deepkit

### A. Custom HTTP Server with Deepkit WebSocket

TanStack Start exports a WinterCG `fetch()` handler. No Nitro needed. Create a custom server:

```typescript
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { RpcKernel } from '@deepkit/rpc'

const tsHandler = await import('./dist/server/server.js').then(m => m.default)
const kernel = new RpcKernel()
kernel.registerController(MyController)

const server = createServer(async (req, res) => {
  const request = toWinterCGRequest(req)
  const response = await tsHandler.fetch(request)
  writeResponseToNode(response, res)
})

const wss = new WebSocketServer({ server, path: '/rpc' })
wss.on('connection', (ws) => {
  kernel.createConnection(new NodeWebSocketAdapter(ws))
})

server.listen(3000)
```

Key file: [default-entry/server.ts](packages/react-start/src/default-entry/server.ts)
Example: [examples/react/start-bun/server.ts](start-bun/server.ts)

### B. Request Middleware for Deepkit DI Scope

```typescript
export const deepkitMiddleware = createMiddleware({ type: 'request' })
  .server(async ({ next, request }) => {
    const scope = diContainer.createScope()
    scope.set(Request, request)
    return next({ context: { diScope: scope } })
  })
```

Key file: [createMiddleware.ts#L34](packages/start-client-core/src/createMiddleware.ts#L34)
Per-request isolation via: [async-local-storage.ts](packages/start-storage-context/src/async-local-storage.ts)

### C. Router Context for Deepkit Client

```typescript
const router = createRouter({
  routeTree,
  context: { deepkitClient: isomorphicClient },
})
```

Key file: [router.ts#L318](packages/router-core/src/router.ts#L318)

### D. Conditional Vite Aliases for Isomorphic Transport

The plugin configures two environments with `configEnvironment`. Add a custom plugin:

```typescript
{
  name: 'deepkit-transport-alias',
  configEnvironment(name, config) {
    const alias = name === 'ssr'
      ? './src/rpc/transport.server.ts'
      : './src/rpc/transport.client.ts'
    config.resolve = config.resolve || {}
    config.resolve.alias = { ...config.resolve.alias, '~/rpc/transport': alias }
  }
}
```

Key file: [plugin.ts#L235](packages/start-plugin-core/src/plugin.ts#L235) -- environment config

### E. Serialization Adapter for Deepkit DTOs

```typescript
const deepkitAdapter = createSerializationAdapter({
  key: 'deepkit-dto',
  test: (v) => isDeepkitSerializable(v),
  toSerializable: (dto) => serialize(dto),
  fromSerializable: (data) => deserialize(data),
})

const router = createRouter({ routeTree, serializationAdapters: [deepkitAdapter] })
```

Key file: [transformer.ts#L42](packages/router-core/src/ssr/serializer/transformer.ts#L42)

### F. Custom Server Entry for `/rpc` Interception

```typescript
// src/entry-server.ts
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const defaultHandler = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/rpc')) {
      return handleDeepkitRpc(request)
    }
    return defaultHandler(request)
  }
}
```

Configure via `server.entry` in app config ([schema.ts#L167](packages/start-plugin-core/src/schema.ts#L167)).

### G. Dev + Prod WebSocket via Nitro Route Handler

Instead of a separate Vite plugin for dev WebSocket, the same nitro route handler (`server/routes/rpc.ts`) handles `/rpc` in both dev and production. This was unified by having a shared Deepkit App instance (`server/app.ts`) that provides the `RpcConnectionService` via DI. The handler uses `defineWebSocketHandler` from `nitro/h3` with the crossws peer API.

```typescript
// server/routes/rpc.ts
import { defineWebSocketHandler } from 'nitro/h3'
import { app } from '../app.js'
import { RpcConnectionService } from '../services/rpc-connection.service.js'

const rpcConnections = app.get(RpcConnectionService)

export default defineWebSocketHandler({
  open(peer) {
    rpcConnections.open(peer, {
      writeBinary(message: Uint8Array) { peer.send(message) },
      close() { peer.close() },
    })
  },
  message(peer, message) { /* ... feed data ... */ },
  close(peer) { rpcConnections.close(peer) },
})
```

Key config: nitro must be configured with `handlers: [{ route: '/rpc', handler: './server/routes/rpc.ts' }]` — filesystem auto-scanning did NOT work with TanStack Start.

---

## 9. Identified Obstacles

### Obstacle 1: `@deepkit/vite` and `.tsx` Files

The Deepkit Vite plugin uses `ts.transpileModule()` which destroys JSX before `@vitejs/plugin-react` can instrument it (breaks Fast Refresh / HMR).

**Solution:** Configure `@deepkit/vite` to process only `server/**/*.ts` files, excluding `.tsx`.

### Obstacle 2: Loaders Are NOT Server Functions

Loaders execute as **direct function calls** ([load-matches.ts#L639](packages/router-core/src/load-matches.ts#L639)), not via the server function mechanism. During SPA navigation, the **same loader function re-executes on the client**. If a loader calls Deepkit directly (without a `createServerFn` wrapper), **server code will leak into the client bundle**.

**Solutions (pick one):**
1. Wrap Deepkit calls in `createIsomorphicFn().server(...).client(...)` -- compiler handles tree-shaking
2. Use Vite aliases (`~/rpc/transport`) to resolve to `DirectClient` on server and `RpcWebSocketClient` on client
3. Wrap Deepkit calls in `createServerOnlyFn()` (but this throws on client -- not suitable for SPA nav)

**Recommended:** Vite aliases (option 2) -- cleanest approach, no wrappers needed.

### Obstacle 3: Serialization of Loader Data

TanStack Start uses **seroval** to serialize loader data into HTML. Complex Deepkit objects (classes, Map, Set, etc.) need a custom `SerializationAdapter`. Without one, only JSON-safe types serialize correctly.

**Solution:** Create a `deepkitAdapter` as shown in [section E above](#e-serialization-adapter-for-deepkit-dtos).

### Obstacle 4: WebSocket in Dev Mode

Vite already uses a WebSocket for HMR (`/__vite_hmr`). Adding a second WebSocket (`/rpc`) requires intercepting `upgrade` events on the same HTTP server, routing by path.

**Solution:** Use `configureServer` hook to attach upgrade handler on `/rpc` path (Vite HMR uses a different path).

### Obstacle 5: No Automatic Tree-Shaking for Arbitrary Server Code

The TanStack Start compiler only recognizes patterns listed in [`KindDetectionPatterns`](packages/start-plugin-core/src/start-compiler-plugin/compiler.ts#L84). A bare `import { db } from './database'` in a loader **will NOT** be eliminated from the client bundle.

**Solution:** Use Vite conditional aliases so that `~/rpc/transport` resolves to different files per environment. The bundler only sees the client transport in the client build.

### Obstacle 6: No Loader-Specific Event Hooks

There is no `onBeforeLoader` / `onAfterLoader` hook. Router events (`onBeforeLoad`, `onLoad`) relate to navigation, not individual loader invocation. Context injection into loaders happens only via `createRouter({ context })` and `beforeLoad` in routes.

**Solution:** Use request middleware to inject Deepkit scope into the router context, then access it in loaders via `context.diScope`.

---

## 10. PoC Implementation

**Implemented and verified in `examples/react/start-bare/`.** Both dev mode and production build are fully working:

- **Dev + prod:** Same nitro WebSocket handler (`server/routes/rpc.ts`) handles `/rpc` in both modes via shared Deepkit App instance
- **SSR:** `DirectClient` calls controllers in-process (verified via `source=ssr` logging)
- **SPA navigation:** `RpcWebSocketClient` calls controllers via WebSocket (verified via `source=client` logging)
- **DI:** `RpcConnectionService` manages WebSocket connection lifecycle, injected by Deepkit DI

See `work/DEEPKIT_RPC_PLAN.md` for findings, pitfalls, and production deployment details.

---

## Summary

TanStack Start's architecture is highly modular and extensible:

- **WinterCG-standard fetch handler** -- works with any HTTP server, nitro recommended for production
- **Vite Environments API** -- true dual build (client + server), not runtime checks
- **Compiler-based code separation** -- Babel AST transforms per environment
- **Typed middleware system** -- per-request + per-function, with AsyncLocalStorage isolation
- **Serialization adapter pattern** -- extensible for custom types
- **Virtual module system** -- clean injection points for custom modules

The primary integration strategy for Deepkit is **Vite conditional aliases** for isomorphic transport resolution, **nitro** for static file serving and WebSocket support in both dev and production (via `defineWebSocketHandler` route handler at `server/routes/rpc.ts`), a **shared Deepkit App instance** (`server/app.ts`) providing DI for all environments, and optional **request middleware** for DI scope injection.
