import { nitro } from 'nitro/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import {
  deepkitTransportAlias,
  deepkitTypeCompiler,
} from './vite-plugins/deepkit'

export default defineConfig({
  server: {
    port: 3000,
  },
  // Deepkit uses TypeScript experimental decorators (legacy/stage 2),
  // so OXC must lower them with the legacy transform.
  oxc: {
    decorator: { legacy: true },
  },
  plugins: [
deepkitTypeCompiler(),
    deepkitTransportAlias(),
    tanstackStart(),
    viteReact(),
    nitro({
      experimental: { websocket: true, vite: {} } as any,
      handlers: [
        { route: '/rpc', handler: './server/routes/rpc.ts' },
      ],
    }),
  ],
})
