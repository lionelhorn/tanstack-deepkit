import { RpcKernel } from '@deepkit/rpc'
import { TransportConnection, RpcKernelBaseConnection } from '@deepkit/rpc'

export class RpcConnectionService {
  private connections = new WeakMap<object, RpcKernelBaseConnection>()

  constructor(private kernel: RpcKernel) {}

  open(peer: object, transport: TransportConnection) {
    const connection = this.kernel.createConnection(transport)
    this.connections.set(peer, connection)
  }

  feed(peer: object, data: Uint8Array) {
    this.connections.get(peer)?.feed(data)
  }

  close(peer: object, error?: Error) {
    const connection = this.connections.get(peer)
    if (connection) {
      error ? connection.close(error) : connection.close()
      this.connections.delete(peer)
    }
  }
}
