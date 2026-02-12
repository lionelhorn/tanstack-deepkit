---
name: windows-process
description: Windows process management reference. Use when managing processes, killing ports, or debugging port conflicts on this Windows machine.
allowed-tools: Bash(powershell *)
---

Use PowerShell for process management, not Unix commands.

IMPORTANT: Bash expands `$_` before it reaches PowerShell. Always pipe scripts via stdin heredoc to avoid mangling.

## Find process by port

```bash
powershell -File - <<'PS1'
Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | Select-Object OwningProcess, LocalPort
PS1
```

## Kill process by port

```bash
powershell -File - <<'PS1'
Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
PS1
```

## Kill process by PID

```bash
powershell -Command "Stop-Process -Id <PID> -Force"
```

## List all node processes

```bash
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, Path"
```

## Notes

- After killing a process, TCP connections may linger in TIME_WAIT state. These are harmless and clear automatically. Only LISTENING state matters.

## Common mistakes to avoid

- Do NOT use `kill`, `lsof`, `fuser` -- these are Unix commands, not available on Windows
- Do NOT use `netstat -ano | grep` -- use `Get-NetTCPConnection` instead
- Do NOT use `curl` -- use `powershell -c "Invoke-WebRequest"` or Chrome DevTools instead
- Do NOT use `powershell -c "...$_..."` -- bash expands `$_` before PowerShell sees it. Use `powershell -File - <<'PS1'` heredoc instead
- Do NOT pipe `netstat` output through `Select-String` and then try to parse PIDs as strings -- use `Get-NetTCPConnection` which returns typed objects with `.OwningProcess`
