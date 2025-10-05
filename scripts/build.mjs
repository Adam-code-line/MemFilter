#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

const env = {
  ...process.env,
  NODE_NO_WARNINGS: '1'
}

const nuxtPkgPath = require.resolve('nuxt/package.json')
const nuxtBin = join(dirname(nuxtPkgPath), 'bin/nuxt.mjs')
const command = process.execPath
const args = [nuxtBin, 'build']

const child = spawn(command, args, {
  stdio: 'inherit',
  env
})

child.on('exit', code => {
  process.exit(code ?? 0)
})

child.on('error', error => {
  console.error('Failed to run Nuxt build:', error)
  process.exit(1)
})
