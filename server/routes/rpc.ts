/**
 * Nitro WebSocket route handler for Deepkit RPC (dev + production).
 *
 * Bridges WebSocket connections to the RpcConnectionService (from Deepkit DI).
 * Registered explicitly in vite.config.ts via `nitro({ handlers: [{ route: '/rpc', handler: ... }] })`.
 */
import { defineWebSocketHandler } from 'nitro/h3'
import { app } from '../app.js'
import { RpcConnectionService } from '../services/rpc-connection.service.js'

const rpcConnections = app.get(RpcConnectionService)

export default defineWebSocketHandler({
  open(peer) {
    rpcConnections.open(peer, {
      writeBinary(message: Uint8Array) {
        peer.send(message)
      },
      close() {
        peer.close()
      },
    })
  },

  message(peer, message) {
    const raw = message.rawData
    const data = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer)
    rpcConnections.feed(peer, data)
  },

  close(peer) {
    rpcConnections.close(peer)
  },

  error(peer, error) {
    rpcConnections.close(peer, error)
  },
})
