---
title: "Running Streamlit silently in the background on Windows · 7 failures and the one that worked"
date: 2026-05-02
tags: ["Windows", "Streamlit", "VBS", "background service", "pitfalls"]
categories: ["Debugging notes"]
draft: false
summary: "Git Bash &, cmd start /b, schtasks, UTF-8 VBS… six approaches all failed. The only one that worked was a pure-ASCII VBS file the user double-clicks. Parent process = explorer.exe is the only reliable answer."
---

## The scenario

I'm developing a local Streamlit app on Windows (port 8766). I want it to:

- Keep running when **all the black console windows are closed**
- Keep running when **Claude Code / Git Bash / SSH are all closed**
- Let the user start it by double-clicking an icon, and stop it when they want

Sounds like a one-line command. It is not.

## The 7 failures

| Approach | Where it broke |
|---|---|
| `python ... &` (Git Bash background) | Git Bash exits, child is taken down with it |
| `cmd //c start /b bat` | Same — parent exits, child dies |
| `cmd //c start cmd /k python ...` | Survives, but leaves a permanent black console visible |
| `schtasks /run` invoking a bat | Once the bat itself exits, python gets taken with it |
| `cmd //c wscript launch.vbs` | `Access denied` — Windows Defender blocks PowerShell/cmd invoking wscript |
| UTF-8 VBS with BOM + CJK filename | `Line N: object required: objShell` — actually the earlier lines never ran, encoding detection failed |
| `pythonw.exe` directly, no window | Can't redirect stdout to a log file — debugging is blind |

## The only reliable approach: user double-clicks a pure-ASCII VBS

```vbs
' Silent launcher - ASCII only, no encoding issues
Dim objShell
Dim objFS
Dim strCmd
Set objShell = CreateObject("WScript.Shell")
Set objFS = CreateObject("Scripting.FileSystemObject")
objShell.CurrentDirectory = "D:\myapp"
If Not objFS.FolderExists("D:\myapp\logs") Then
    objFS.CreateFolder "D:\myapp\logs"
End If
strCmd = "cmd /c C:\Python314\python.exe -m streamlit run app.py " & _
         "--server.port 8766 --server.headless true " & _
         "--server.address 0.0.0.0 --browser.gatherUsageStats false " & _
         "> logs\streamlit_silent.log 2>&1"
objShell.Run strCmd, 0, False
WScript.Sleep 4000
objShell.Popup "app started on port 8766" & vbCrLf & _
    "Open http://127.0.0.1:8766/", 4, "app", 64
```

Filename: `launch_app.vbs` (**ASCII only** — no CJK filenames like `启动应用.vbs`).

User double-clicks → explorer.exe forks a wscript.exe → wscript forks cmd → cmd forks python → python detaches from the entire parent chain and ends up bound to System (Session 0 or Session 1, doesn't matter).

## Why this exact combination is the only reliable one

| Ingredient | Why it matters |
|---|---|
| **User double-clicks** | Parent process is `explorer.exe` — shell/ssh/Claude can't reach it |
| **VBS + `Run 0 False`** | 0 = completely hidden window; False = fire-and-forget |
| **Pure-ASCII file content** | Native Windows VBS engine doesn't understand UTF-8 BOM / GBK — ASCII is the safest bet |
| **ASCII filename** | CJK filenames trip up cscript / schtasks during path conversion |
| **`cmd /c` + redirect** | `pythonw` can't redirect stdout; Streamlit needs log files for debugging |

## Stop script (also pure ASCII)

```bat
@echo off
REM stop_streamlit.bat
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8766 ^| findstr LISTENING') do (
    echo Killing PID %%a on port 8766
    taskkill /F /PID %%a
)
```

**Don't** use `taskkill /IM python.exe` — it will take down other Python processes (e.g. another Streamlit on a different port). Kill by port precisely.

## Auto-start on boot

`Win+R` → `shell:startup` → drag a **shortcut** to `launch_app.vbs` into there. Don't drag the file itself — VBS will get moved and disappear.

## Aftermath

This is the answer I landed on after a full night of stepping on pitfalls. It looks simple, but every step has a failure story behind it:

- Can't use `cscript` to invoke VBS (Defender blocks it)
- Can't have `wscript` invoke a CJK filename (path resolution breaks)
- Can't write CJK comments inside the VBS (GBK engine misreads)
- Can't write CJK text in VBS Popup (same)

I verified each failure case. The final combination — ASCII only + user double-click + explorer as parent — is the only stable "background service detached from all shells" solution on Windows.

If you've got systemd on Linux or launchd on macOS, you're not laughing at this. Windows has no real user-level daemon — every attempt is a different way of "routing around the shell lifecycle," and eventually you find the only way that works is forking from the source: explorer.
