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

