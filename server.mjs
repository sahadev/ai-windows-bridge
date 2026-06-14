#!/usr/bin/env node
import { createServer } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const productName = 'WinBridge AI'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const scriptsDir = path.join(root, 'scripts')
const stateDir = path.resolve(process.env.WINBRIDGE_STATE_DIR || path.join(root, '.state'))
const artifactsDir = path.resolve(process.env.WINBRIDGE_ARTIFACTS_DIR || path.join(root, 'artifacts'))
const screenshotsDir = path.join(stateDir, 'screenshots')
const statePath = path.join(stateDir, 'state.json')
const tokenPath = path.join(stateDir, 'pairing-token')
const port = Number(process.env.WINBRIDGE_PORT || '47832')
const keyPath = process.env.WINBRIDGE_SSH_KEY || path.join(stateDir, 'ssh', 'winbridge_windows_ed25519')
const publicKeyPath = `${keyPath}.pub`
const tokenAuthRequired = shouldRequireTokenAuth(process.env)

const state = loadState()
for (const key of ['devices', 'jobs', 'logs', 'agents']) {
  if (!Array.isArray(state[key])) state[key] = []
}
normalizeState()

function loadState() {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'))
  } catch {
    return { devices: [], jobs: [], logs: [], agents: [] }
  }
}

function saveState() {
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

function ensureKey() {
  if (!existsSync(keyPath)) {
    mkdirSync(path.dirname(keyPath), { recursive: true })
    const result = spawnSync('ssh-keygen', ['-t', 'ed25519', '-f', keyPath, '-N', '', '-C', 'winbridge-windows-remote'], {
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      throw new Error('Failed to create Windows SSH key with ssh-keygen')
    }
  }
  return readFileSync(publicKeyPath, 'utf8').trim()
}

const publicKey = ensureKey()
const pairingToken = tokenAuthRequired ? process.env.WINBRIDGE_PAIRING_TOKEN || ensurePairingToken() : ''

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

function ensurePairingToken() {
  try {
    const existing = readFileSync(tokenPath, 'utf8').trim()
    if (existing.length >= 24) return existing
  } catch {
    // Create a local pairing token on first run.
  }
  mkdirSync(stateDir, { recursive: true })
  const token = randomBytes(24).toString('base64url')
  writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 })
  return token
}

function lanAddresses() {
  const addresses = []
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address)
    }
  }
  return addresses
}

function defaultHostAddress(req) {
  const localAddress = normalizeRemoteAddress(req?.socket?.localAddress)
  if (localAddress && !localAddress.startsWith('127.')) return localAddress
  return lanAddresses()[0] || localAddress || '127.0.0.1'
}

function normalizeRemoteAddress(value) {
  if (!value) return null
  return String(value).replace(/^::ffff:/, '')
}

function publicUrl(address = 'HOST_IP') {
  return `http://${address}:${port}`
}

function addTokenToUrl(url) {
  if (!tokenAuthRequired) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(pairingToken)}`
}

function publicPairingUrl(address = 'HOST_IP') {
  return addTokenToUrl(`${publicUrl(address)}/`)
}

function authenticatedPath(pathname) {
  return addTokenToUrl(pathname)
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function headerValue(value) {
  return String(value).replace(/[\r\n"]/g, '_')
}

function psSingleQuote(value) {
  return String(value).replaceAll("'", "''")
}

function isAuthorizedRequest(req, url) {
  if (!tokenAuthRequired) return true
  const authHeader = String(req.headers.authorization || '')
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]
  const provided = String(req.headers['x-winbridge-token'] || bearer || url.searchParams.get('token') || '')
  if (!provided) return false
  const expected = Buffer.from(pairingToken)
  const candidate = Buffer.from(provided)
  return expected.length === candidate.length && timingSafeEqual(expected, candidate)
}

function renderLockedPage(req) {
  const urls = lanAddresses().map((address) => publicUrl(address))
  const hostAddress = defaultHostAddress(req)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${productName}</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #10141c; color: #edf3ff; }
    main { width: min(720px, calc(100vw - 40px)); border: 1px solid #344154; border-radius: 8px; padding: 28px; background: #171d27; }
    h1 { margin: 0 0 10px; font-size: 28px; }
    p { color: #aeb9c9; line-height: 1.55; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0b0f16; border-radius: 8px; padding: 14px; color: #d9e7ff; }
  </style>
</head>
<body>
  <main>
    <h1>${productName}</h1>
    <p>This bridge is protected by a local pairing token. Use the pairing URL printed in the Mac terminal.</p>
    <pre>${htmlEscape(publicPairingUrl(hostAddress))}</pre>
    <p>Visible LAN addresses: ${htmlEscape(urls.join(', ') || 'none')}</p>
  </main>
</body>
</html>`
}

function bootstrapCommand(address = 'HOST_IP') {
  return `Set-ExecutionPolicy -Scope Process Bypass -Force; irm '${psSingleQuote(addTokenToUrl(`${publicUrl(address)}/run_bootstrap.ps1`))}' | iex`
}

function installEnvCommand(address = 'HOST_IP') {
  return `Set-ExecutionPolicy -Scope Process Bypass -Force; irm '${psSingleQuote(addTokenToUrl(`${publicUrl(address)}/run_install_env.ps1`))}' | iex`
}

function agentCommand(address = 'HOST_IP') {
  return `$ErrorActionPreference='Stop'; try { Set-ExecutionPolicy -Scope Process Bypass -Force; $p=Join-Path $env:TEMP 'winbridge-agent.ps1'; Invoke-WebRequest '${psSingleQuote(addTokenToUrl(`${publicUrl(address)}/run_agent.ps1`))}' -UseBasicParsing -OutFile $p; & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p; if($LASTEXITCODE -ne 0){ throw "WinBridge AI agent exited with code $LASTEXITCODE" } } catch { Write-Host ''; Write-Host 'WinBridge AI agent failed:' -ForegroundColor Red; Write-Host $_.Exception.ToString(); Read-Host 'Press Enter to close' }`
}

function windowsAgentScript(address = 'HOST_IP') {
  const base = publicUrl(address)
  const authHashtable = tokenAuthRequired ? `@{'X-WinBridge-Token'='${psSingleQuote(pairingToken)}'}` : '@{}'
  return [
    "$ErrorActionPreference='Stop'",
    `$u='${psSingleQuote(base)}'`,
    `$headers=${authHashtable}`,
    "$agentId = \"$env:COMPUTERNAME-$env:USERNAME-\" + ([guid]::NewGuid().ToString('N'))",
    "$registerBody=@{agentId=$agentId;username=$env:USERNAME;computerName=$env:COMPUTERNAME;startedAt=(Get-Date).ToString('o');baseUrl=$u}|ConvertTo-Json -Depth 4",
    'Invoke-RestMethod -Method Post -Uri "$u/api/agent/register" -Headers $headers -ContentType "application/json" -Body $registerBody | Out-Null',
    "Write-Host \"WinBridge AI agent connected: $agentId\" -ForegroundColor Green",
    "Write-Host 'Keep this window open while this machine is controlled over the LAN.'",
    "function Invoke-AgentCommand($command) {",
    "  $exit=0",
    "  $stdout=''",
    "  $stderr=''",
    "  try {",
    "    $safeId=([string]$command.id) -replace '[^A-Za-z0-9_.-]','_'",
    "    $prefix=Join-Path $env:TEMP \"winbridge-agent-$safeId\"",
    "    $scriptPath=\"$prefix.ps1\"",
    "    $outPath=\"$prefix.out.log\"",
    "    $errPath=\"$prefix.err.log\"",
    "    Remove-Item $scriptPath,$outPath,$errPath -ErrorAction SilentlyContinue",
    "    Set-Content -Path $scriptPath -Value ([string]$command.script) -Encoding UTF8",
    "    $timeoutMs=600000",
    "    if($command.PSObject.Properties.Name -contains 'timeoutMs'){ $timeoutMs=[int]$command.timeoutMs }",
    "    if($timeoutMs -lt 1000){ $timeoutMs=600000 }",
    "    $proc=Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$scriptPath) -RedirectStandardOutput $outPath -RedirectStandardError $errPath -PassThru",
    "    $cancelled=$false",
    "    $timedOut=$false",
    "    function Read-AgentLogSnapshot {",
    "      $parts=@()",
    "      if(Test-Path $outPath){ $parts += (Get-Content -Raw -Path $outPath -ErrorAction SilentlyContinue) }",
    "      if($stderr){ $parts += $stderr }",
    "      if(Test-Path $errPath){ $parts += (Get-Content -Raw -Path $errPath -ErrorAction SilentlyContinue) }",
    "      $snapshot=($parts -join [Environment]::NewLine).Trim()",
    "      if($snapshot -and $snapshot.Length -gt 200000){$snapshot=$snapshot.Substring($snapshot.Length-200000)}",
    "      return $snapshot",
    "    }",
    "    function Send-AgentProgress([string]$snapshot) {",
    "      $progressBody=@{agentId=$agentId;commandId=$command.id;log=$snapshot}|ConvertTo-Json -Depth 5",
    "      try {",
    "        $response=Invoke-RestMethod -Method Post -Uri \"$u/api/agent/progress\" -Headers $headers -ContentType 'application/json' -Body $progressBody",
    "        return (($null -ne $response) -and ($response.cancel -eq $true))",
    "      } catch {",
    "        return $false",
    "      }",
    "    }",
    "    $deadline=[DateTime]::UtcNow.AddMilliseconds($timeoutMs)",
    "    while(-not $proc.HasExited){",
    "      if([DateTime]::UtcNow -ge $deadline){",
    "        try { $proc.Kill() } catch { }",
    "        $exit=124",
    "        $timedOut=$true",
    "        $stderr=\"WinBridge AI command timed out after $([Math]::Round($timeoutMs / 1000)) seconds.\"",
    "        break",
    "      }",
    "      Start-Sleep -Seconds 5",
    "      $snapshot=Read-AgentLogSnapshot",
    "      if(Send-AgentProgress $snapshot){",
    "        try { $proc.Kill() } catch { }",
    "        $exit=130",
    "        $cancelled=$true",
    "        $stderr='WinBridge AI command cancelled.'",
    "        break",
    "      }",
    "    }",
    "    if($cancelled -or $timedOut){",
    "      try { $proc.WaitForExit(5000) | Out-Null } catch { }",
    "    }",
    "    if($proc.HasExited -and -not $cancelled -and -not $timedOut){",
    "      $exit=$proc.ExitCode",
    "    }",
    "    if(Test-Path $outPath){ $stdout=Get-Content -Raw -Path $outPath -ErrorAction SilentlyContinue }",
    "    if(Test-Path $errPath){ $stderr=($stderr + [Environment]::NewLine + (Get-Content -Raw -Path $errPath -ErrorAction SilentlyContinue)).Trim() }",
    "  } catch {",
    "    $stderr=$_.Exception.ToString()",
    "    $exit=1",
    "  }",
    "  $log=($stdout + [Environment]::NewLine + $stderr).Trim()",
    "  if($log -and $log.Length -gt 200000){$log=$log.Substring($log.Length-200000)}",
    "  if($log){Write-Host $log}",
    "  $body=@{agentId=$agentId;commandId=$command.id;exitCode=$exit;log=$log}|ConvertTo-Json -Depth 5",
    "  Invoke-RestMethod -Method Post -Uri \"$u/api/agent/result\" -Headers $headers -ContentType 'application/json' -Body $body | Out-Null",
    "}",
    "while($true){",
    "  try {",
    "    $next=Invoke-RestMethod -Method Get -Uri \"$u/api/agent/next?agentId=$agentId\" -Headers $headers",
    "    if($next -and $next.id){",
    "      Write-Host \"Running LAN command: $($next.title)\" -ForegroundColor Cyan",
    "      Invoke-AgentCommand $next",
    "    }",
    "  } catch {",
    "    Write-Warning $_.Exception.Message",
    "  }",
    "  Start-Sleep -Seconds 2",
    "}",
  ].join('\n')
}

function windowsLogRunnerScript({ source, scriptName, args = [] }, address = 'HOST_IP') {
  const base = publicUrl(address)
  const psArgs = args.join(', ')
  const authHashtable = tokenAuthRequired ? `@{'X-WinBridge-Token'='${psSingleQuote(pairingToken)}'}` : '@{}'
  return [
    "$ErrorActionPreference='Continue'",
    `$u='${psSingleQuote(base)}'`,
    `$headers=${authHashtable}`,
    `$p=Join-Path $env:TEMP '${psSingleQuote(scriptName)}'`,
    `$l=Join-Path $env:TEMP '${psSingleQuote(scriptName.replace(/\.ps1$/i, '.log'))}'`,
    `Invoke-WebRequest "$u/scripts/${psSingleQuote(scriptName)}" -Headers $headers -OutFile $p`,
    'Remove-Item $l -ErrorAction SilentlyContinue',
    "function Quote-ProcessArg([string]$Value) { '\"' + ($Value -replace '\"', '\\\"') + '\"' }",
    "$exit=1",
    "$stdout=''",
    "$stderr=''",
    "$raw=''",
    "$diag=''",
    "$argValues = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $p)",
    `$argValues += @(${psArgs})`,
    "$psi = New-Object System.Diagnostics.ProcessStartInfo",
    "$psi.FileName = 'powershell.exe'",
    "$psi.Arguments = (($argValues | ForEach-Object { Quote-ProcessArg $_ }) -join ' ')",
    "$psi.UseShellExecute = $false",
    "$psi.RedirectStandardOutput = $true",
    "$psi.RedirectStandardError = $true",
    "try {",
    "  $proc = [System.Diagnostics.Process]::Start($psi)",
    "  $stdout = $proc.StandardOutput.ReadToEnd()",
    "  $stderr = $proc.StandardError.ReadToEnd()",
    "  $proc.WaitForExit()",
    "  $exit = $proc.ExitCode",
    "  $raw = ($stdout + [Environment]::NewLine + $stderr).Trim()",
    "} catch {",
    "  $diag = $_.Exception.ToString()",
    "  $raw = $diag",
    "  $exit = 1",
    "}",
    "$raw | Out-File -FilePath $l -Encoding UTF8",
    "if($raw){Write-Host $raw}",
    "if($raw -and $raw.Length -gt 200000){$raw=$raw.Substring($raw.Length-200000)}",
    "$diagnostics = @{ arguments = $psi.Arguments; stdoutLength = $stdout.Length; stderrLength = $stderr.Length; runnerError = $diag }",
    `$body=@{source='${psSingleQuote(source)}';username=$env:USERNAME;computerName=$env:COMPUTERNAME;exitCode=$exit;log=[string]$raw;diagnostics=$diagnostics}|ConvertTo-Json -Depth 6`,
    "$uploaded=$false",
    'try { Invoke-RestMethod -Method Post -Uri "$u/api/log" -Headers $headers -ContentType "application/json" -Body $body | Out-Null; $uploaded=$true } catch { Write-Warning "Failed to upload WinBridge AI log: $($_.Exception.Message)" }',
    "Write-Host ''",
    "if($uploaded){Write-Host 'Log uploaded to WinBridge AI.'}",
    "if($exit){Write-Host \"Command failed with exit code $exit.\" -ForegroundColor Red}else{Write-Host 'Command completed successfully.' -ForegroundColor Green}",
    "Read-Host 'Press Enter to close this window'",
  ].join('\n')
}

function parseBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > maxBytes) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch (error) {
        const fallback = parseLenientAgentPayload(data)
        if (fallback) return resolve(fallback)
        reject(error)
      }
    })
  })
}

function parseLenientAgentPayload(data) {
  const agentId = data.match(/"agentId"\s*:\s*"([^"]+)"/)?.[1]
  const commandId = data.match(/"commandId"\s*:\s*"([^"]+)"/)?.[1]
  const exitCodeMatches = [...data.matchAll(/"exitCode"\s*:\s*(-?\d+)/g)]
  const exitCodeValue = exitCodeMatches.at(-1)?.[1]
  if (!agentId && !commandId) return null
  return {
    agentId: agentId || '',
    commandId: commandId || '',
    exitCode: exitCodeValue == null ? undefined : Number(exitCodeValue),
    log: stripInvalidJsonControls(data),
  }
}

function stripInvalidJsonControls(data) {
  return String(data).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function looksLikeAgentFailure(log) {
  return /Command ".+" not found|RuntimeException|exited with code [1-9]\d*|terminating error|Exception calling/i.test(
    String(log || ''),
  )
}

function normalizeState() {
  let changed = false
  for (const job of state.jobs) {
    if (job.command?.startsWith('[agent]') && typeof job.cancelRequested !== 'boolean') {
      job.cancelRequested = false
      changed = true
    }
    if (job.status === 'success' && looksLikeAgentFailure(job.log)) {
      job.status = 'failed'
      if (!job.exitCode) job.exitCode = 1
      changed = true
    }
  }
  if (changed) saveState()
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2)
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(payload)
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function listFiles(dir, hrefPrefix) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .map((name) => {
      const filePath = path.join(dir, name)
      try {
        const stat = statSync(filePath)
        if (!stat.isFile()) return null
        return {
          name,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          href: `${hrefPrefix}/${encodeURIComponent(name)}`,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)))
}

function artifacts() {
  return listFiles(artifactsDir, '/artifacts')
}

function screenshots() {
  return listFiles(screenshotsDir, '/screenshots')
}

function latestInstaller() {
  return artifacts().find((artifact) => /\.(exe|msi)$/i.test(artifact.name)) || null
}

function upsertDevice(device, requestAddress) {
  const addresses = Array.isArray(device.addresses) ? device.addresses.filter(Boolean) : []
  if (requestAddress && !addresses.includes(requestAddress)) addresses.unshift(requestAddress)
  const normalized = {
    username: String(device.username || '').trim(),
    computerName: String(device.computerName || '').trim(),
    port: Number(device.port || 22),
    addresses: [...new Set(addresses)],
    pairedAt: new Date().toISOString(),
  }
  if (!normalized.username || !normalized.computerName || normalized.addresses.length === 0) {
    throw new Error('Missing username, computerName, or addresses')
  }
  const index = state.devices.findIndex(
    (existing) => existing.username === normalized.username && existing.computerName === normalized.computerName,
  )
  if (index >= 0) state.devices[index] = normalized
  else state.devices.unshift(normalized)
  saveState()
  return normalized
}

function storeLog(payload, requestAddress) {
  const logText =
    typeof payload.log === 'string'
      ? payload.log
      : payload.log == null
        ? ''
        : JSON.stringify(payload.log, null, 2)
  const log = {
    source: String(payload.source || 'windows').trim(),
    username: String(payload.username || '').trim(),
    computerName: String(payload.computerName || '').trim(),
    exitCode: payload.exitCode ?? null,
    remoteAddress: requestAddress,
    receivedAt: new Date().toISOString(),
    log: logText,
    diagnostics: payload.diagnostics ?? null,
  }
  state.logs.unshift(log)
  state.logs = state.logs.slice(0, 30)
  saveState()
  return log
}

function upsertAgent(payload, requestAddress) {
  const agent = {
    id: String(payload.agentId || '').trim(),
    username: String(payload.username || '').trim(),
    computerName: String(payload.computerName || '').trim(),
    remoteAddress: requestAddress,
    baseUrl: String(payload.baseUrl || '').trim(),
    startedAt: String(payload.startedAt || new Date().toISOString()),
    lastSeenAt: new Date().toISOString(),
    queue: [],
  }
  if (!agent.id) throw new Error('Missing agentId')
  const index = state.agents.findIndex((candidate) => candidate.id === agent.id)
  if (index >= 0) state.agents[index] = { ...state.agents[index], ...agent, queue: state.agents[index].queue || [] }
  else state.agents.unshift(agent)
  saveState()
  return state.agents.find((candidate) => candidate.id === agent.id)
}

function findAgent(agentId) {
  const agent = state.agents.find((candidate) => candidate.id === agentId)
  if (!agent) throw new Error(`Unknown agent: ${agentId}`)
  if (!Array.isArray(agent.queue)) agent.queue = []
  return agent
}

function defaultAgent() {
  const agent = [...state.agents].sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0]
  if (!agent) throw new Error('No LAN agent connected')
  if (!Array.isArray(agent.queue)) agent.queue = []
  return agent
}

function agentBaseUrl(agent) {
  return agent.baseUrl || publicUrl(lanAddresses()[0] || '127.0.0.1')
}

function touchAgent(agentId) {
  const agent = state.agents.find((candidate) => candidate.id === agentId)
  if (agent) agent.lastSeenAt = new Date().toISOString()
  return agent
}

function queueAgentCommand(agent, title, script, options = {}) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const job = {
    id,
    command: `[agent] ${title}`,
    status: 'queued',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    cancelRequested: false,
    log: '',
  }
  state.jobs.unshift(job)
  state.jobs = state.jobs.slice(0, 20)
  agent.queue.push({ id, title, script, timeoutMs: options.timeoutMs || 600000 })
  saveState()
  return job
}

function setAgentJobProgress(payload) {
  touchAgent(String(payload.agentId || ''))
  const job = state.jobs.find((candidate) => candidate.id === payload.commandId)
  if (!job) return null
  if (['success', 'failed', 'cancelled'].includes(job.status)) return job
  job.status = job.cancelRequested ? 'cancelling' : 'running'
  if (typeof payload.log === 'string' && payload.log.length > 0) job.log = payload.log
  if (job.log.length > 200000) job.log = job.log.slice(-200000)
  saveState()
  return job
}

function setAgentJobResult(payload) {
  touchAgent(String(payload.agentId || ''))
  const job = state.jobs.find((candidate) => candidate.id === payload.commandId)
  if (!job) return null
  const exitCode = Number(payload.exitCode)
  const log = String(payload.log || '')
  const inferredFailure = looksLikeAgentFailure(log)
  const normalizedExitCode = Number.isFinite(exitCode) ? exitCode : 1
  const effectiveExitCode = normalizedExitCode === 0 && inferredFailure ? 1 : normalizedExitCode
  job.status = job.cancelRequested ? 'cancelled' : effectiveExitCode === 0 ? 'success' : 'failed'
  job.exitCode = effectiveExitCode
  job.finishedAt = new Date().toISOString()
  job.log = log
  saveState()
  return job
}

function cancelAgentJob(jobId) {
  const job = state.jobs.find((candidate) => candidate.id === jobId)
  if (!job) throw new Error(`Unknown job: ${jobId}`)
  for (const agent of state.agents) {
    if (!Array.isArray(agent.queue)) continue
    agent.queue = agent.queue.filter((command) => command.id !== jobId)
  }
  job.cancelRequested = true
  if (job.status === 'queued') {
    job.status = 'cancelled'
    job.exitCode = 130
    job.finishedAt = new Date().toISOString()
  } else if (job.status === 'running') {
    job.status = 'cancelling'
  }
  saveState()
  return job
}

function pickDevice(body = {}) {
  const device = state.devices[Number(body.deviceIndex || 0)]
  if (!device) throw new Error('No paired SSH device available')
  const address = String(body.address || device.addresses[0] || '').trim()
  if (!address) throw new Error('No address available for paired device')
  return { device, address }
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, WINBRIDGE_SSH_KEY: keyPath },
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('close', (code) => resolve({ code, output }))
  })
}

function agentTestScript() {
  return ['hostname', 'whoami', '$PSVersionTable.PSVersion.ToString()', 'Get-Location'].join('\n')
}

function agentPreflightScript() {
  return [
    '$commands = "winget", "git", "ssh", "ssh-keygen", "node", "corepack", "pnpm", "python", "py", "rustup", "cargo"',
    'foreach($name in $commands){',
    '  $cmd = Get-Command $name -ErrorAction SilentlyContinue',
    '  if($cmd){ Write-Host "$name => $($cmd.Source)" } else { Write-Host "$name => MISSING" }',
    '}',
    'Write-Host ""',
    'Write-Host "PATH:"',
    '$env:PATH -split ";" | ForEach-Object { Write-Host "  $_" }',
  ].join('\n')
}

function agentInstallEnvScript(baseUrl) {
  return [
    "$ErrorActionPreference='Stop'",
    `$u='${psSingleQuote(baseUrl)}'`,
    "$p=Join-Path $env:TEMP 'winbridge-install_windows_build_env.ps1'",
    'Invoke-WebRequest "$u/scripts/install_windows_build_env.ps1" -Headers $headers -OutFile $p',
    '& powershell -NoProfile -ExecutionPolicy Bypass -File $p',
  ].join('\n')
}

function agentInstallArtifactScript(baseUrl, artifact) {
  if (!artifact) throw new Error('No installer artifact available')
  return [
    "$ErrorActionPreference='Stop'",
    `$installerUrl='${psSingleQuote(`${baseUrl}${authenticatedPath(artifact.href)}`)}'`,
    `$installerName='${psSingleQuote(artifact.name)}'`,
    "$downloadDir=Join-Path $env:TEMP 'WinBridgeInstaller'",
    "$installer=Join-Path $downloadDir $installerName",
    "New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null",
    "Write-Host \"Downloading artifact: $installerUrl\"",
    "Invoke-WebRequest -UseBasicParsing -Uri $installerUrl -OutFile $installer",
    "Write-Host (\"Downloaded artifact: {0} ({1:n0} bytes)\" -f $installer, (Get-Item $installer).Length)",
    "try { Unblock-File -Path $installer -ErrorAction SilentlyContinue } catch { }",
    "if($installerName -match '\\.msi$'){",
    "  Write-Host 'Installing MSI silently...'",
    "  $proc=Start-Process msiexec.exe -ArgumentList @('/i', $installer, '/qn', '/norestart') -Wait -PassThru",
    "} else {",
    "  Write-Host 'Running installer with /S...'",
    "  $proc=Start-Process -FilePath $installer -ArgumentList @('/S') -Wait -PassThru",
    "}",
    "if($proc.ExitCode -ne 0){ throw \"Installer exited with code $($proc.ExitCode)\" }",
    "Write-Host 'Artifact installation completed successfully.'",
  ].join('\n')
}

function agentCaptureScreenshotScript(commandId, baseUrl) {
  const uploadPath = authenticatedPath(`/api/agent/screenshot-upload?jobId=${encodeURIComponent(commandId)}&filename=$name`)
  return [
    "$ErrorActionPreference='Stop'",
    `$u='${psSingleQuote(baseUrl)}'`,
    `$jobId='${psSingleQuote(commandId)}'`,
    "$dir=Join-Path $env:TEMP 'WinBridgeScreenshots'",
    "New-Item -ItemType Directory -Force -Path $dir | Out-Null",
    "$timestamp=Get-Date -Format 'yyyyMMdd-HHmmss'",
    "$file=Join-Path $dir (\"winbridge-screenshot-$timestamp.png\")",
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$win32=@'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "public static class WinBridgeCaptureWin32 {",
    "  [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);",
    "}",
    "'@",
    "try { Add-Type -TypeDefinition $win32 -ErrorAction SilentlyContinue } catch { }",
    "$currentPid=$PID",
    "$hidden=0",
    "$windowNamePattern='(?i)(WinBridge AI agent|Windows PowerShell|PowerShell|Command Prompt|Debuggable Package|cmd\\.exe|powershell\\.exe)'",
    "Get-Process | Where-Object {",
    "  $_.Id -ne $currentPid -and $_.MainWindowHandle -ne 0 -and (",
    "    $_.ProcessName -match '^(powershell|pwsh|WindowsTerminal|cmd|OpenConsole)$' -or",
    "    $_.MainWindowTitle -match $windowNamePattern",
    "  )",
    "} | ForEach-Object {",
    "  try { if([WinBridgeCaptureWin32]::ShowWindowAsync($_.MainWindowHandle, 6)){ $script:hidden++ } } catch { }",
    "}",
    "if($hidden -gt 0){ Write-Host \"Minimized $hidden terminal window(s) before screenshot.\"; Start-Sleep -Milliseconds 600 }",
    "$bounds=[System.Windows.Forms.SystemInformation]::VirtualScreen",
    "$bitmap=New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height",
    "$graphics=[System.Drawing.Graphics]::FromImage($bitmap)",
    "try {",
    "  $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)",
    "  $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)",
    "} finally {",
    "  $graphics.Dispose()",
    "  $bitmap.Dispose()",
    "}",
    "Write-Host (\"Captured screenshot: {0} ({1:n0} bytes)\" -f $file, (Get-Item $file).Length)",
    "$name=[Uri]::EscapeDataString((Split-Path -Leaf $file))",
    `$uri="$u${psSingleQuote(uploadPath)}"`,
    "if(Get-Command curl.exe -ErrorAction SilentlyContinue){",
    "  & curl.exe --fail --silent --show-error --request POST --connect-timeout 30 --max-time 300 --header 'Content-Type: image/png' --data-binary \"@$file\" $uri | Out-Null",
    "  if($LASTEXITCODE -ne 0){ throw \"curl.exe failed to upload screenshot with exit code $LASTEXITCODE\" }",
    "} else {",
    "  Invoke-WebRequest -TimeoutSec 300 -Method Post -Uri $uri -InFile $file -ContentType 'image/png' | Out-Null",
    "}",
    "Write-Host 'Screenshot uploaded.'",
  ].join('\n')
}

function renderPage(req) {
  const hostAddress = defaultHostAddress(req)
  const urls = lanAddresses().map((address) => publicPairingUrl(address))
  const bootstrap = bootstrapCommand(hostAddress)
  const install = installEnvCommand(hostAddress)
  const agent = agentCommand(hostAddress)
  const browserToken = tokenAuthRequired ? pairingToken : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${productName}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f5f7fb;
      --surface: #ffffff;
      --surface-2: #edf2f8;
      --text: #151922;
      --muted: #5f6b7a;
      --line: #d7dee9;
      --primary: #1769e0;
      --primary-text: #ffffff;
      --accent: #0f9f77;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    main { max-width: 1120px; margin: 0 auto; padding: 28px 20px 56px; }
    section, details { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin-top: 16px; }
    h1 { margin: 0 0 10px; font-size: clamp(32px, 6vw, 58px); line-height: 0.96; max-width: 760px; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    h3 { margin: 0 0 8px; font-size: 16px; }
    p { line-height: 1.55; }
    a { color: #1769e0; }
    code, pre, textarea { font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #10141c; color: #edf3ff; border-radius: 8px; padding: 14px; }
    textarea { width: 100%; border: 1px solid #b7c1d1; border-radius: 8px; padding: 10px; background: transparent; color: inherit; }
    textarea.command-box { min-height: 148px; margin-top: 14px; background: #10141c; color: #edf3ff; border-color: #10141c; resize: vertical; }
    button { border: 1px solid #b7c1d1; background: var(--surface); color: var(--text); border-radius: 6px; padding: 9px 12px; cursor: pointer; margin: 0 8px 8px 0; font: inherit; }
    button.primary { border-color: var(--primary); background: var(--primary); color: var(--primary-text); font-weight: 800; }
    button.copy-main { min-height: 56px; padding: 0 22px; font-size: 17px; }
    summary { cursor: pointer; font-weight: 800; }
    details > div { margin-top: 14px; }
    .muted { color: var(--muted); }
    .eyebrow { margin: 0 0 12px; color: var(--accent); font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .hero { background: linear-gradient(135deg, #ffffff, #eef5ff); padding: 28px; }
    .agent-primary { border-color: rgba(23, 105, 224, 0.45); box-shadow: 0 18px 60px rgba(23, 105, 224, 0.12); }
    .agent-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: end; }
    .step-label { display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 999px; background: #e6f7f2; color: #08775b; font-weight: 900; font-size: 13px; }
    .copy-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; }
    .copy-status { min-height: 24px; color: var(--accent); font-weight: 700; }
    .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin-top: 16px; border: 1px solid var(--line); background: var(--line); }
    .steps article { min-width: 0; padding: 14px; background: var(--surface); }
    .steps span { color: var(--primary); font-weight: 900; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .item { border: 1px solid #e0e5ee; border-radius: 8px; padding: 12px; margin-top: 10px; }
    .log { max-height: 420px; overflow: auto; }
    img.shot { max-width: 100%; height: auto; border: 1px solid #d8dde6; border-radius: 6px; }
    .secondary-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #101318;
        --surface: #181c24;
        --surface-2: #202735;
        --text: #ecf0f7;
        --muted: #a7b1c2;
        --line: #303744;
        --primary: #7ab0ff;
        --primary-text: #07101f;
        --accent: #8ee6c8;
      }
      .hero { background: linear-gradient(135deg, #171d27, #111827); }
      .step-label { background: rgba(142, 230, 200, 0.14); color: var(--accent); }
      button { background: #202632; border-color: #4a5568; }
      .item { border-color: #303744; }
    }
    @media (max-width: 760px) {
      main { padding: 18px 12px 44px; }
      .hero { padding: 20px; }
      .agent-header, .steps { grid-template-columns: 1fr; }
      button.copy-main { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p class="eyebrow">Windows pairing page</p>
      <h1>Start the Windows LAN Agent.</h1>
      <p class="muted">Run the generated PowerShell command on this Windows machine, then keep that PowerShell window open so the Mac-side AI can operate Windows.</p>
    </section>

    <section class="agent-primary">
      <div class="agent-header">
        <div>
          <span class="step-label">Step 1</span>
          <h2>Copy and run this Agent command</h2>
          <p class="muted">Click the button, paste the command into Windows PowerShell, and press Enter.</p>
        </div>
        <button class="primary copy-main" onclick="copyText('agent', this)">Copy Agent Command</button>
      </div>
      <textarea id="agent" class="command-box" readonly spellcheck="false" aria-label="Windows LAN Agent command">${htmlEscape(agent)}</textarea>
      <div class="copy-row">
        <button onclick="copyText('agent', this)">Copy again</button>
        <span id="agent-copy-status" class="copy-status" aria-live="polite"></span>
      </div>
      <div class="steps">
        <article><span>01</span><h3>Copy</h3><p class="muted">Use the primary button above.</p></article>
        <article><span>02</span><h3>Paste in PowerShell</h3><p class="muted">Run it on this Windows computer.</p></article>
        <article><span>03</span><h3>Keep it open</h3><p class="muted">The Mac can operate Windows while the Agent stays connected.</p></article>
      </div>
    </section>

    <section>
      <h2>Connection Status</h2>
      <div id="agents" class="muted">Loading...</div>
      <p>
        <button onclick="refreshStatus()">Refresh</button>
        <button onclick="testAgent()">Test Agent</button>
        <button onclick="captureScreenshot()">Capture Screenshot</button>
      </p>
    </section>

    <section>
      <h2>Mac pairing URL</h2>
      <p class="muted">You are already on this page. These URLs are shown only for checking the address from another Windows browser.</p>
      <div class="grid">${urls.map((url) => `<pre>${htmlEscape(url)}</pre>`).join('')}</div>
    </section>

    <details>
      <summary>Optional setup commands</summary>
      <div class="secondary-actions">
        <div>
          <h3>Optional SSH Bootstrap</h3>
          <textarea id="bootstrap" class="command-box" readonly spellcheck="false" aria-label="Optional SSH Bootstrap command">${htmlEscape(bootstrap)}</textarea>
          <button onclick="copyText('bootstrap', this)">Copy SSH Bootstrap</button>
        </div>
        <div>
          <h3>Optional Build Environment</h3>
          <textarea id="install" class="command-box" readonly spellcheck="false" aria-label="Optional Build Environment command">${htmlEscape(install)}</textarea>
          <button onclick="copyText('install', this)">Copy Installer Command</button>
        </div>
      </div>
    </details>

    <section>
      <h2>Run PowerShell on Windows</h2>
      <textarea id="customScript" rows="8" placeholder="PowerShell script to run on the connected Windows agent"></textarea>
      <p>
        <button class="primary" onclick="runPowerShell()">Run PowerShell</button>
        <button onclick="preflightAgent()">Preflight</button>
        <button onclick="installEnvViaAgent()">Install Build Env</button>
        <button class="primary" onclick="installLatestArtifact()">Install Latest Artifact</button>
      </p>
    </section>

    <section>
      <h2>Artifacts</h2>
      <div id="artifacts" class="muted">Loading...</div>
    </section>

    <section>
      <h2>Screenshots</h2>
      <div id="screenshots" class="muted">Loading...</div>
    </section>

    <section>
      <h2>SSH Devices</h2>
      <div id="devices" class="muted">Loading...</div>
      <p>
        <button onclick="testSsh()">Test SSH</button>
      </p>
    </section>

    <section>
      <h2>Uploaded Logs</h2>
      <textarea id="manualLog" rows="7" placeholder="Paste Windows console output here"></textarea>
      <p><button onclick="uploadManualLog()">Upload Manual Log</button></p>
      <div id="logs" class="muted">Loading...</div>
    </section>

    <section>
      <h2>Jobs</h2>
      <div id="jobs" class="muted">Loading...</div>
    </section>
  </main>
  <script>
    const winbridgeToken = ${JSON.stringify(browserToken)};
    function showCopyStatus(id, message) {
      const status = document.getElementById(id + '-copy-status');
      if (!status) return;
      status.textContent = message;
      window.clearTimeout(status._timer);
      status._timer = window.setTimeout(() => {
        status.textContent = '';
      }, 2400);
    }
    function commandText(id) {
      const element = document.getElementById(id);
      return element.value !== undefined ? element.value : element.textContent;
    }
    function selectCommand(id) {
      const element = document.getElementById(id);
      if (!element) return;
      if (typeof element.focus === 'function') element.focus();
      if (typeof element.select === 'function') {
        element.select();
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    function setButtonCopied(button) {
      const original = button ? button.textContent : '';
      if (!button) return;
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    }
    async function copyText(id, button) {
      const text = commandText(id);
      try {
        let copied = false;
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          copied = true;
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.top = '-1000px';
          document.body.appendChild(textarea);
          textarea.select();
          copied = document.execCommand('copy');
          textarea.remove();
        }
        if (!copied) {
          selectCommand(id);
          showCopyStatus(id, 'Copy was blocked by the browser. Press Ctrl+C to copy the selected command.');
          return;
        }
        setButtonCopied(button);
        showCopyStatus(id, 'Copied. Paste it into Windows PowerShell and press Enter.');
      } catch (error) {
        selectCommand(id);
        showCopyStatus(id, 'Copy was blocked by the browser. Press Ctrl+C to copy the selected command.');
      }
    }
    async function api(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (winbridgeToken) headers['X-WinBridge-Token'] = winbridgeToken;
      const response = await fetch(path, {
        ...options,
        headers,
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch { payload = text; }
      if (!response.ok) throw new Error(typeof payload === 'string' ? payload : payload.error || response.statusText);
      return payload;
    }
    function escapeHtml(value) {
      return String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    }
    function formatBytes(value) {
      const bytes = Number(value || 0);
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }
    function isCancellableAgentJob(job) {
      return String(job.command || '').startsWith('[agent]') && ['queued', 'running', 'cancelling'].includes(job.status);
    }
    function renderStatus(status) {
      const artifacts = document.getElementById('artifacts');
      if (!status.artifacts.length) {
        artifacts.textContent = 'No artifacts yet. Put installers in the artifacts directory.';
      } else {
        artifacts.innerHTML = status.artifacts.map((artifact) => '<div class="item"><strong>' +
          escapeHtml(artifact.name) + '</strong><br><span class="muted">' + formatBytes(artifact.size) +
          ' - ' + escapeHtml(artifact.mtime) + '</span><p><a href="' +
          escapeHtml(artifact.href) + '">Download</a></p></div>').join('');
      }

      const screenshots = document.getElementById('screenshots');
      if (!status.screenshots.length) {
        screenshots.textContent = 'No screenshots yet.';
      } else {
        screenshots.innerHTML = status.screenshots.slice(0, 8).map((shot) => '<div class="item"><strong>' +
          escapeHtml(shot.name) + '</strong><br><span class="muted">' + formatBytes(shot.size) +
          ' - ' + escapeHtml(shot.mtime) + '</span><p><a href="' + escapeHtml(shot.href) +
          '" target="_blank">Open</a></p><img class="shot" alt="Windows screenshot" src="' +
          escapeHtml(shot.href) + '" /></div>').join('');
      }

      const devices = document.getElementById('devices');
      if (!status.devices.length) {
        devices.textContent = 'No paired SSH device yet.';
      } else {
        devices.innerHTML = status.devices.map((device) => '<div class="item"><strong>' +
          escapeHtml(device.username) + '@' + escapeHtml(device.computerName) + '</strong><br>Addresses: ' +
          escapeHtml(device.addresses.join(', ')) + '<br>Port: ' + escapeHtml(device.port) +
          '<br>Paired: ' + escapeHtml(device.pairedAt) + '</div>').join('');
      }

      const agents = document.getElementById('agents');
      if (!status.agents.length) {
        agents.textContent = 'No LAN agent connected yet.';
      } else {
        agents.innerHTML = status.agents.map((agent) => '<div class="item"><strong>' +
          escapeHtml(agent.username || '') + '@' + escapeHtml(agent.computerName || '') +
          '</strong><br>ID: ' + escapeHtml(agent.id) +
          '<br>Address: ' + escapeHtml(agent.remoteAddress || '') +
          '<br>Base URL: ' + escapeHtml(agent.baseUrl || '') +
          '<br>Last seen: ' + escapeHtml(agent.lastSeenAt || '') +
          '<br>Queued: ' + escapeHtml((agent.queue || []).length) + '</div>').join('');
      }

      const logs = document.getElementById('logs');
      if (!status.logs.length) {
        logs.textContent = 'No uploaded logs yet.';
      } else {
        logs.innerHTML = status.logs.map((entry) => '<div class="item"><strong>' +
          escapeHtml(entry.source) + '</strong> exit=' + escapeHtml(entry.exitCode) + ' ' +
          escapeHtml(entry.username || '') + '@' + escapeHtml(entry.computerName || '') +
          '<br><span class="muted">' + escapeHtml(entry.receivedAt) + ' from ' +
          escapeHtml(entry.remoteAddress || '') + '</span><pre class="log">' +
          escapeHtml(entry.log || '') + '</pre></div>').join('');
      }

      const jobs = document.getElementById('jobs');
      if (!status.jobs.length) {
        jobs.textContent = 'No jobs yet.';
      } else {
        jobs.innerHTML = status.jobs.map((job) => '<div class="item"><strong>' + escapeHtml(job.status) +
          '</strong> ' + escapeHtml(job.command) + '<br><span class="muted">' + escapeHtml(job.startedAt) +
          (job.finishedAt ? ' - ' + escapeHtml(job.finishedAt) : '') + '</span>' +
          (isCancellableAgentJob(job) ? '<p><button onclick="cancelAgentJob(\\'' + escapeHtml(job.id) + '\\')">Cancel Agent Job</button></p>' : '') +
          '<pre class="log">' + escapeHtml(job.log || '') + '</pre></div>').join('');
      }
    }
    async function refreshStatus() {
      renderStatus(await api('/api/status'));
    }
    async function testSsh() {
      const result = await api('/api/test-ssh', { method: 'POST', body: '{}' });
      alert(result.output || ('Exit code: ' + result.code));
      await refreshStatus();
    }
    async function testAgent() {
      const result = await api('/api/agent/test', { method: 'POST', body: '{}' });
      alert('Queued agent test job ' + result.id);
      await refreshStatus();
    }
    async function preflightAgent() {
      const result = await api('/api/agent/preflight', { method: 'POST', body: '{}' });
      alert('Queued preflight job ' + result.id);
      await refreshStatus();
    }
    async function installEnvViaAgent() {
      const result = await api('/api/agent/install-env', { method: 'POST', body: '{}' });
      alert('Queued build environment installation job ' + result.id);
      await refreshStatus();
    }
    async function captureScreenshot() {
      const result = await api('/api/agent/capture-screenshot', { method: 'POST', body: '{}' });
      alert('Queued screenshot job ' + result.id);
      await refreshStatus();
    }
    async function installLatestArtifact() {
      const result = await api('/api/agent/install-artifact', { method: 'POST', body: '{}' });
      alert('Queued artifact installation job ' + result.id);
      await refreshStatus();
    }
    async function runPowerShell() {
      const textarea = document.getElementById('customScript');
      const script = textarea.value.trim();
      if (!script) {
        alert('Enter a PowerShell script first.');
        return;
      }
      const result = await api('/api/agent/run-powershell', {
        method: 'POST',
        body: JSON.stringify({ title: 'Custom PowerShell', script }),
      });
      alert('Queued PowerShell job ' + result.id);
      await refreshStatus();
    }
    async function cancelAgentJob(jobId) {
      await api('/api/agent/cancel', { method: 'POST', body: JSON.stringify({ jobId }) });
      await refreshStatus();
    }
    async function uploadManualLog() {
      const textarea = document.getElementById('manualLog');
      const log = textarea.value.trim();
      if (!log) {
        alert('Paste log output first.');
        return;
      }
      await api('/api/log', {
        method: 'POST',
        body: JSON.stringify({ source: 'manual', username: '', computerName: '', exitCode: null, log }),
      });
      textarea.value = '';
      await refreshStatus();
    }
    refreshStatus();
    setInterval(refreshStatus, 3000);
  </script>
</body>
</html>`
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${port}`}`)
    const localAddress = defaultHostAddress(req)

    if (req.method === 'GET' && url.pathname === '/') {
      if (!isAuthorizedRequest(req, url)) return send(res, 401, renderLockedPage(req))
      return send(res, 200, renderPage(req))
    }

    if (!isAuthorizedRequest(req, url)) {
      return send(res, 401, { error: 'Unauthorized. Use the pairing URL printed by WinBridge AI.' })
    }

    if (req.method === 'GET' && url.pathname === '/scripts/bootstrap_windows_ssh.ps1') {
      return sendText(res, 200, readFileSync(path.join(scriptsDir, 'bootstrap_windows_ssh.ps1')), 'text/plain; charset=utf-8')
    }

    if (req.method === 'GET' && url.pathname === '/scripts/install_windows_build_env.ps1') {
      return sendText(res, 200, readFileSync(path.join(scriptsDir, 'install_windows_build_env.ps1')), 'text/plain; charset=utf-8')
    }

    if (req.method === 'GET' && url.pathname === '/run_bootstrap.ps1') {
      return sendText(
        res,
        200,
        windowsLogRunnerScript(
          {
            source: 'bootstrap',
            scriptName: 'bootstrap_windows_ssh.ps1',
            args: [
              "'-PublicKey'",
              `'${psSingleQuote(publicKey)}'`,
              "'-PairingServerUrl'",
              '$u',
              "'-MacPrivateKeyPath'",
              `'${psSingleQuote(keyPath)}'`,
            ],
          },
          localAddress,
        ),
        'text/plain; charset=utf-8',
      )
    }

    if (req.method === 'GET' && url.pathname === '/run_install_env.ps1') {
      return sendText(
        res,
        200,
        windowsLogRunnerScript({ source: 'install-env', scriptName: 'install_windows_build_env.ps1' }, localAddress),
        'text/plain; charset=utf-8',
      )
    }

    if (req.method === 'GET' && url.pathname === '/run_agent.ps1') {
      console.log(`Serving LAN agent script to ${normalizeRemoteAddress(req.socket.remoteAddress)}`)
      return sendText(res, 200, windowsAgentScript(localAddress), 'text/plain; charset=utf-8')
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      return send(res, 200, {
        devices: state.devices,
        jobs: state.jobs,
        logs: state.logs,
        agents: state.agents,
        artifacts: artifacts(),
        screenshots: screenshots(),
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/pair') {
      const body = await parseBody(req)
      const paired = upsertDevice(body, normalizeRemoteAddress(req.socket.remoteAddress))
      console.log(`Paired ${paired.username}@${paired.computerName}: ${paired.addresses.join(', ')}`)
      return send(res, 200, { ok: true, device: paired })
    }

    if (req.method === 'POST' && url.pathname === '/api/log') {
      const body = await parseBody(req, 4 * 1024 * 1024)
      const log = storeLog(body, normalizeRemoteAddress(req.socket.remoteAddress))
      console.log(`Received Windows log: ${log.source} exit=${log.exitCode}`)
      return send(res, 200, { ok: true })
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/register') {
      const body = await parseBody(req)
      const agent = upsertAgent(body, normalizeRemoteAddress(req.socket.remoteAddress))
      console.log(`Agent connected: ${agent.id}`)
      return send(res, 200, { ok: true })
    }

    if (req.method === 'GET' && url.pathname === '/api/agent/next') {
      const agent = findAgent(url.searchParams.get('agentId') || '')
      agent.lastSeenAt = new Date().toISOString()
      const command = agent.queue.shift() || null
      if (command) {
        const job = state.jobs.find((candidate) => candidate.id === command.id)
        if (job) job.status = 'running'
      }
      saveState()
      return send(res, 200, command || {})
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/progress') {
      const body = await parseBody(req, 4 * 1024 * 1024)
      const job = setAgentJobProgress(body)
      return send(res, 200, { ok: true, cancel: Boolean(job?.cancelRequested) })
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/result') {
      const body = await parseBody(req, 4 * 1024 * 1024)
      setAgentJobResult(body)
      return send(res, 200, { ok: true })
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/cancel') {
      const body = await parseBody(req)
      const job = cancelAgentJob(String(body.jobId || ''))
      return send(res, 200, { ok: true, job })
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/test') {
      const job = queueAgentCommand(defaultAgent(), 'Test Agent', agentTestScript())
      return send(res, 200, job)
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/preflight') {
      const job = queueAgentCommand(defaultAgent(), 'Preflight', agentPreflightScript())
      return send(res, 200, job)
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/install-env') {
      const agent = defaultAgent()
      const job = queueAgentCommand(agent, 'Install Windows Build Environment', agentInstallEnvScript(agentBaseUrl(agent)), {
        timeoutMs: 2 * 60 * 60 * 1000,
      })
      return send(res, 200, job)
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/install-artifact') {
      const agent = defaultAgent()
      const artifact = latestInstaller()
      const job = queueAgentCommand(agent, 'Install Latest Artifact', agentInstallArtifactScript(agentBaseUrl(agent), artifact), {
        timeoutMs: 30 * 60 * 1000,
      })
      return send(res, 200, job)
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/capture-screenshot') {
      const agent = defaultAgent()
      const job = queueAgentCommand(agent, 'Capture Screenshot', '', { timeoutMs: 5 * 60 * 1000 })
      agent.queue[agent.queue.length - 1].script = agentCaptureScreenshotScript(job.id, agentBaseUrl(agent))
      saveState()
      return send(res, 200, job)
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/run-powershell') {
      const body = await parseBody(req)
      const script = String(body.script || '').trim()
      if (!script) return send(res, 400, { error: 'Missing script' })
      const title = String(body.title || 'Custom PowerShell').trim().slice(0, 80) || 'Custom PowerShell'
      const timeoutMs = Number(body.timeoutMs || 10 * 60 * 1000)
      const job = queueAgentCommand(defaultAgent(), title, script, { timeoutMs })
      return send(res, 200, job)
    }

    if (req.method === 'GET' && url.pathname.startsWith('/artifacts/')) {
      const filename = path.basename(decodeURIComponent(url.pathname.slice('/artifacts/'.length)))
      const filePath = path.join(artifactsDir, filename)
      if (!filename || !existsSync(filePath)) return send(res, 404, { error: 'Artifact not found' })
      const stat = statSync(filePath)
      if (!stat.isFile()) return send(res, 404, { error: 'Artifact not found' })
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${headerValue(filename)}"`,
        'Cache-Control': 'no-store',
      })
      createReadStream(filePath).pipe(res)
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/screenshots/')) {
      const filename = path.basename(decodeURIComponent(url.pathname.slice('/screenshots/'.length)))
      const filePath = path.join(screenshotsDir, filename)
      if (!filename || !existsSync(filePath)) return send(res, 404, { error: 'Screenshot not found' })
      const stat = statSync(filePath)
      if (!stat.isFile()) return send(res, 404, { error: 'Screenshot not found' })
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      })
      createReadStream(filePath).pipe(res)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/screenshot-upload') {
      const filename = path.basename(url.searchParams.get('filename') || '')
      if (!filename) return send(res, 400, { error: 'Missing filename' })
      mkdirSync(screenshotsDir, { recursive: true })
      const outPath = path.join(screenshotsDir, filename)
      const writer = createWriteStream(outPath)
      req.pipe(writer)
      writer.on('finish', () => {
        console.log(`Downloaded Windows screenshot: ${outPath}`)
        send(res, 200, { ok: true, path: outPath })
      })
      writer.on('error', (error) => send(res, 500, { error: error.message }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/artifact-upload') {
      const filename = path.basename(url.searchParams.get('filename') || '')
      if (!filename) return send(res, 400, { error: 'Missing filename' })
      mkdirSync(artifactsDir, { recursive: true })
      const outPath = path.join(artifactsDir, filename)
      const writer = createWriteStream(outPath)
      req.pipe(writer)
      writer.on('finish', () => {
        console.log(`Downloaded Windows artifact: ${outPath}`)
        send(res, 200, { ok: true, path: outPath })
      })
      writer.on('error', (error) => send(res, 500, { error: error.message }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/test-ssh') {
      const body = await parseBody(req)
      const { device, address } = pickDevice(body)
      const remote = `${device.username}@${address}`
      const result = await runCommand('ssh', [
        '-i',
        keyPath,
        '-p',
        String(device.port || 22),
        '-o',
        'IdentitiesOnly=yes',
        '-o',
        'StrictHostKeyChecking=accept-new',
        '-o',
        'ConnectTimeout=10',
        remote,
        'hostname',
      ])
      return send(res, result.code === 0 ? 200 : 500, result)
    }

    return send(res, 404, { error: 'Not found' })
  } catch (error) {
    console.error(error)
    return send(res, 500, { error: error.message || String(error) })
  }
})

server.listen(port, '0.0.0.0', () => {
  mkdirSync(artifactsDir, { recursive: true })
  console.log(`${productName} server is running.`)
  console.log(`SSH key: ${keyPath}`)
  console.log(`State: ${stateDir}`)
  console.log(`Artifacts: ${artifactsDir}`)
  console.log(`Auth: ${tokenAuthRequired ? 'pairing token enabled' : 'disabled by default'}`)
  console.log('')
  console.log('Open one of these pairing URLs from the Windows computer:')
  for (const address of lanAddresses()) {
    console.log(`  ${publicPairingUrl(address)}`)
  }
  console.log('')
  console.log('Keep this process running while controlling Windows.')
})
