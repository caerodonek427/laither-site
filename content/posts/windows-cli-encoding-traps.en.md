---
title: "7 Traps When Writing Automation on Windows 11 with a CJK User Directory"
date: 2026-04-20
tags: ["Windows", "PowerShell", "schtasks", "debugging notes", "CJK paths"]
categories: ["Debugging notes"]
draft: false
summary: "PowerShell defaults to GBK not UTF-8. schtasks eats nested quotes. wmic is removed in 24H2. Chinese locale %date% has weekday suffix. claude -p has no --no-interactive. Run through these 7 before writing any Windows automation."
---

> **CJK context for overseas readers**: CJK = Chinese/Japanese/Korean. On Windows 11, non-ASCII usernames create a home directory like `C:\Users\王磊\` (or `C:\Users\田中\`, `C:\Users\김민\`). Microsoft technically supports this but most automation tooling assumes ASCII-only paths, which is where the 7 traps below come from. If you're installing a fresh Windows, **use an ASCII-only username** and save yourself a week of debugging.

Traps I hit in April 2026 — documented here for next time.

> Environment: Windows 11 24H2 + Chinese user directory `C:\Users\王磊\`

## Trap 1: PowerShell / cmd default to GBK, not UTF-8

`.ps1` / `.cmd` files **must use ASCII-only comments**. A CJK comment triggers mis-parsing into tokens, producing cryptic syntax errors:

```
Unexpected token '}' at line 27
```

You stare at line 27 for 20 minutes, the actual error is a CJK comment on line 3.

## Trap 2: schtasks.exe nested quotes break with CJK paths

```powershell
schtasks /Create /TR "cmd.exe /c ""C:\Users\王磊\...\x.cmd"""
```

The CJK path characters get eaten. **Workaround**: use PowerShell native cmdlets:

```powershell
$action = New-ScheduledTaskAction -Execute $CmdPath
Register-ScheduledTask -Action $action ...
```

The string isn't re-parsed through a shell, so it's reliable.

## Trap 3: Windows 11 24H2 removed wmic

```cmd
wmic os get localdatetime
```

Now errors `'wmic' is not recognized as an internal or external command`. Replace with:

```cmd
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set TODAY=%%I
```

## Trap 4: `for /f "delims=/- "` parsing `%date%` fails on Chinese locale

Chinese Windows `%date%` may be `2026/04/20 周一` (with weekday suffix). The `for /f` tokenizer chokes on the CJK character.

Always use PowerShell formatting — **don't trust `%date%`**.

## Trap 5: `claude -p` has no `--no-interactive`

```bash
claude -p "prompt" --no-interactive
# error: unknown option '--no-interactive'
```

`claude -p "prompt"` **is already non-interactive by default**. Adding the flag causes an error.

## Trap 6: Under Git Bash, Windows tools use `-` not `/`

```bash
powercfg /change monitor-timeout-ac 0   # Git Bash treats / as path conversion
powercfg -change monitor-timeout-ac 0   # Correct
```

Git Bash's MSYS path conversion turns `/change` into `C:/change`. `schtasks`, `powercfg`, etc. need the dash form.

## Trap 7: PowerShell 5.1 reads UTF-8-without-BOM as ANSI, CJK garbles

**Symptom**: A `.ps1` triggered by `schtasks` pops a MessageBox with garbled CJK characters.

**Root cause**: Win11 ships PowerShell 5.1, which reads UTF-8-without-BOM as ANSI (GBK on Chinese Windows). Many editors (including AI coding tools) write UTF-8-without-BOM by default.

**Three fixes**:

1. **Save the file with UTF-8 BOM** (simplest):

    ```powershell
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($true))
    ```

2. Add at script top:

    ```powershell
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    ```

    Only affects stdout, not file parsing.

3. Install PowerShell 7+, which defaults to UTF-8.

## Bonus: schtasks `/SD` date format

Chinese Win11 wants `yyyy/MM/dd`, not `MM/dd/yyyy`. "Invalid start date" errors = format mismatch.

## Closing thoughts

A CJK user directory amplifies all these traps. If you can avoid it, **use an ASCII-only username on fresh installs** — but if you've been using yours for years like me, just add defensive layers when writing scripts.

**Pre-flight checklist** (run through before writing Windows automation):

- [ ] All comments ASCII-only?
- [ ] CJK paths accessed via `$env:USERPROFILE` concat, not hardcoded?
- [ ] schtasks registered via PowerShell cmdlet, not command line?
- [ ] No `wmic` calls?
- [ ] Not trusting `%date%`?
- [ ] `.ps1` saved as UTF-8 with BOM?
