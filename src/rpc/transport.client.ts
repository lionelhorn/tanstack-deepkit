import { RpcWebSocketClient } from '@deepkit/rpc'

const wsUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/rpc`
    : 'ws://localhost:3000/rpc'

export const rpcClient = new RpcWebSocketClient(wsUrl)
