# WinBridge AI

Control a Windows computer from a Mac-side AI.

WinBridge AI is a local-first bridge for pairing with Windows machines, running
PowerShell jobs, collecting logs, serving artifacts, installing builds, and
capturing screenshots. Windows does not need an AI runtime or development setup
up front. Start the bridge on the Mac, run the generated one-line command on
Windows, then operate the machine from the Mac control plane.

## Status

This repository is the extracted product seed from GitMemo's Windows build
helper. The current version is useful for LAN-based development and verification.
It is not yet a hardened remote-access product.

## Quick Start

On the Mac, start WinBridge AI:

```bash
npm start
```

The Mac terminal prints one or more pairing URLs, for example:

```text
http://192.168.0.110:47832/?token=...
```

On the Windows computer:

1. Open that printed URL in a Windows browser.
2. Find the **LAN Agent** section.
3. Click **Copy Agent Command**.
4. Paste it into Windows PowerShell and run it.
5. Keep that PowerShell window open while the Mac controls Windows.

That page also provides optional commands for:

- starting the polling Windows agent without SSH;
- optionally bootstrapping OpenSSH Server;
- optionally installing a Windows build environment.

Once the Windows agent says it is connected, return to the Mac. Use the web
console that is already open in the browser, or use the CLI:

```bash
npm run status
npm run run -- "hostname; whoami"
npm run screenshot
```

In other words, the normal flow is still:

```text
Mac starts server -> Windows browser opens Mac URL -> Windows copies/runs agent command -> Mac controls Windows
```

## Runtime Data

By default, local runtime state stays inside this repository:

- state and logs: `.state/state.json`
- pairing token: `.state/pairing-token`
- generated SSH key: `.state/ssh/winbridge_windows_ed25519`
- screenshots: `.state/screenshots/`
- files served to Windows: `artifacts/`

Drop an installer into `artifacts/`, then use **Install Latest Artifact** from
the web console or run:

```bash
npm run install-artifact
```

## Environment Variables

- `WINBRIDGE_PORT`: server port, default `47832`
- `WINBRIDGE_STATE_DIR`: custom state directory
- `WINBRIDGE_ARTIFACTS_DIR`: custom artifact directory
- `WINBRIDGE_SSH_KEY`: custom SSH private key path
- `WINBRIDGE_PAIRING_TOKEN`: override the generated local pairing token
- `WINBRIDGE_AUTH_DISABLED=1`: disable token checks for trusted local testing

## Product Shape

WinBridge AI is meant to become a general Mac-to-Windows AI operation layer:

- execute Windows commands from AI tools;
- inspect environment and logs;
- capture screenshots for visual verification;
- upload and install artifacts;
- run build or test templates;
- eventually expose MCP tools for Codex, Claude, Cursor, and other agents.

## Security Model

WinBridge AI binds to `0.0.0.0` so Windows machines on the LAN can reach it. API
and agent routes are protected by a local pairing token by default. Treat the
printed pairing URL as a secret, run only on trusted networks, and stop the
server when work is finished.

Read [docs/security.md](docs/security.md) before exposing this beyond a trusted
LAN.

## Website

The standalone product website lives in [website/](website/). It is currently a
static site and can be opened directly:

```bash
open website/index.html
```
