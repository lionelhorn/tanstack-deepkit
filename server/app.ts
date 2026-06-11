import { App } from '@deepkit/app'
import { FrameworkModule } from '@deepkit/framework'
import { HttpKernel } from '@deepkit/http'
import { RpcKernel } from '@deepkit/rpc'
import { PostsController } from './controllers/posts.controller.js'
import { PostService } from './services/post.service.js'
import { RpcConnectionService } from './services/rpc-connection.service.js'

export const app = new App({
  controllers: [PostsController],
  providers: [PostService, RpcConnectionService],
  imports: [
    // `debug: true` auto-registers the debugger HTTP controller at Deepkit's
    // native default `debugUrl: '_debug'`. We keep that default deliberately:
    // the prebuilt GUI hardcodes `/_debug/api/media/...` for filesystem media
    // previews, so any other prefix silently breaks them. The static controller
    // rewrites the GUI's `<base href="/">` to `/_debug/`, so its relative assets
    // resolve. `/_debug/**` is bridged to this HttpKernel in vite.config.ts.
    new FrameworkModule({ debug: true }),
  ],
})

export const kernel = app.get(RpcKernel)

/**
 * Deepkit's HTTP kernel — consumes a Node IncomingMessage and writes to a Node
 * ServerResponse. The Nitro route in `routes/api.ts` hands it the raw request so
 * Deepkit's HTTP controllers (here: the `/api/_deepkit` debugger UI) are reachable
 * through the same server as TanStack Start.
 */
export const httpKernel = app.get(HttpKernel)

