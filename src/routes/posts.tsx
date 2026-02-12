import { createFileRoute } from '@tanstack/react-router';
import type { PostsController } from '../../server/controllers/posts.controller';
import { rpcClient } from '~/rpc/transport';

export const Route = createFileRoute('/posts')({
  loader: async () => {
    console.log('[posts loader] rpcClient constructor:', rpcClient.constructor.name)
    try {
      const source = typeof window === 'undefined' ? 'ssr' : 'client'
      const posts = await rpcClient
        .controller<PostsController>('posts')
        .getAll(source)
      return { posts }
    } catch (e) {
      console.error('[posts loader] error:', e)
      throw e
    }
  },
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()
  return (
    <main>
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Posts <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(via Deepkit RPC)</span>
      </h1>
      <div className="grid gap-4">
        {posts.map((p) => (
          <article
            key={p.id}
            className="rounded-lg border bg-white p-5 shadow-sm dark:bg-gray-900"
          >
            <h2 className="text-lg font-semibold">{p.title}</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{p.body}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
