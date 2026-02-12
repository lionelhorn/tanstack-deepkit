import { DirectClient } from '@deepkit/rpc'
import { kernel } from '../../server/app.js'

export const rpcClient = new DirectClient(kernel)
