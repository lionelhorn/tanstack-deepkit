# TanStack Start + Deepkit RPC

A TanStack Start example with [Deepkit RPC](https://deepkit.io/documentation/rpc) for type-safe client-server communication over WebSockets.

- [TanStack Start Docs](https://tanstack.com/start)
- [Deepkit RPC Docs](https://deepkit.io/documentation/rpc)

## What's in this example

- **TanStack Start** with file-based routing (Nitro server)
- **Deepkit RPC** controllers with dependency injection (`@deepkit/app`, `@deepkit/framework`)
- **WebSocket transport** in the browser, **direct in-process transport** during SSR (no network roundtrip)
- A sample `PostsController` exposing `getAll` and `getById` actions via `@rpc.action()`

## Project structure

```
server/
  app.ts                 # Deepkit App + DI container, exports RpcKernel
  controllers/           # RPC controllers (e.g. PostsController)
  services/              # DI-managed services (PostService, RpcConnectionService)
  routes/rpc.ts          # Nitro WebSocket handler bridging to Deepkit RPC
  types/                 # Shared types (e.g. Post)
src/
  rpc/
    transport.client.ts  # Browser: RpcWebSocketClient → ws://host/rpc
    transport.server.ts  # SSR: DirectClient → in-process RpcKernel
  routes/                # TanStack file-based routes
  client.tsx             # Client entry
  server.ts              # Server entry
vite-plugins/            # Custom Vite plugins for Deepkit type compiler
```

The `~/rpc/transport` import is resolved by a Vite alias — `transport.server.ts` during SSR, `transport.client.ts` in the browser — so route loaders use the same `rpcClient` API in both environments.

## Start a new project based on this example

```sh
npx gitpick TanStack/router/tree/main/examples/react/start-bare start-bare
```

## Getting started

```sh
pnpm install
pnpm dev
```

This starts the app in development mode on [http://localhost:3000](http://localhost:3000).

## Build and preview

```sh
pnpm build
pnpm start      # runs the production Nitro server
```
