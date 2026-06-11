import Inspect from 'vite-plugin-inspect'
import { nitro } from 'nitro/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  deepkitTransportAlias,
  deepkitTypeCompiler,
} from './vite-plugins/deepkit'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    Inspect(),
    tailwindcss(),
    deepkitTypeCompiler(),
    deepkitTransportAlias(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    viteReact(),
    nitro({
      // `vite: {}` is required so the Nitro vite plugin can read
      // `experimental.vite.serverReload` during HMR without crashing.
      experimental: { websocket: true, vite: {} } as any,
      handlers: [
        { route: '/rpc', handler: './server/routes/rpc.ts' },
        // Deepkit HTTP controllers (the /_debug debugger UI + its static assets)
        // — forwarded to Deepkit's HttpKernel. rou3's `/_debug/**` also matches
        // the bare `/_debug` parent, so one route covers index + assets. The rest
        // of the URL space stays with TanStack SSR.
        { route: '/_debug/**', handler: './server/routes/api.ts' },
      ],
    }),
  ],
})