import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main>
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold tracking-tight">
          TanStack Start + Deepkit RPC
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          A bare-bones example with type-safe RPC powered by Deepkit.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-colors"
          >
            TanStack Docs
          </a>
          <a
            href="https://deepkit.io"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700 transition-colors"
          >
            Deepkit Docs
          </a>
        </div>
      </div>
    </main>
  )
}
