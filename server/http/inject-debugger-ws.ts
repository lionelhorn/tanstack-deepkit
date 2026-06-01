import type { ServerResponse } from 'node:http'

/**
 * Script injected (in-memory, per request) into the debugger GUI's index.html.
 *
 * The prebuilt GUI opens its RPC socket via `provideRpcWebSocketClient(undefined)`
 * → `webSocketFromBaseUrl(location.origin)`, which drops the path and connects to
 * the root `ws://<host>/`. Nothing answers a WS upgrade there (that path is
 * TanStack SSR over HTTP), so the GUI shows DISCONNECTED. The bundle has no hook
 * to repoint it, so we wrap `WebSocket` before Angular loads and rewrite the
 * root-path socket to `/rpc`, which server/routes/rpc.ts bridges to the RpcKernel
 * that `debug:true` populates with Deepkit's DebugController.
 */
const WS_REPOINT_SCRIPT =
  '<script>(function(){' +
  'var Orig=window.WebSocket;' +
  'window.WebSocket=new Proxy(Orig,{construct:function(Target,args){' +
  'var url=String(args[0]);' +
  "if(/^wss?:\\/\\/[^/]+\\/?$/.test(url))url=url.replace(/\\/?$/,'/rpc');" +
  'return new Target(url,args[1]);' +
  '}});' +
  '})();</script>'

// Guarded on `<app-root>` so only the Angular index is touched; inserted before
// `</head>` so the shim runs before the GUI bundle.
function injectRepointScript(html: string): string {
  if (!html.includes('<app-root')) return html
  if (html.includes('</head>')) return html.replace('</head>', `${WS_REPOINT_SCRIPT}</head>`)
  return WS_REPOINT_SCRIPT + html
}

/**
 * Wrap a Node response so only `text/html` bodies are buffered and rewritten to
 * inject the repoint script; assets and streaming responses pass through untouched.
 *
 * The overrides are own-properties set before `handleRequest`, so they survive the
 * kernel's `Object.setPrototypeOf(res, HttpResponse.prototype)` and delegate to the
 * native methods captured here.
 */
export function wrapForHtmlInjection(res: ServerResponse): void {
  const nativeWriteHead = res.writeHead.bind(res)
  const nativeWrite = res.write.bind(res)
  const nativeEnd = res.end.bind(res)

  let mode: 'undecided' | 'pass' | 'buffer' = 'undecided'
  // The kernel ends the response, then srvx calls end again to finalize the h3
  // result. The rewrite must run exactly once, or the second call setHeaders after
  // headers are sent (ERR_HTTP_HEADERS_SENT).
  let finished = false
  const chunks: Buffer[] = []

  const toBuffer = (chunk: unknown, enc?: unknown): Buffer =>
    Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string, typeof enc === 'string' ? (enc as BufferEncoding) : 'utf8')

  const isHtml = (): boolean => {
    const ct = res.getHeader('content-type')
    return typeof ct === 'string' && ct.toLowerCase().includes('text/html')
  }

  const applyHeaders = (headers: unknown): void => {
    if (!headers) return
    if (Array.isArray(headers)) {
      if (Array.isArray(headers[0])) {
        for (const [k, v] of headers as [string, string][]) res.setHeader(k, v)
      } else {
        for (let i = 0; i < headers.length; i += 2) {
          res.setHeader(headers[i] as string, headers[i + 1] as string)
        }
      }
    } else {
      for (const [k, v] of Object.entries(headers as Record<string, string>)) res.setHeader(k, v)
    }
  }

  res.writeHead = function (statusCode: number, arg2?: unknown, arg3?: unknown) {
    let headers = arg3
    if (typeof arg2 === 'string') res.statusMessage = arg2
    else if (arg2) headers = arg2
    res.statusCode = statusCode
    applyHeaders(headers)
    mode = isHtml() ? 'buffer' : 'pass'
    if (mode === 'buffer') {
      // Body length changes after injection; defer the header flush to end().
      res.removeHeader('content-length')
      return res
    }
    return nativeWriteHead(statusCode)
  } as typeof res.writeHead

  res.write = function (chunk: unknown, ...rest: unknown[]) {
    if (finished) return true
    if (mode === 'undecided') mode = isHtml() ? 'buffer' : 'pass'
    if (mode === 'buffer') {
      if (chunk) chunks.push(toBuffer(chunk, rest[0]))
      const cb = rest.find(r => typeof r === 'function') as (() => void) | undefined
      cb?.()
      return true
    }
    return (nativeWrite as (...a: unknown[]) => boolean)(chunk, ...rest)
  } as typeof res.write

  res.end = function (chunk?: unknown, ...rest: unknown[]) {
    if (finished) return res
    if (mode === 'undecided') mode = isHtml() ? 'buffer' : 'pass'
    finished = true
    if (mode === 'buffer') {
      if (chunk && typeof chunk !== 'function') chunks.push(toBuffer(chunk, rest[0]))
      const out = Buffer.from(injectRepointScript(Buffer.concat(chunks).toString('utf8')), 'utf8')
      res.setHeader('content-length', String(out.byteLength))
      nativeWriteHead(res.statusCode)
      nativeWrite(out)
      const cb = (typeof chunk === 'function' ? chunk : rest.find(r => typeof r === 'function')) as
        | (() => void)
        | undefined
      return nativeEnd(cb)
    }
    return (nativeEnd as (...a: unknown[]) => ServerResponse)(chunk, ...rest)
  } as typeof res.end
}
