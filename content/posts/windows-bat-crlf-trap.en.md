---
title: "Two days burned on a Windows .bat line-ending trap · schtasks returns 255 with zero logs"
date: 2026-04-22
tags: ["Windows", "bat", "schtasks", "pitfalls"]
categories: ["Debug Notes"]
draft: false
summary: "A .bat file written with LF line endings by Git Bash gets parsed as a single giant line by cmd.exe. schtasks returns LastResult=255 with no log output at all, but running it manually via cmd immediately surfaces the error."
---

## Symptoms

- Windows `schtasks` triggers a `.bat` automatically, `LastResult=255`, **zero lines of log output**
- Running it manually via `cmd.exe //c 'D:\xxx\run.bat'` throws error after error:

```
'mental)' is not recognized as an internal or external command
& was unexpected at this time
```

- Errors are most visible when a `REM` comment contains `(` or `)` — it's not that `REM` failed to be recognized, it's that **the entire bat is being parsed as one line**.

## Root cause

- The `.bat` file has **LF line endings (0x0a)**, but `cmd.exe` requires **CRLF (0x0d 0x0a)**
- An LF bat gets treated as **one giant single-line command** by cmd. `REM` no longer ends where you think the comment ends — it extends all the way to end-of-file
- Git Bash, VS Code, and any Linux-origin tool defaults to LF
- `file run.bat` will show: `DOS batch file, Unicode text, UTF-8 text`. If it doesn't include `with CRLF line terminators`, it's LF

## Fix

```bash
unix2dos /d/path/to/run.bat
# or
sed -i 's/$/\r/' run.bat
```

Verify: `file run.bat` must include `with CRLF line terminators`.

## Prevention

Add a `.gitattributes` entry for bat files in your repo so they don't get rewritten to LF on clone:

```
*.bat text eol=crlf
*.cmd text eol=crlf
```

## Debugging schtasks LastResult=255 · in order of frequency

From most common to most obscure:

1. **Line endings on the `.bat`** (the protagonist of this post)
2. `DisallowStartIfOnBatteries` defaults to true — a laptop on battery won't run the task
3. Interactive tokens require an active login session. Use `/RL HIGHEST /RU "SYSTEM"` for headless runs
4. The `Command` has outer quotes, and schtasks has already swallowed the inner quotes through one pass of escaping

## Epilogue

This was a hobby-project cron-style task. Two days in a row the 18:00 scheduled run failed. Double-clicking the `.bat` worked fine, but hooking it into `schtasks` broke it. I checked firewalls, permissions, paths — and finally noticed the `file run.bat` output said "UTF-8 text" without "CRLF line terminators". The penny dropped.

Now every `.bat` I write for Windows execution gets a `unix2dos` pass before it leaves the editor.
