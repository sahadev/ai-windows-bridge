# Security Model

WinBridge AI is a local-first control bridge. The Mac runs the control plane and
Windows runs a polling PowerShell agent. Any connected agent can execute queued
PowerShell scripts, so access to the pairing URL must be treated as sensitive.

## Defaults

- The server listens on `0.0.0.0` so Windows machines on the same LAN can reach
  it.
- A local pairing token is generated at `.state/pairing-token`.
- Web console, API routes, file routes, and Windows agent callbacks require the
  token by default.
- The token is embedded into the generated Windows commands.
- Runtime state, logs, screenshots, and generated SSH keys stay under `.state/`.

## Operator Rules

- Use WinBridge AI only on networks you trust.
- Do not paste the pairing URL into chats, tickets, logs, or public documents.
- Stop the server when the Windows session is complete.
- Delete `.state/pairing-token` to rotate the local token.
- Delete `.state/ssh/` or remove the Windows `authorized_keys` entry to revoke
  optional SSH access.

## Explicit Testing Bypass

Set this only for local experiments:

```bash
WINBRIDGE_AUTH_DISABLED=1 npm start
```

Do not use this setting on shared networks.

## Not Yet Implemented

- TLS for non-LAN operation.
- Per-agent permissions.
- Signed persistent Windows agent identity.
- Secret redaction in logs.
- Human approval gates for dangerous commands.

Those should land before positioning this as a remote internet control product.
