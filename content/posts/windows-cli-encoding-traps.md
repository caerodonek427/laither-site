---
title: "Windows 11 + 中文用户目录下写自动化脚本的 7 个坑"
date: 2026-04-20
tags: ["Windows", "PowerShell", "schtasks", "踩坑", "中文路径"]
categories: ["技术"]
draft: false
summary: "PowerShell 默认 GBK、schtasks 嵌套引号吞字、wmic 已移除、中文 locale 下 %date% 带星期几、claude -p 没有 --no-interactive——写 Windows 自动化前先过这 7 条。"
---

2026 年 4 月踩过的坑，下次写 Windows 自动化脚本直接查。

> 环境：Windows 11 24H2 + 中文用户目录 `C:\Users\王磊\`

## 坑 1：PowerShell / cmd 默认 GBK，不是 UTF-8

`.ps1` / `.cmd` 文件**只用 ASCII 注释**。中文注释会被 GBK 解析器误读成 token，报莫名其妙的语法错：

```
Unexpected token '}' at line 27
```

你盯着第 27 行看半天，其实错在第 3 行的中文注释。

## 坑 2：schtasks.exe 嵌套引号在中文路径下失败

```powershell
schtasks /Create /TR "cmd.exe /c "C:\Users\王磊\...\x.cmd""
```

会把中文路径里的字符吞掉。**替代方案**：直接用 PowerShell 原生 cmdlet：

```powershell
$action = New-ScheduledTaskAction -Execute $CmdPath
Register-ScheduledTask -Action $action ...
```

字符串不经 shell 引号解析，稳。

## 坑 3：Windows 11 24H2 移除了 wmic

```cmd
wmic os get localdatetime
```

直接 `'wmic' 不是内部或外部命令`。改成：

```cmd
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set TODAY=%%I
```

## 坑 4：`for /f "delims=/- "` 解析 %date% 遇中文 locale 挂

Windows 中文 locale 下 `%date%` 可能是 `2026/04/20 周一`，`for /f` 分词吞字挂掉。

统一走 PowerShell 格式化，别信 `%date%`。

## 坑 5：`claude -p` 没有 `--no-interactive`

```bash
claude -p "prompt" --no-interactive
# error: unknown option '--no-interactive'
```

`claude -p "prompt"` **默认就是非交互**。加了反而报错。

## 坑 6：Git Bash 下 Windows 工具参数用 `-` 不用 `/`

```bash
powercfg /change monitor-timeout-ac 0   # Git Bash 会把 / 当路径转换
powercfg -change monitor-timeout-ac 0   # 正确
```

Git Bash 的 MSYS 路径转换会把 `/change` 误当成 `C:/change`，`schtasks`、`powercfg` 这类都要注意。

## 坑 7：PowerShell 5.1 读 UTF-8 无 BOM 按 ANSI 解析，中文乱码

**症状**：`schtasks` 触发的 `.ps1` 弹 MessageBox，中文变乱码。

**根因**：Win11 自带的 PowerShell 是 5.1，读无 BOM UTF-8 时按 ANSI (GBK) 解析。很多脚本写工具（包括我常用的 AI 编辑器）默认写无 BOM UTF-8。

**修法三选一**：

1. **文件加 UTF-8 BOM**（最简单）：

    ```powershell
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($true))
    ```

2. 脚本顶部加：

    ```powershell
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    ```

    仅影响 stdout，不影响文件解析。

3. 装 PowerShell 7+，默认 UTF-8。

## 番外：schtasks `/SD` 日期格式

中文 Win11 是 `yyyy/MM/dd` 不是 `MM/dd/yyyy`。报"无效开始日期"就是格式错。

## 写在最后

中文用户目录是这些坑的放大器。如果能避开，下次装机就改成英文用户名——但我已经用了这么多年，就不折腾了，写脚本时多一层防御就是。

**自检清单**（写 Windows 自动化脚本前过一遍）：

- [ ] 注释全 ASCII 了吗？
- [ ] 中文路径走 `$env:USERPROFILE` 拼接，不硬编码
- [ ] schtasks 用 PowerShell cmdlet 注册，不用命令行
- [ ] 没写 wmic
- [ ] 没信 `%date%`
- [ ] `.ps1` 存成 UTF-8 with BOM
