# GitMemo Windows Build Example

This example captures the original use case that motivated WinBridge AI:
building and verifying a Windows desktop installer from a Mac-controlled
workflow.

Recommended flow:

1. Start WinBridge AI on the Mac.
2. Connect the Windows agent from the pairing page.
3. Install the Windows build environment from the console if needed.
4. Queue a project-specific script that uploads source, runs the Windows build,
   and posts artifacts back to the Mac.

The product core should stay generic. Keep app-specific build scripts in example
folders like this one or in the app repository that consumes WinBridge AI.
