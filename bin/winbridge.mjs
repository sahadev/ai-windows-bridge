#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stateDir = path.resolve(process.env.WINBRIDGE_STATE_DIR || path.join(root, '.state'))
const tokenPath = path.join(stateDir, 'pairing-token')
const port = Number(process.env.WINBRIDGE_PORT || '47832')
const baseUrl = process.env.WINBRIDGE_URL || `http://127.0.0.1:${port}`
const tokenAuthRequired = shouldRequireTokenAuth(process.env)

function usage() {
  console.log(`Usage:
  winbridge status
  winbridge run <powershell>
  winbridge screenshot
  winbridge preflight
  winbridge install-env
  winbridge install-artifact
  winbridge cancel <job-id>

Environment:
  WINBRIDGE_URL=http://127.0.0.1:47832
  WINBRIDGE_PAIRING_TOKEN=<token>
  WINBRIDGE_AUTH_REQUIRED=1
  WINBRIDGE_AUTH=token
  WINBRIDGE_AUTH_DISABLED=1`)
}

function normalizeEnvValue(value) {
  return String(value || '').trim().toLowerCase()
}

function isTruthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(normalizeEnvValue(value))
}

function isTokenAuthMode(value) {
  return normalizeEnvValue(value) === 'token'
}

function hasExplicitPairingToken(env) {
  return Boolean(String(env.WINBRIDGE_PAIRING_TOKEN || '').trim())
}

function shouldRequireTokenAuth(env) {
  if (isTruthyEnv(env.WINBRIDGE_AUTH_DISABLED)) return false
  return isTruthyEnv(env.WINBRIDGE_AUTH_REQUIRED) || isTokenAuthMode(env.WINBRIDGE_AUTH) || hasExplicitPairingToken(env)
}

function readToken() {
  if (!tokenAuthRequired) return ''
  if (process.env.WINBRIDGE_PAIRING_TOKEN) return process.env.WINBRIDGE_PAIRING_TOKEN
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf8').trim()
  return ''
}

function requestHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = readToken()
  if (token) headers['X-WinBridge-Token'] = token
  return headers
}

async function api(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...requestHeaders(),
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = text
  }
  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload.error || response.statusText
    throw new Error(message)
  }
  return payload
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

function summarizeStatus(status) {
  const latestAgent = [...status.agents].sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0]
  console.log(`agents: ${status.agents.length}${latestAgent ? ` latest=${latestAgent.username}@${latestAgent.computerName}` : ''}`)
  console.log(`jobs: ${status.jobs.length}`)
  console.log(`artifacts: ${status.artifacts.length}`)
  console.log(`screenshots: ${status.screenshots.length}`)
  console.log(`logs: ${status.logs.length}`)
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  try {
    if (!command || command === '-h' || command === '--help') {
      usage()
      return
    }
    if (command === 'status') {
      const status = await api('/api/status')
      if (args.includes('--json')) printJson(status)
      else summarizeStatus(status)
      return
    }
    if (command === 'run') {
      const script = args.join(' ').trim()
      if (!script) throw new Error('Missing PowerShell script')
      printJson(await api('/api/agent/run-powershell', {
        method: 'POST',
        body: JSON.stringify({ title: 'CLI PowerShell', script }),
      }))
      return
    }
    if (command === 'screenshot') {
      printJson(await api('/api/agent/capture-screenshot', { method: 'POST', body: '{}' }))
      return
    }
    if (command === 'preflight') {
      printJson(await api('/api/agent/preflight', { method: 'POST', body: '{}' }))
      return
    }
    if (command === 'install-env') {
      printJson(await api('/api/agent/install-env', { method: 'POST', body: '{}' }))
      return
    }
    if (command === 'install-artifact') {
      printJson(await api('/api/agent/install-artifact', { method: 'POST', body: '{}' }))
      return
    }
    if (command === 'cancel') {
      const jobId = args[0]
      if (!jobId) throw new Error('Missing job id')
      printJson(await api('/api/agent/cancel', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }))
      return
    }
    throw new Error(`Unknown command: ${command}`)
  } catch (error) {
    console.error(`winbridge: ${error.message || String(error)}`)
    process.exitCode = 1
  }
}

await main()
