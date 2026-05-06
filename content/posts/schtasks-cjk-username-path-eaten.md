---
title: "Windows 计划任务吞掉中文用户名 · 绕开 shim 的 %~dp0"
date: 2026-05-05T07:00:00+08:00
tags: ["Windows", "schtasks", "cmd", "编码", "踩坑"]
categories: ["踩坑笔记"]
draft: false
summary: "schtask 自动触发 cmd 脚本,%~dp0 在中文用户名环境下偶发把汉字吞掉,拼出的路径变成 'C:\\Users\\\\AppData\\...'。绕开 npm shim 自己拼绝对路径稳。"
---

## 症状

一个 schtask 触发的 cmd 脚本,日志里报:

```
'"C:\Users\\AppData\Roaming\npm\\node_modules\@anthropic-ai\claude-code\bin\claude.exe"'
不是内部或外部命令、可运行的程序或批处理文件。
```

注意 `C:\Users\\AppData\Roaming` —— **中文用户名 (比如 `王磊`) 被吞成空**,两个反斜杠挨着。

手动双击 bat 没事,挂到 schtask 里某几次触发会炸。

## 根因

我用的 `claude.cmd` 是 npm 生成的 shim,内容长这样:

```cmd
@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0         REM <-- 取脚本自身所在目录
EXIT /b
:start
SETLOCAL
CALL :find_dp0
"%dp0%\node_modules\@anthropic-ai\claude-code\bin\claude.exe"   %*
```

`%~dp0` 理论上是"当前脚本所在目录",但 **schtask 下某些触发路径会让中文字节丢失**。

推测链:

- shim 文件本身是 GBK/ANSI 编码
- schtask 默认不设 chcp,cmd 初始 codepage 可能是 437 / 65001 / 936 混乱
- `%~dp0` 展开时做了一次不必要的编码转换
- 汉字解码失败后被静默丢弃 → `C:\Users\\AppData\...`

同机上另外几个结构一模一样的 schtask wrapper 没炸。唯一的差别是那几个在 call shim 前先跑了一段 PowerShell,**推测 powershell 启动时会重置 cmd 的 codepage 到 utf-16/utf-8**,之后 `%~dp0` 展开就稳了。

## 修法

**绕开 shim 的 `%~dp0`,自己用 `%USERPROFILE%` 拼绝对路径**:

```cmd
set "CLAUDE_CMD=%USERPROFILE%\AppData\Roaming\npm\claude.cmd"
if not exist "%CLAUDE_CMD%" (
    echo [ERROR] claude.cmd not found at %CLAUDE_CMD% >> "%LOG_FILE%"
    exit /b 1
)
"%CLAUDE_CMD%" -p "..." >> "%LOG_FILE%" 2>&1
```

- `%USERPROFILE%` 是 OS 层环境变量,schtask 启动时由 Task Scheduler 注入,不经过 cmd 的 codepage 解析
- 直接字符串拼接 + 双引号包起,不依赖 shim 内部的 `%~dp0`
- 额外好处:万一哪天 shim 位置换了,这里 fail-loud 报明确路径

## 预防

任何 schtask 里调 npm 或其他 shim 工具 (`xxx.cmd`),直接绕开 `where xxx`,改用:

```
%USERPROFILE%\AppData\Roaming\npm\xxx.cmd
```

这条规则对 node_modules 下的 cli (包括 claude-code / prettier / eslint / 自家 npm 脚本) 都通用。

## 排查同类错误的顺序

看到"不是内部或外部命令"错误时,第一眼看日志里的路径:

1. **有没有连续两个反斜杠** (`\\`):几乎一定是变量展开丢字符
2. 中文路径里的汉字是否完整:肉眼扫一遍
3. 路径是否存在:`dir` 验一下
4. 最后才考虑 PATH / 权限 / 交互 token 那些常规嫌疑犯

## 后话

这个问题 2026-05-04 早上 05:05 手动触发才命中,之前同一个 wrapper 被 schtask 自动触发过几十次都没炸,有很强的非确定性。我不打算再去追编码具体在哪一步丢的,直接绕开就好 —— **Windows 编码相关的问题追到底往往是 OS kernel 层的事,投入产出比不划算**。

有一条真正通用的经验:

> Windows 下任何涉及中文路径 + 跨进程 + 非交互会话的组合,都要假定编码会被踩,能绕就绕。
