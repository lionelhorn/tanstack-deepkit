# Deepkit RPC Integration with TanStack Start (start-bare)

## Context

Integrate Deepkit Framework's binary RPC into TanStack Start's `examples/react/start-bare`, replacing server functions with Deepkit RPC. Single Node.js process where:
- **SSR**: `DirectClient` calls controllers in-process (zero network)
- **SPA navigation**: `RpcWebSocketClient` calls controllers via WebSocket

**Status: VERIFIED WORKING** — SSR, WebSocket (dev + production), and DI (App + FrameworkModule) all confirmed functional. Production uses nitro with a custom WebSocket route handler for `/rpc`.

## File Structure

```
examples/react/start-bare/
├── server/
│   ├── app.ts                     App + FrameworkModule + exports kernel & app
│   ├── controllers/
│   │   └── posts.controller.ts    RPC controller with DI (PostService injected)
│   ├── routes/
│   │   └── rpc.ts                 Nitro WebSocket handler for /rpc (dev + production)
│   ├── services/
│   │   ├── post.service.ts        Service with Logger DI
│   │   └── rpc-connection.service.ts  Connection lifecycle mgmt (WeakMap<peer, connection>)
│   └── types/
│       └── post.ts                Post type definition
├── src/
│   ├── rpc/
│   │   ├── transport.server.ts    DirectClient (SSR, in-process)
│   │   └── transport.client.ts    RpcWebSocketClient (browser, WebSocket)
│   ├── routes/
│   │   ├── __root.tsx             Nav bar with active links, dark mode
│   │   ├── index.tsx              Hero landing page
│   │   └── posts.tsx              Route with Deepkit RPC loader
│   ├── styles/
│   │   └── app.css                Tailwind CSS v4 styles
│   ├── client.tsx                 Custom client entry (hydrateRoot + StartClient)
│   ├── server.ts                  Custom server entry (createServerEntry)
│   └── router.tsx
├── eslint.config.js               Disables consistent-type-imports for server/**
├── vite-plugins/
│   └── deepkit.ts                 2 Deepkit Vite plugins (type compiler, transport alias)
├── vite.config.ts                 Includes nitro() with WebSocket + handler registration
├── package.json                   crossws >=0.4.4 override
├── .gitignore                     Ignores var/ and .output/
└── tsconfig.json                  reflection: true, transport path alias
```

## Dependencies

**Runtime:** `@deepkit/rpc`, `@deepkit/type`, `@deepkit/event`, `@deepkit/bson`, `@deepkit/core`, `@deepkit/core-rxjs`, `@deepkit/injector`, `@deepkit/logger`, `@deepkit/app`, `@deepkit/framework`, `@deepkit/filesystem`, `rxjs`, `ws`

**Dev:** `@deepkit/type-compiler`, `@deepkit/vite`, `@types/ws`, `nitro` (3.0.1-alpha.2), `tailwindcss`, `@tailwindcss/vite`, `vite-plugin-inspect`

## Architecture Decisions

- **`@deepkit/vite` only processes `server/**/*.ts`** — its `ts.transpileModule()` destroys JSX, breaking React Fast Refresh. `.tsx` files are excluded.
- **`deepkitTransportAlias()` uses `resolveId` with `enforce: 'pre'`** — `configEnvironment()` does NOT support `resolve.alias` in Vite 7. Must intercept before `vite-tsconfig-paths`.
- **No `createServerFn()` involvement** — loaders call `rpcClient.controller().getAll()` directly. Transport resolved by Vite alias per environment.
- **Shared Deepkit App instance for dev + prod** — `server/app.ts` creates a single `App` with controllers, providers, and `FrameworkModule`. Both the nitro WebSocket handler and the SSR `DirectClient` use the same app/kernel instance.
- **`app.get(RpcKernel)` triggers DI container build** — no `app.run()` needed. FrameworkModule auto-registers `@rpc.controller()` classes.
- **`RpcConnectionService` manages WebSocket connections** — uses `WeakMap<peer, RpcKernelBaseConnection>` for lifecycle management. Injected via DI, consumed by the nitro route handler.
- **Single nitro WebSocket handler for dev + prod** — `server/routes/rpc.ts` handles `/rpc` in both modes. No separate Vite plugin for dev WebSocket. Registered explicitly via `handlers` config in `nitro()`.
- **Nitro `experimental.vite` must be set** — `experimental: { websocket: true, vite: {} }` — the `vite: {}` is required so the nitro plugin can read `experimental.vite.serverReload` during HMR without crashing.
- **Loader data serialization** — TanStack Start uses seroval. Plain objects with JSON-safe types work. Complex Deepkit types (classes, Map, Set) would need a custom `SerializationAdapter`.
- **Production uses nitro** — nitro handles static file serving (`.output/public/`) before the TanStack Start handler, fixing the 404 issue that srvx had.
- **SSR vs client differentiation** — controllers receive a `source` argument (`'ssr'` | `'client'`) from the loader, determined by `typeof window === 'undefined'` check.
- **`crossws` override required (>=0.4.4)** — fixes `new AbortSignal()` illegal constructor in StubRequest. Needed in `package.json` `pnpm.overrides` until h3/nitro update their crossws dependency. See https://github.com/h3js/crossws/pull/175.

## Findings & Pitfalls

### 1. `@deepkit/rpc` has many undeclared/peer dependencies

Only declares `dot-prop` as direct dep. Must install explicitly: `@deepkit/bson`, `@deepkit/core`, `@deepkit/core-rxjs`, `@deepkit/injector`, `@deepkit/logger`, `@deepkit/type`, `rxjs`. Also `@deepkit/event` (undeclared, not even a peer dep).

### 2. TypeScript version mismatch breaks `@deepkit/type-compiler`

`@deepkit/type-compiler` checks `SyntaxKind.SourceFile` at runtime. Different TS versions have different enum values (5.8.x: 307, 5.9.x: 308). If `@deepkit/vite` loads a different TS than `@deepkit/type-compiler`, it fails with `SyntaxKind different 308 !== 307`.

**Fix (monorepo):** `pnpm.overrides: { "typescript": "5.8.2" }` in root `package.json`. The `>` scoped syntax doesn't work because `typescript` is an undeclared import of `@deepkit/vite`. Standalone projects with a single TS version don't hit this.

### 3. `configEnvironment()` does NOT support `resolve.alias` (Vite 7)

`EnvironmentResolveOptions` doesn't include `alias`. Setting it via `configEnvironment` is silently ignored. Both environments use the top-level alias.

**Fix:** Use `resolveId` hook with `this.environment.name` check + `enforce: 'pre'` to intercept before `vite-tsconfig-paths`.

### 4. `@deepkit/framework` FrameworkModule missing transitive dep

`FrameworkModule` imports `@deepkit/filesystem` which is not declared as a dependency. Causes `Cannot find package '@deepkit/filesystem'` at runtime.

**Fix:** Install `@deepkit/filesystem` explicitly.

### 5. ESLint `consistent-type-imports` breaks Deepkit DI

`import type { Logger }` erases the import from JS output, removing the runtime reference that `@deepkit/type-compiler` needs for DI reflection metadata.

**Fix:** Local `eslint.config.js` disabling `@typescript-eslint/consistent-type-imports` for `server/**/*.ts`.

### 6. `@deepkit/vite` plugin order matters

Must be listed before `tanstackStart()` since both use `enforce: 'pre'`. Plugin array order determines execution order among same-enforce plugins. Similarly, `deepkitTransportAlias()` must be listed before `vite-tsconfig-paths` to intercept `~/rpc/transport` before tsconfig paths resolve it.

### 7. `~/rpc/transport` tsconfig path for IDE

The wildcard `~/*` maps to `./src/rpc/transport` which doesn't exist (only `.client.ts` and `.server.ts`). Need explicit `"~/rpc/transport": ["./src/rpc/transport.client.ts"]` for IDE resolution. Actual per-environment resolution is handled by the Vite plugin.

### 8. `TransportConnection` interface (for `kernel.createConnection()`)

```typescript
interface TransportConnection {
  writeBinary?(message: Uint8Array): void
  close(): void
  bufferedAmount?(): number
  clientAddress?(): string
}
```

Returned connection: `feed(data: Uint8Array)` for incoming, `close()` for disconnect.

## Production Deployment

### Build & Run

```bash
pnpm build          # outputs to .output/
node .output/server/index.mjs   # starts nitro production server on port 3000
```

### How it works

1. **Static assets**: Nitro serves `.output/public/assets/*` before the app handler — JS, CSS, favicon all return 200.
2. **SSR**: TanStack Start's `createStartHandler` processes page requests, runs loaders (which use `DirectClient` → in-process RPC), renders HTML with dehydrated state.
3. **Client hydration**: Browser loads JS, hydrates React, restores loader data from `window.$_TSR`.
4. **SPA navigation**: Loader re-executes in browser, `RpcWebSocketClient` connects to `ws://localhost:3000/rpc`, nitro's crossws adapter upgrades the connection and routes to `server/routes/rpc.ts` which uses `RpcConnectionService` to bridge to `kernel.createConnection()`.

### Why nitro (not srvx)

srvx served the TanStack Start handler for ALL requests (including `/assets/*.js`), which returned HTML 404 before static file middleware could run. Nitro serves static files from `.output/public/` first, then falls through to the app handler. Nitro also provides:
- WebSocket support via crossws (unified API across runtimes)
- Deployment presets (Cloudflare Workers, Vercel, etc.)
- Standard TanStack Start stack (all official examples use nitro)
