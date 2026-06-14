# Security Model

WinBridge AI is a local-first control bridge. The Mac runs the control plane and
Windows runs a polling PowerShell agent. Any connected agent can execute queued
PowerShell scripts, so access to the pairing URL must be treated as sensitive.

## Defaults

- The server listens on `0.0.0.0` so Windows machines on the same LAN can reach
  it.
- Token checks are off by default for trusted LAN use.
- When token checks are enabled, a local pairing token is generated at
  `.state/pairing-token`.
- When token checks are enabled, web console, API routes, file routes, and
  Windows agent callbacks require the token.
- When token checks are enabled, the token is embedded into the generated
  Windows commands.
- Runtime state, logs, screenshots, and generated SSH keys stay under `.state/`.

## Operator Rules

- Use WinBridge AI only on networks you trust.
- If token checks are enabled, do not paste the pairing URL into chats, tickets,
  logs, or public documents.
- Stop the server when the Windows session is complete.
- Delete `.state/pairing-token` to rotate the local token.
- Delete `.state/ssh/` or remove the Windows `authorized_keys` entry to revoke
  optional SSH access.

## Optional Token Mode

Require token checks when you want a stricter trusted-LAN session:

```bash
WINBRIDGE_AUTH_REQUIRED=1 npm start
```

Equivalent form:

```bash
WINBRIDGE_AUTH=token npm start
```

Providing a fixed token also enables token checks:

```bash
WINBRIDGE_PAIRING_TOKEN="choose-a-long-random-token" npm start
```

## Explicit Bypass

Token checks are already off by default. This override is only useful when a
parent environment sets auth variables and you need to force them off:

```bash
WINBRIDGE_AUTH_DISABLED=1 npm start
```

## Not Yet Implemented

- TLS for non-LAN operation.
- Per-agent permissions.
- Signed persistent Windows agent identity.
- Secret redaction in logs.
- Human approval gates for dangerous commands.

Those should land before positioning this as a remote internet control product.
