#!/usr/bin/env node
/**
 * Starts the Vite dev server with DEBUG logging and writes a clean
 * (ANSI-stripped, UTF-8) log to tmp/vite/logs/<NNN>[-label].log.
 *
 * Usage:
 *   node scripts/capture-vite-log.mjs [label]
 *   # Load pages in the browser, then press Ctrl+C to stop.
 *
 * Environment variables:
 *   VITE_PERF_DEBUG   - DEBUG categories (default: "vite:transform,deepkit")
 *   VITE_PERF_DEV_CMD - Dev command to run (default: "pnpm dev")
 *   VITE_PERF_OUT_DIR - Base output directory (default: "tmp/vite")
 */

import { spawn, execSync } from 'node:child_process'
import { createWriteStream, mkdirSync, readdirSync } from 'node:fs'

const baseDir = process.env.VITE_PERF_OUT_DIR || 'tmp/vite'
const logDir = `${baseDir}/logs`
const debugEnv = process.env.VITE_PERF_DEBUG || 'vite:transform,deepkit'
const devCmd = process.env.VITE_PERF_DEV_CMD || 'pnpm dev'

mkdirSync(logDir, { recursive: true })

let label = process.argv[2] ?? ''
if (!label) {
  try {
    label = execSync(
      `node -e "const r=require('readline').createInterface({input:process.stdin,output:process.stderr});r.question('Label for this run (enter to skip): ',a=>{process.stdout.write(a.trim());r.close()})"`,
      { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf-8' }
    ).trim()
  } catch { label = '' }
}
const labelSuffix = label ? `-${label.replace(/[^a-zA-Z0-9_-]/g, '_')}` : ''

// Find next available number
const existing = readdirSync(logDir)
  .map(f => f.match(/^(\d+)/))
  .filter(Boolean)
  .map(m => parseInt(m[1]))
const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
const baseName = `${String(next).padStart(3, '0')}${labelSuffix}`
const outPath = `${logDir}/${baseName}.log`
const metricsDir = `${baseDir}/metrics`
mkdirSync(metricsDir, { recursive: true })
const metricsPath = `${metricsDir}/${baseName}.json`

const stream = createWriteStream(outPath, { encoding: 'utf-8' })

// eslint-disable-next-line no-control-regex
const controlRe = /\x1b\[[0-9;]*m|\x00/g

const [cmd, ...args] = devCmd.split(/\s+/)
const child = spawn(cmd, args, {
  env: { ...process.env, DEBUG: debugEnv, VITE_PERF_INSPECT_OUT: metricsPath },
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
})

console.log(`Writing to ${outPath}`)
console.log(`DEBUG=${debugEnv}`)
console.log(`Command: ${devCmd}\n`)

function handle(data) {
  const text = data.toString('utf-8')
  const clean = text.replace(controlRe, '')
  process.stdout.write(text)
  stream.write(clean)
}

child.stdout.on('data', handle)
child.stderr.on('data', handle)

child.on('close', (code) => {
  stream.end()
  console.log(`\nLog saved to ${outPath}`)
  process.exit(code ?? 0)
})

process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
