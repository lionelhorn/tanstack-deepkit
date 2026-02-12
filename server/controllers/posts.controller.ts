import { rpc } from '@deepkit/rpc';
import { PostService } from '../services/post.service.js';
import { Post } from '../types/post'

@rpc.controller('posts')
export class PostsController {
  constructor(private postService: PostService) {}

  @rpc.action()
  async getAll(source: 'ssr' | 'client' = 'client'): Promise<Post[]> {
    console.log(`[PostsController.getAll] source=${source}`)
    const posts = await this.postService.getAll()
    return posts.map((p) => ({
      ...p,
      body: `[${source}] ${p.body}`,
    }))
  }

  @rpc.action()
  async getById(id: number): Promise<Post | undefined> {
    return this.postService.getById(id)
  }
}
