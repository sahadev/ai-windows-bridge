# Agent Protocol

WinBridge AI uses a simple Mac-hosted HTTP polling protocol.

## Pairing

1. Mac starts `server.mjs`.
2. Mac prints a tokenized pairing URL.
3. Windows opens the URL and copies the generated agent command.
4. Windows agent posts registration data to `/api/agent/register`.
5. Mac stores the agent in `.state/state.json`.

## Authentication

Requests are authorized when one of these values matches the pairing token:

- `X-WinBridge-Token: <token>`
- `Authorization: Bearer <token>`
- `?token=<token>`

The query token exists so one-line Windows commands can download scripts without
manual header setup.

## Job Lifecycle

1. Mac queues a command through `/api/agent/*`.
2. Windows polls `/api/agent/next?agentId=<id>`.
3. Windows runs the PowerShell script in a hidden child process.
4. Windows posts progress snapshots to `/api/agent/progress`.
5. Windows posts final exit code and logs to `/api/agent/result`.
6. Mac updates the job state.

Job states:

- `queued`
- `running`
- `cancelling`
- `cancelled`
- `success`
- `failed`

## Current API Surface

- `GET /api/status`
- `POST /api/agent/register`
- `GET /api/agent/next`
- `POST /api/agent/progress`
- `POST /api/agent/result`
- `POST /api/agent/cancel`
- `POST /api/agent/test`
- `POST /api/agent/preflight`
- `POST /api/agent/install-env`
- `POST /api/agent/install-artifact`
- `POST /api/agent/capture-screenshot`
- `POST /api/agent/run-powershell`
- `POST /api/agent/screenshot-upload`
- `POST /api/agent/artifact-upload`
- `GET /artifacts/:filename`
- `GET /screenshots/:filename`

## MCP Direction

The next product layer should expose the same control plane through MCP tools:

- `list_windows_agents`
- `run_windows_powershell`
- `capture_windows_screenshot`
- `upload_windows_artifact`
- `install_windows_artifact`
- `get_windows_job`
- `cancel_windows_job`
- `read_windows_logs`
