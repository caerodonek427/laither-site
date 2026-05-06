---
title: "踩了两天的 Windows bat 行尾坑 · schtasks 返回 255 全无日志"
date: 2026-04-22
tags: ["Windows", "bat", "schtasks", "踩坑"]
categories: ["踩坑笔记"]
draft: false
summary: "Git Bash 写出的 LF 行尾 bat 在 cmd.exe 下被当成一行超长命令,schtasks LastResult=255 不产生任何日志,手动 cmd 跑立刻暴露。"
---

## 症状

- Windows schtasks 自动触发 bat，`LastResult=255`，**一行日志都没有**
- 手动 `cmd.exe //c 'D:\xxx\run.bat'` 报错成片：

```
'mental)' 不是内部或外部命令
此时不应有 &
```

- bat 里 `REM` 注释含 `(` `)` 时报错最明显——不是 REM 识别失败，是**整个 bat 被当成一行**。

## 根因

- bat 文件是 **LF 行尾（0x0a）**，cmd.exe 必须 **CRLF（0x0d 0x0a）**
- LF bat 会被 cmd 当成**一行超长命令**，`REM` 后面的内容不再是注释，一直延伸到文件末尾
- Git Bash / VS Code / 任何 Linux-origin 工具默认写 LF
- `file run.bat` 会显示：`DOS batch file, Unicode text, UTF-8 text`（没有 `with CRLF line terminators` 就是 LF）

## 修复

```bash
unix2dos /d/path/to/run.bat
# 或
sed -i 's/$/\r/' run.bat
```

验证：`file run.bat` 必须包含 `with CRLF line terminators`。

## 预防

Git 仓库给 bat 文件加 `.gitattributes`，防 clone 时被转 LF：

```
*.bat text eol=crlf
*.cmd text eol=crlf
```

## schtasks 返回 255 的排查顺序

从最常见到最罕见：

1. **bat 行尾**（本文主角）
2. `DisallowStartIfOnBatteries` 默认为真，笔记本拔电源时不跑
3. 交互 token 需要登录会话，`/RL HIGHEST /RU "SYSTEM"` 才能无人值守
4. `Command` 带外层引号，schtasks 做过一次转义吞了内层引号

## 后话

我是某个业余项目的定时任务，连续两天 18:00 的自动任务失败。手动双击 bat 没事，一挂到 schtasks 就挂。查了防火墙、查了权限、查了路径，最后在 `file run.bat` 的输出里看到"UTF-8 text"而不是"CRLF line terminators"，才恍然大悟。

现在我所有落盘给 Windows 跑的 bat，写完必过一遍 `unix2dos`。
