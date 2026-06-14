# WinBridge AI

[English](README.md) | [中文](README_CN.md)

Operate a Windows computer from a Mac-side AI.

WinBridge AI is a local-first operation layer for controlling Windows machines
from a Mac. It gives a Mac-side AI a practical execution surface on Windows:
run commands and scripts, inspect the environment, move files, launch processes,
install software, capture screenshots, collect logs, and close the loop through
visual or command output. Windows does not need an AI runtime or development
setup up front. Start the bridge on the Mac, run the generated one-line command
on Windows, then operate the machine from the Mac control plane.

## Status

This repository is the extracted product seed from GitMemo's Windows control and
build helper. The current version is useful for trusted-LAN operation,
development, debugging, build, QA, and verification workflows. It is not yet a
hardened remote-access product.

## Quick Start

On the Mac, start WinBridge AI:

```bash
npm start
```

The Mac terminal prints one or more pairing URLs, for example:

```text
http://192.168.0.110:47832/
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
- optional pairing token: `.state/pairing-token`
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
- `WINBRIDGE_AUTH_REQUIRED=1`: require token checks for the web console, API, and Windows agent callbacks
- `WINBRIDGE_AUTH=token`: alternative way to require token checks
- `WINBRIDGE_PAIRING_TOKEN`: provide a fixed token and enable token checks
- `WINBRIDGE_AUTH_DISABLED=1`: force token checks off, even if another auth variable is present

## Product Shape

WinBridge AI is meant to become a general Mac-to-Windows AI operation layer. The
core idea is broader than build automation: once a Windows machine is connected,
the Mac-side AI should be able to do anything that the current Windows user,
PowerShell/scripts, files, processes, installed tools, and screen feedback allow.

Examples:

- execute Windows commands from AI tools;
- inspect system state, environment variables, files, processes, and logs;
- upload, download, create, edit, and delete files when permitted;
- launch apps, installers, tests, scripts, and diagnostic tools;
- capture screenshots so the AI can reason about visible Windows state;
- install software or artifacts as one use case, not the whole product;
- run build, QA, reproduction, repair, and operations templates;
- eventually expose MCP tools for Codex, Claude, Cursor, and other agents.

The boundary is the Windows permissions and automation surface available to the
connected agent. WinBridge AI should not be described as a single-purpose build
or installer tool; build and installation are just examples of operating
Windows from the Mac.

## Security Model

WinBridge AI binds to `0.0.0.0` so Windows machines on the LAN can reach it.
Token checks are off by default to keep the Windows pairing flow copy-paste
friendly on a trusted LAN. To require a token, start the server with:

```bash
WINBRIDGE_AUTH_REQUIRED=1 npm start
```

When token checks are enabled, the printed pairing URL becomes sensitive. Run
WinBridge AI only on trusted networks and stop the server when work is finished.

Read [docs/security.md](docs/security.md) before exposing this beyond a trusted
LAN.

## Website

The standalone product website lives in [website/](website/). It is currently a
static site and can be opened directly:

```bash
open website/index.html
```
