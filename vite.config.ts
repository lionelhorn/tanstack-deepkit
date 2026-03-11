import fs from 'node:fs'
import Inspect from 'vite-plugin-inspect'
import { nitro } from 'nitro/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, type Plugin } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  deepkitTransportAlias,
  deepkitTypeCompiler,
} from './vite-plugins/deepkit'

/**
 * Rolldown-vite's OXC decorator lowering imports CJS helpers from
 * @oxc-project/runtime/src/helpers/*.js — these use `module.exports`
 * which crashes the ESM module runner. This plugin intercepts the load
 * and serves the ESM variant instead.
 */
function oxcRuntimeEsmFix(): Plugin {
  const cjsDir = '/src/helpers/'
  const esmDir = '/src/helpers/esm/'
  return {
    name: 'oxc-runtime-esm-fix',
    enforce: 'pre',
    load(id) {
      if (
        id.includes('@oxc-project/runtime') &&
        id.includes(cjsDir) &&
        !id.includes(esmDir)
      ) {
        const esmPath = id.replace(cjsDir, esmDir)
        if (fs.existsSync(esmPath)) {
          return fs.readFileSync(esmPath, 'utf-8')
        }
      }
    },
  }
}

export default defineConfig({
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['faker'],
  },
  oxc: {
    decorator: { legacy: true },
  },
  plugins: [
    oxcRuntimeEsmFix(),
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