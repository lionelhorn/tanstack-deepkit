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
      ],
    }),
  ],
})