---
title: "How deploying a proxy Worker permanently marks your Cloudflare account"
date: 2026-05-08T08:00:00+08:00
tags: ["Cloudflare", "Workers", "abuse", "debugging"]
categories: ["Debugging notes"]
draft: false
summary: "Deploying a VLESS/VMess-style proxy Worker on Cloudflare triggers account-level abuse tracking — not IP-level. Sharing how I got caught, the real detection model, and where the line is between tripwire and still-safe CF usage."
---

## What happened

One Wednesday afternoon, on a clean residential-IP desktop:

- Created a new Cloudflare Worker called `laither-edge`
- Pasted in an open-source VLESS-over-WebSocket-over-Worker snippet (one of the popular edgetunnel forks)
- Clicked Save and Deploy
- **15 minutes later**: an abuse report email from `abusereply@cloudflare.com`
- Worker auto-disabled (HTTP 000 on the `workers.dev` URL)
- Report ID attached (16-char hex, now permanently on file)

The **same account** had attempted two similar Workers the night before — each had failed in a different way (1101, Save spinning forever, Preview 1031). The third attempt didn't just fail — it got reported.

## The three wrong theories I tried first

I spent 20 minutes convincing myself this wasn't serious:

> "My residential IP is clean, so this can't be IP-level enforcement." ❌
> "I'll just use a different Worker name and it'll work." ❌
> "Delete and recreate should reset things." ❌

All three assume the enforcement target is **IP + Worker name**.

**Reality**: it's the **account**.

## What Cloudflare actually does

Cloudflare's abuse detection for Workers appears to:

1. **Scan all `*.workers.dev` subdomains** under the account
2. **Fingerprint known proxy code patterns**: `connect({ hostname, port })`, VLESS/VMess protocol headers, WebSocket-over-HTTPS forwarding
3. **Match known open-source project signatures** (zizifn/edgetunnel, 6Kmfi6HP/EDtunnel, cmliu/edgetunnel, etc.)
4. **Accumulate signals until a threshold** triggers an abuse report to the account email
5. **Mark the account** — subsequent deployments of similar code will fail at save time

Translation: a clean residential IP buys you **nothing** if the *code you're deploying* is what the detector looks at.

## The permanent red-lines (on an already-marked account)

Things I will never do on this account again:

- ❌ Deploy VLESS / VMess / Trojan / Shadowsocks — any proxy protocol
- ❌ Reuse code from edgetunnel-family open-source projects
- ❌ Deploy any `connect({hostname, port})` that forwards to third parties
- ❌ Point my personal domain to a `workers.dev` URL running proxy code

Things that are **still completely safe** on the same account:

- ✅ **DNS hosting** (any domain)
- ✅ **Cloudflare Pages** for static sites (personal blogs, SaaS front-ends)
- ✅ **Cloudflare Tunnel** reverse-connecting to a home server (officially endorsed)
- ✅ **Non-proxy Workers**: API gateways, form endpoints, scheduled jobs, on-the-fly content generation
- ✅ **R2 / Queues / Durable Objects** — none of these touch the proxy tripwire

## About "cooldown"

I hoped the mark would expire. Investigation says:

- **0-12 months**: any proxy Worker fails immediately on save
- **After 12 months**: detection may soften, but the Report ID is filed permanently — anyone re-examining the account sees it
- **In practice**: treat this account as permanently off-limits for proxy code

## If you actually need a proxy

Two realistic paths:

### Path A: a brand-new CF account (risk still non-zero)

- Fresh email (not your old one)
- Fresh domain (not your existing one)
- Fresh Worker deploy

**Catch**: Cloudflare has a global account fingerprint (browser signals, payment card, phone). Related accounts *can* be linked. Anecdotal success rate 50-70% — not reliable.

### Path B: self-hosted VPS (recommended)

- Vultr Tokyo / Hostinger Singapore / any ~$3-5/mo VPS
- Run xray-core or sing-box yourself
- Your personal brand domain **never touches proxy traffic** — it stays clean
- Monthly cost: roughly a coffee

Path B is boring, more work upfront, and long-term safe. If your primary CF account is tied to anything you actually care about (brand, product, SaaS), path B wins.

## What to take away

1. **Cloudflare's abuse model is account-level**, not IP-level. Changing geography or network segment won't save you.
2. **Open-source proxy project code has fingerprints**. Copy-pasting popular projects almost guarantees detection now.
3. **Don't mix proxy experiments with your main account.** Use a throwaway account if you must experiment — one you can afford to lose.
4. **Being marked is a very expensive first lesson.** 6-12 month cooldown, permanent file, and no reliable way to clear it.

If an account represents your long-term online identity (brand, business, SaaS), the worst thing you can do is spend it on a proxy experiment that a single code scan can kill.

---

**Reference**: [Cloudflare Acceptable Use Policy, section 4](https://www.cloudflare.com/acceptable-use-policy/) explicitly prohibits "proxy that transmits traffic on behalf of third parties." This isn't a gray area.
