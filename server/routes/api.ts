/**
 * Nitro handler bridging `/api/**` to Deepkit's HttpKernel — the only path routed
 * to Deepkit (the `/api/_deepkit` debugger UI). Every other URL stays with TanStack
 * SSR. Registered in vite.config.ts via `nitro({ handlers: [...] })`.
 */
import { fromNodeHandler } from 'nitro/h3'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { httpKernel } from '../app.js'
import { wrapForHtmlInjection } from '../http/inject-debugger-ws.js'

// `fromNodeHandler` (not `defineNodeHandler`) is load-bearing: it passes both
// (req, res) to the kernel; `defineNodeHandler` would call it as `handler(event)`.
export default fromNodeHandler(async (req, res) => {
  // h3 types req/res as the HTTP/1 ∪ HTTP/2 union; Deepkit wants HTTP/1, which is
  // what Nitro's dev server and Node deploys use, so the cast is safe.
  const nodeRes = res as ServerResponse

  // Repoint the debugger GUI's root-path RPC socket to /rpc (see helper). Must run
  // before handleRequest writes anything.
  wrapForHtmlInjection(nodeRes)

  await httpKernel.handleRequest(req as IncomingMessage, nodeRes)

  // SSE/streaming routes write the opening frame then stay open; resolving now
  // would let h3 close the socket and kill the stream. Block until the response
  // truly ends — a no-op for normal routes, which already ended.
  if (!nodeRes.writableEnded) {
    await new Promise<void>(resolve => {
      nodeRes.once('close', () => resolve())
      nodeRes.once('finish', () => resolve())
    })
  }
})
