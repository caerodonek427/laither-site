---
title: "Windows Task Scheduler eats CJK usernames · bypass shim %~dp0"
date: 2026-05-05T07:00:00+08:00
tags: ["Windows", "schtasks", "cmd", "encoding", "pitfalls"]
categories: ["Debugging notes"]
draft: false
summary: "A scheduled task fires a cmd script; under a CJK (Chinese/Japanese/Korean) username, %~dp0 sometimes drops the CJK characters entirely and the resulting path becomes 'C:\\Users\\\\AppData\\...'. Bypass the npm-generated shim and build the absolute path yourself — stable."
---

## Symptom

A schtasks-triggered cmd script fails with:

```
'"C:\Users\\AppData\Roaming\npm\\node_modules\@anthropic-ai\claude-code\bin\claude.exe"'
is not recognized as an internal or external command.
```

Notice `C:\Users\\AppData\Roaming` — **the CJK username (e.g. `王磊` / `山田太郎` / `김철수`) has been eaten to empty**, leaving two adjacent backslashes.

Manually double-clicking the `.bat` works. Hooked up to a scheduled task, it breaks on certain triggers.

## Root cause

The `claude.cmd` I'm using is an npm-generated shim. It looks like this:

```cmd
@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0         REM <-- directory of the script itself
EXIT /b
:start
SETLOCAL
CALL :find_dp0
"%dp0%\node_modules\@anthropic-ai\claude-code\bin\claude.exe"   %*
```

In theory, `%~dp0` expands to the directory of the currently-executing script. But **under schtasks, certain trigger paths cause CJK bytes to be dropped during that expansion**.

Inferred chain:

- The shim file itself is GBK / ANSI encoded
- schtasks doesn't set `chcp`; cmd's initial codepage may be 437 / 65001 / 936 in confused mixes
- `%~dp0` expansion does an unnecessary encoding conversion
- Failed CJK decoding silently drops the characters → `C:\Users\\AppData\...`

Other identically-structured schtasks wrappers on the same machine don't break. The one difference: those wrappers run a bit of PowerShell before calling the shim. **My guess is that PowerShell startup resets cmd's codepage to UTF-16 / UTF-8**, after which `%~dp0` expansion is stable.

## Fix

**Bypass the shim's `%~dp0` and build the absolute path yourself using `%USERPROFILE%`**:

```cmd
set "CLAUDE_CMD=%USERPROFILE%\AppData\Roaming\npm\claude.cmd"
if not exist "%CLAUDE_CMD%" (
    echo [ERROR] claude.cmd not found at %CLAUDE_CMD% >> "%LOG_FILE%"
    exit /b 1
)
"%CLAUDE_CMD%" -p "..." >> "%LOG_FILE%" 2>&1
```

- `%USERPROFILE%` is an OS-level environment variable injected by Task Scheduler at task start — it doesn't go through cmd's codepage parsing
- Direct string concatenation + double quotes — doesn't depend on the shim's internal `%~dp0`
- Bonus: if the shim location changes someday, this fails loudly with an explicit path

## Prevention

Any schtasks call to an npm-installed (or similar) shim (`xxx.cmd`), skip `where xxx` and use:

```
%USERPROFILE%\AppData\Roaming\npm\xxx.cmd
```

This rule generalizes to all node_modules CLIs — claude-code, prettier, eslint, your own npm scripts.

## Triage order for similar errors

When you see "is not recognized as an internal or external command," look at the path in the log first:

1. **Two adjacent backslashes** (`\\`): almost certainly variable expansion dropped characters
2. **CJK characters in the path intact**: eyeball them
3. **Path actually exists**: `dir` to verify
4. Only then check PATH / permissions / interactive tokens — the usual suspects

## Aftermath

This issue first hit on a manual trigger at 05:05 AM on 2026-05-04. Before that, the same wrapper had been triggered automatically dozens of times without breaking — strongly non-deterministic. I'm not going to chase down exactly where the encoding gets dropped; just routing around it is enough. **For Windows encoding issues, chasing them to ground usually leads into OS kernel territory — poor return on investment.**

There's one genuinely generalizable takeaway:

> On Windows, any combination of CJK paths + cross-process + non-interactive session should be assumed to step on encoding. If you can route around it, route around it.
