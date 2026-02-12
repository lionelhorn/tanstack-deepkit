import { Logger } from '@deepkit/logger'
import { Post } from '../types/post'

export class PostService {
  constructor(private logger: Logger) {
    console.log('PostService ctor')
  }

  async getAll(): Promise<Post[]> {
    this.logger.log('PostService.getAll() called')
    return [
      {
        id: 1,
        title: 'Hello from Deepkit DI',
        body: 'This service is injected via constructor.',
      },
      {
        id: 2,
        title: 'FrameworkModule powers this',
        body: 'Using @deepkit/framework for DI and RPC.',
      },
      {
        id: 3,
        title: 'Single process',
        body: 'SSR and RPC in the same Node.js process.',
      },
    ]
  }

  async getById(id: number): Promise<Post | undefined> {
    const all = await this.getAll()
    return all.find((p) => p.id === id)
  }
}
