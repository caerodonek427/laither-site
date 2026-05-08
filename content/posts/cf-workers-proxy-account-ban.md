---
title: "CF Workers 部署代理被封号:一个账号的教训"
date: 2026-05-08T08:00:00+08:00
tags: ["Cloudflare", "Workers", "风控", "踩坑"]
categories: ["踩坑笔记"]
draft: false
summary: "在 Cloudflare Workers 上部署 VLESS/VMess 代理类 Worker,账号会被 abuse 自动标记,部分场景是**永久**不可再部署。复盘一次具体的封禁过程、根因、长期影响,以及合规的 CF 用法边界在哪。"
---

## 出事场景

某个周三下午,在一台家宽干净 IP 的台式机上:

- 新建 Cloudflare Worker,命名 `laither-edge`
- 粘入开源的 VLESS over WebSocket over Worker 代码(某个流行的 edgetunnel 项目)
- 点 Save and Deploy
- **15 分钟后**收到 Cloudflare 发来的 abuse 报告邮件,来自 `abusereply@cloudflare.com`
- Worker 被自动停用,访问返回 HTTP 000
- 邮件里带一个 Report ID(形如 16 位十六进制)

**同一账号**之前一晚还尝试过另外 2 个同类 Worker,都陆续挂了(1101 错误、Save 卡死、Preview 1031)。第三次新建,直接走封号。

## 第一反应的三个错误判断

我当时的自我安慰(后来证明全错):

> "家宽 IP 干净,应该不算 IP 风控。" ❌
> "我换个 Worker 名字就行。" ❌
> "删了再重建应该能过。" ❌

这三个判断都基于一个误解:**CF 的风控对象是 "IP + Worker 名"**。

**实际上**:CF 风控的是**账号**。

## 根因(我后来搞清楚的)

Cloudflare 对账号级别会做以下动作:

1. **扫描所有 `*.workers.dev` 子域**的部署内容
2. **识别代理类代码特征**:`connect({hostname, port})`、WebSocket over HTTPS、常见 VLESS/VMess 协议头
3. **匹配开源项目指纹**(zizifn/edgetunnel、6Kmfi6HP/EDtunnel 等仓库的代码模式)
4. **累计触发阈值**后自动生成 abuse 报告并向账号邮箱发通知
5. **账号被标记** — 之后再部署任何类似代码,**新 Worker 在保存瞬间就失败**

换言之:**家宽干净 ≠ 账号安全**。CF 看的是"这个 account 在部署什么代码",不是请求来源 IP。

## 永久红线

对这个被标记的账号,以下操作**永远不要**再做:

- ❌ 部署 VLESS / VMess / Trojan / Shadowsocks 等任何代理协议
- ❌ 使用 edgetunnel 系列开源项目代码
- ❌ 部署任何 `connect({hostname, port})` 转发到第三方的逻辑
- ❌ 把个人域名 DNS 指向 `workers.dev` 子域上的代理 Worker

以下操作**完全合规**,仍可放心使用:

- ✅ **DNS 管理**(任何域名都行)
- ✅ **Cloudflare Pages 静态站点部署**(比如个人博客、SaaS 前端)
- ✅ **Cloudflare Tunnel 反向连接家用服务器**(官方合规功能)
- ✅ **Workers 做非代理逻辑**:API 网关、表单处理、定时任务、静态内容生成
- ✅ **R2 / Queues / Durable Objects** 等存储类服务

## 冷却期的真相

我曾希望"等几个月再试就好了",研究了一下实际情况:

- **6-12 个月内**:账号仍在 abuse 跟踪名单,部署代理类 100% 立即封
- **1 年后**:标记可能淡化,但 Report ID 是永久存档的,CF 回查历史就能翻到
- **实际结论**:这个账号**永远不建议**再部署代理类 Worker

## 想翻墙的正确路径

如果真的需要代理,有两条路:

### 方案 A:新开 CF 账号(风险仍在)

- 新邮箱(不复用老账号)注册新 CF
- 新域名(不复用已有)
- 新 Worker 部署

**但注意**:CF 有全局账号指纹(浏览器 fingerprint、付款卡、电话号),仍可能关联上老账号。实测成功率 50-70%,**不是稳妥方案**。

### 方案 B:自建 VPS(推荐)

- Vultr Tokyo / Hostinger 新加坡 / 搬瓦工等海外 VPS
- 自建 xray-core 或 sing-box,不经 CF
- 个人品牌域名**完全不碰代理流量**,保持品牌纯洁度
- 成本:$3-5/月

对比起来,方案 B **短期成本高、长期风险低**,方案 A **短期省钱、长期可能连累品牌域名**。如果你的品牌对你很重要,直接选 B。

## 教训浓缩

1. **CF 的 abuse 模型是账号级不是 IP 级** — 换家宽、换地理位置都没用
2. **开源代理项目的代码指纹已经被各家 CDN 标记** — 复制粘贴部署几乎必挂
3. **代理类 Worker 别碰**,CF 的合规能力池足够大,不用触红线也能做很多事
4. **误踩一次代价很大**:账号污点、跟踪名单、冷却期 6-12 个月,且极可能永不清除

如果你打算把某个 CF 账号长期作为品牌/工作室主账号,**尤其不要**在这个账号上做代理实验。该做实验用一个"可弃"账号,失败了扔掉就是。

---

**参考**:[Cloudflare Acceptable Use Policy · §4 禁止事项](https://www.cloudflare.com/acceptable-use-policy/) 里明确禁止"proxy that transmits traffic on behalf of third parties"。
