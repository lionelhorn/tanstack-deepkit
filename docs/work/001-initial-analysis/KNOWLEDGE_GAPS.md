# Knowledge Gaps — start-bare Deepkit Integration

Areas requiring lookup outside `examples/react/start-bare/` before full understanding.

---

## 1. ~~TanStack Start Server Entry & Handler Pipeline~~ ✅ RESOLVED

Custom `src/server.ts` and `src/client.tsx` now exist. The server entry uses `createServerEntry` from `@tanstack/react-start/server-entry` which wraps the default `handler.fetch()`. Production builds to `.output/server/index.mjs` via nitro. The handler pipeline is documented in `work/DEEPKIT_INTEGRATION_ANALYSIS.md` section 4.

## 2. ~~SSR Hydration Cycle for Loader Data~~ ✅ RESOLVED

Verified working. Plain objects with JSON-safe types (the `Post[]` array from `PostService.getAll()`) survive the SSR → hydration roundtrip without a custom `SerializationAdapter`. TanStack Start uses seroval to serialize into `window.$_TSR`. On initial page load, data shows `[ssr]` prefix from the controller; after client-side navigation, data shows `[client]` prefix — confirming the full cycle works.

## 3. ~~Loader Re-execution on SPA Navigation~~ ✅ RESOLVED

Verified working. When the user clicks "Posts" (client-side navigation), the loader re-executes in the browser. `RpcWebSocketClient` connects to `ws://localhost:3000/rpc`, the nitro WebSocket handler bridges to `kernel.createConnection()`, and the controller returns data with `[client]` prefix. The loader always re-executes on SPA navigation (no caching observed in default config).

## 4. ~~Vite Environment Runner~~ ✅ RESOLVED (no longer used)

The `deepkitRpcDev()` Vite plugin was removed. Dev and prod now both use the same nitro WebSocket handler (`server/routes/rpc.ts`) with a shared Deepkit App instance (`server/app.ts`). No more lazy kernel loading via `server.environments.ssr.runner.import()`.

## 5. `@deepkit/vite` Type Compilation

`deepkitType({ include: './server/**/*.ts' })` calls `ts.transpileModule()` internally. How it emits reflection metadata, what AST transforms it applies, how it interacts with TypeScript's `experimentalDecorators` — all lives in `@deepkit/vite` and `@deepkit/type-compiler` source. The work doc notes it destroys JSX (hence the `.ts`-only filter), but exactly what it produces and how the `reflection: true` tsconfig flag interacts with it isn't visible.

## 6. Deepkit DI Container Bootstrap (`app.get(RpcKernel)`)

`server/app.ts` does `new App({ controllers, providers, imports })` then `app.get(RpcKernel)`. The App also provides `RpcConnectionService` (which depends on `RpcKernel` via constructor injection). How `App` builds the DI container, how `FrameworkModule` auto-registers `@rpc.controller()` classes with the `RpcKernel`, how `PostService` gets `Logger` injected — all lives in `@deepkit/app`, `@deepkit/framework`, and `@deepkit/injector`.

## 7. `RpcKernel.createConnection()` Protocol

The `TransportConnection` interface (`writeBinary`, `close`, `bufferedAmount`, `clientAddress`) and the returned connection's `feed()`/`close()` methods are Deepkit internals. The binary protocol (BSON-based?) and message framing aren't visible from the example.

## 8. `DirectClient` vs `RpcWebSocketClient` Internal Differences

`transport.server.ts` creates `new DirectClient(kernel)` for SSR (in-process, zero-network). `transport.client.ts` creates `new RpcWebSocketClient(wsUrl)`. Both expose `.controller<T>(name)`. Whether `DirectClient` shares the same DI scope, how serialization differs (BSON over wire vs in-memory), reconnection logic for WebSocket — all in `@deepkit/rpc`.

## 9. Route Tree Generation (`routeTree.gen.ts`)

The generated route tree file is referenced by `router.tsx` but its generation logic is in `packages/router-generator/` and `packages/router-plugin/`. How it discovers `__root.tsx`, `index.tsx`, `posts.tsx`, builds the tree structure, and generates type declarations.

## 10. ~~Production Build & Deployment~~ ✅ RESOLVED

Production now uses **nitro** (not srvx). Build outputs to `.output/`, run with `node .output/server/index.mjs`.

- **Static assets**: Nitro serves `.output/public/assets/*` before the app handler (fixes the 404 issue srvx had)
- **WebSocket RPC**: `server/routes/rpc.ts` uses `defineWebSocketHandler` from `nitro/h3` with crossws peer API, registered via `handlers` config in `nitro()` plugin
- **Nitro filesystem route scanning did NOT work** with TanStack Start — routes must be registered explicitly via `handlers` config
- Fully verified: SSR (`source=ssr`), client-side navigation (`source=client`), all assets 200, zero console errors

---

## Priority for Next Steps

**Resolved:** #1, #2, #3, #4, #10 — all critical production, correctness, and architecture gaps are closed.

**Remaining (can defer, Deepkit/Vite internals):**
- #5 — `@deepkit/vite` type compilation internals
- #6 — Deepkit DI container bootstrap internals
- #7 — `RpcKernel.createConnection()` binary protocol
- #8 — `DirectClient` vs `RpcWebSocketClient` internal differences
- #9 — Route tree generation internals
