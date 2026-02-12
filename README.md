# TanStack Start + Deepkit RPC (Single Process)

A working POC of Deepkit RPC integrated with [TanStack Start](https://tanstack.com/start) (React SSR framework, similar role to Angular Universal) in a **single Node.js process**.

Two transport modes, same controller API:

- **SSR (server-side rendering):** `DirectClient` calls controllers in-process
- **Browser (SPA navigation):** `RpcWebSocketClient` calls controllers over WebSocket

## How Deepkit is used

### App bootstrap ([`server/app.ts`](server/app.ts))

```typescript
import { App } from '@deepkit/app'
import { FrameworkModule } from '@deepkit/framework'
import { RpcKernel } from '@deepkit/rpc'
import { PostsController } from './controllers/posts.controller.js'
import { PostService } from './services/post.service.js'
import { RpcConnectionService } from './services/rpc-connection.service.js'

export const app = new App({
  controllers: [PostsController],
  providers: [PostService, RpcConnectionService],
  imports: [new FrameworkModule({ debug: true })],
})

export const kernel = app.get(RpcKernel)
```

`app.get(RpcKernel)` triggers the DI container build. No `app.run()` is called because the HTTP server is managed by the framework (Nitro/Vite), not Deepkit.

### In-process transport for SSR ([`src/rpc/transport.server.ts`](src/rpc/transport.server.ts))

```typescript
import { DirectClient } from '@deepkit/rpc'
import { kernel } from '../../server/app.js'

export const rpcClient = new DirectClient(kernel)
```

### WebSocket transport for browser ([`src/rpc/transport.client.ts`](src/rpc/transport.client.ts))

```typescript
import { RpcWebSocketClient } from '@deepkit/rpc'

const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/rpc`

export const rpcClient = new RpcWebSocketClient(wsUrl)
```

A [Vite plugin](vite-plugins/deepkit.ts) resolves the `~/rpc/transport` import to the correct file per environment (dev and production), so the consuming code always just imports `rpcClient`.

### WebSocket bridge ([`server/services/rpc-connection.service.ts`](server/services/rpc-connection.service.ts))

Bridges the web server's WebSocket connections to Deepkit's `kernel.createConnection()`:

```typescript
import { RpcKernel, TransportConnection, RpcKernelBaseConnection } from '@deepkit/rpc'

export class RpcConnectionService {
  private connections = new WeakMap<object, RpcKernelBaseConnection>()

  constructor(private kernel: RpcKernel) {}

  open(peer: object, transport: TransportConnection) {
    const connection = this.kernel.createConnection(transport)
    this.connections.set(peer, connection)
  }

  feed(peer: object, data: Uint8Array) {
    this.connections.get(peer)?.feed(data)
  }

  close(peer: object, error?: Error) {
    const connection = this.connections.get(peer)
    if (connection) {
      error ? connection.close(error) : connection.close()
      this.connections.delete(peer)
    }
  }
}
```

### WebSocket handler ([`server/routes/rpc.ts`](server/routes/rpc.ts))

The web server (Nitro) routes `/rpc` WebSocket upgrades to this handler, which delegates to `RpcConnectionService`:

```typescript
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
  message(peer, message) {
    const raw = message.rawData
    const data = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer)
    rpcConnections.feed(peer, data)
  },
  close(peer) { rpcConnections.close(peer) },
  error(peer, error) { rpcConnections.close(peer, error) },
})
```

### Controller example ([`server/controllers/posts.controller.ts`](server/controllers/posts.controller.ts))

```typescript
import { rpc } from '@deepkit/rpc'
import { PostService } from '../services/post.service.js'
import { Post } from '../types/post'

@rpc.controller('posts')
export class PostsController {
  constructor(private postService: PostService) {}

  @rpc.action()
  async getAll(source: 'ssr' | 'client' = 'client'): Promise<Post[]> {
    return this.postService.getAll()
  }

  @rpc.action()
  async getById(id: number): Promise<Post | undefined> {
    return this.postService.getById(id)
  }
}
```

### Usage in a route loader

The route loader calls the controller identically regardless of environment. During SSR, `rpcClient` is a `DirectClient` (in-process); during browser navigation, it's a `RpcWebSocketClient`:

```typescript
import { rpcClient } from '~/rpc/transport'

loader: async () => {
  const posts = await rpcClient.controller<PostsController>('posts').getAll()
  return { posts }
}
```

## Project structure

| File | Role |
|------|------|
| [`server/app.ts`](server/app.ts) | Deepkit App + FrameworkModule, exports kernel |
| [`server/controllers/`](server/controllers/) | `@rpc.controller()` classes |
| [`server/services/`](server/services/) | DI providers (PostService, RpcConnectionService) |
| [`server/routes/rpc.ts`](server/routes/rpc.ts) | WebSocket handler bridging to Deepkit RPC |
| [`server/types/`](server/types/) | Shared type definitions |
| [`src/rpc/transport.client.ts`](src/rpc/transport.client.ts) | RpcWebSocketClient (browser) |
| [`src/rpc/transport.server.ts`](src/rpc/transport.server.ts) | DirectClient (SSR, in-process) |
| [`src/routes/`](src/routes/) | File-based routes (React components + loaders) |
| [`vite-plugins/deepkit.ts`](vite-plugins/deepkit.ts) | `@deepkit/vite` restricted to `server/**/*.ts` only |

## Pitfalls encountered

- **`@deepkit/rpc` has many undeclared dependencies** — had to install explicitly: `@deepkit/bson`, `@deepkit/core`, `@deepkit/core-rxjs`, `@deepkit/injector`, `@deepkit/logger`, `@deepkit/type`, `@deepkit/event`, `rxjs`.
- **`@deepkit/framework` missing `@deepkit/filesystem`** — `FrameworkModule` imports it but doesn't declare it as a dependency.
- **ESLint `consistent-type-imports` breaks DI** — `import type { Logger }` erases the runtime reference that `@deepkit/type-compiler` needs for reflection. Disabled for `server/**`.

## Running

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm start        # production server
```
