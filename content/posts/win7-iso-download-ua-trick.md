---
title: "Win7 上下载 Win10 ISO 的 2 个微妙陷阱"
date: 2026-05-05T11:30:00+08:00
tags: ["Windows", "TLS", "浏览器", "踩坑"]
categories: ["技术"]
draft: false
summary: "Win7 默认不启 TLS 1.2 导致 Media Creation Tool 挂,微软下载页又按 User-Agent 决定给你 MCT 还是 ISO。两个坑串起来让在 Win7 上下 Win10 ISO 变成一件反直觉的事。"
---

## 背景

有一台家里 Win7 的老机器想升级到 Win10。最自然的路径是:

1. 访问微软下载页
2. 下载 "Media Creation Tool" (MCT) 这个官方工具
3. 用 MCT 生成启动 U 盘或直接原地升级

但这条路径在 2020 年之后的 Win7 上,**两步都会挂**。

## 坑 1 · MCT 报错 0x80072F8F-0x20000

在 Win7 上双击 MCT,出现这个错误码:

```
0x80072F8F - 0x20000
我们遇到了意外的问题,无法确定你的计算机是否能运行 Windows 10。
```

网上一搜,大部分答案都是"系统损坏/系统时间错了/重启路由"。**全错**。

### 真实根因

Win7 默认启用 **TLS 1.0 / 1.1**。微软下载服务器在 2020 年左右把下限提到 **TLS 1.2+**。Win7 的 WinHTTP 栈默认不会用 TLS 1.2,SSL 握手失败 → 0x80072F8F。

### 三种修法

**方法 1 · 官方但折腾**:装 3 个补丁 (KB4474419 SHA-2 + KB4490628 SSU + KB3140245 TLS 1.2 启用) + 注册表改 `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\WinHttp` 下的 `DefaultSecureProtocols = 0x800`。

**方法 2 · 装现代浏览器绕过**:Win7 最后支持的 Firefox ESR 115 / Chrome 109,这两个浏览器自带现代 TLS 实现 (不依赖系统 WinHTTP)。用它们在 Win7 上下 ISO,绕开 MCT 工具。

**方法 3 · 换机器下**:最省事。找一台 Win11 / Mac / 任何现代系统下 ISO,再传回 Win7 (U 盘 / 局域网 / 云盘)。

我最终用的是方法 3,10 分钟搞定。

## 坑 2 · 微软下载页按 UA 区分返回内容

好,我打算用 Win11 机器去微软页面下 ISO。访问 `https://www.microsoft.com/zh-cn/software-download/windows10`,结果页面**只给我 MCT 工具下载按钮,没有 ISO 直接下载链接**。

翻墙/VPN 都试了,页面内容不变。

### 根因

微软这页面会看访问者 User-Agent:

| UA 识别 | 页面给 |
|---|---|
| Windows (任何版本) | "立即下载工具" —— MCT exe |
| 非 Windows (macOS/iPadOS/Linux) | **ISO 直接下载链接** |

官方的逻辑是"你用 Windows,就该走 MCT 升级方便;你用 Mac,就给你 ISO 让你自己做启动盘"。**但我现在在 Win11 上想帮 Win7 下 ISO**,就卡住了。

### 绕法 · 浏览器改 UA

Chrome / Edge DevTools:

1. F12 打开 DevTools
2. `Ctrl + Shift + M` 切设备模拟
3. 顶部设备下拉选 **iPad** 或 **MacBook Pro**
4. 页面自动刷新,就有 ISO 直下链接了

**注意 · DevTools 必须保持打开**。一旦关了面板,UA 切回 Windows,页面又变回给 MCT。下载开始后保持打开直到 ISO 下完 (5-6 GB,大约 10-20 分钟)。

### 更稳的改 UA 方式

DevTools 右上角 ⋮ 菜单 → **More tools** → **Network conditions**:

1. 取消勾选 `Use browser default`
2. 下拉选 `Safari - Mac` 或 `Safari - iPad`
3. 保持 DevTools 开着,刷新页面

这种改 UA 方式不会因为你调整 DevTools 视图尺寸而失效。

Firefox 用户可以在 `about:config` 改 `general.useragent.override`,永久生效,改完重启浏览器即可。

## 顺带一提 · Windows 10 ISO 的几个参数

- 官方 22H2 多版本简中 x64 大小: **5.67 GB** (实测)
- 文件名模板: `Win10_22H2_Chinese(Simplified)_x64.iso`
- **下载链接有时效性**,大约 24 小时过期。过期后回页面重新点"获取 ISO"重新生成

## 总结这两条坑的共性

它们都是 **"默认值在时代变化中变成了陷阱"** 的典型:

- Win7 的 TLS 默认是 2009 年的设定,在 2020 年之后的 HTTPS 生态里不够用
- 微软给 Windows UA 推 MCT 是 2015 年的设定,对"在 Win11 上帮 Win7 下 ISO"这种跨机场景完全不匹配

好的默认值会随着时间变坏。排错时的一个启发:**当错误提示指向"你这边有问题",但你检查不出任何问题时,考虑"是不是默认值跟不上现实了"**。TLS 版本、User-Agent 语义、路由算法、证书链,都是这类"历史默认值"高发区。

## 相关

- [踩了两天的 Windows bat 行尾坑 · schtasks 返回 255 全无日志](/posts/2026/04/踩了两天的-windows-bat-行尾坑-schtasks-返回-255-全无日志/) —— 另一个 Windows"默认值失效"类坑
- [Windows 计划任务吞掉中文用户名 · 绕开 shim 的 %~dp0](/posts/2026/05/windows-计划任务吞掉中文用户名-绕开-shim-的-~dp0/)
