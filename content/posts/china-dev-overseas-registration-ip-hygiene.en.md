---
title: "Before registering a new overseas service, test your actual egress IP"
date: 2026-05-08T08:30:00+08:00
tags: ["registration", "KYC", "IP hygiene", "pitfalls"]
categories: ["Debugging notes"]
draft: false
summary: "A debugging post from a China-based indie developer's perspective: your actual public egress IP matters way more than you think when registering overseas services (Oracle Cloud, Porkbun, Cloudflare, etc). Two failed registrations traced back to a corporate-VPN egress routed through a Hong Kong company segment. Plus: diagnostic method, switching-egress playbook, and sensitivity comparison across major services."
---

## One-line TL;DR

Before registering any overseas service (Oracle Cloud / Porkbun / certain Cloudflare products), **the first step isn't filling out the form — it's testing what network segment your public egress IP lives on**.

Wrong egress → charge goes through but tenancy silently fails / Veriff rejects a Chinese ID card / account mysteriously held for review.

## The pitfall I stepped on

Over several consecutive evenings I tried to sign up for the Oracle Cloud free tier from my work laptop.

- Night 1: account created, credit-card pre-auth of $1 went through, `tenancy` silently failed, can't log into the dashboard.
- Night 2: swapped cards and retried, pre-auth charged another $1, tenancy still failed.
- Night 3 (from home): same email, same credit card, instant success.

**The only variable**: egress IP.

## Root cause: corporate networks often egress through enterprise segments

Many tech companies' office networks aggregate employee traffic through an **enterprise VPN egress**, typically at HK / US / Singapore data centers, mapped to a specific **ASN** + company name.

Example:
- Geolocates as HK (country=HK, city=HK)
- ASN actually belongs to "Some Company H.K. Limited"
- **Chinese ID + Hong Kong enterprise IP** = identity/location mismatch to an overseas anti-fraud system

Even if you turn off Cloudflare WARP and other VPNs, **the underlying office network egress itself** is an enterprise segment.

"Dirty" here doesn't mean illegal-dirty — it means overseas KYC/anti-fraud systems treat enterprise segments as proxy/jump-box traffic by default and assign high risk scores.

## Diagnosis: cross-reference multiple sources

**Don't rely on one source** — corporate internal networks may hijack well-known IP-lookup domains:

```bash
curl -s https://ipinfo.io/json        # may be DNS-hijacked by internal network
curl -s https://ifconfig.me           # same
curl -s https://icanhazip.com         # usually real
curl -s https://myip.ipip.net         # Chinese-region source, usually real
```

Why multiple sources: one company's VPN client **selectively hijacks** ipinfo.io (flagging "geo-detection" domains to audit tunnels), while icanhazip.com (less well-known) gets direct home-broadband egress. So ipinfo.io reports HK segment while icanhazip.com reports real home-broadband IP. Looking at only one would give you the wrong diagnosis.

**Key field**: don't just look at `country`, look at `org` (ASN + company name).

## Typical ORG field classification

| `org` field example | Nature | Overseas-service acceptance |
|---|---|---|
| `AS4134 Chinanet-Backbone` | ✅ China Telecom home broadband | High |
| `AS4837 CHINA UNICOM` | ✅ Unicom home broadband | High |
| `AS56040 China Mobile` | ✅ China Mobile | High |
| `AS63855 ... H.K. Limited` | 🔴 Corporate VPN segment | **Very low** |
| `AS13335 Cloudflare` | 🔴 WARP / CDN | Low |
| `AS14061 DigitalOcean` | 🔴 Data center | Very low |
| `AS16509 Amazon.com` | 🔴 AWS data center | Very low |

**Rule**: if the ORG contains `Limited` / `Cloud` / `Hosting` / a CDN vendor name, it's very likely to get dinged by overseas KYC.

## Switching egress (cleanest to dirtiest)

| Egress | Cleanliness | Cost | Notes |
|---|---|---|---|
| 🥇 Mobile 4G/5G hotspot | ⭐⭐⭐⭐⭐ | data plan | Turn off Wi-Fi, tether from phone. Chinese telco mobile segments have highest acceptance |
| 🥈 Home broadband direct | ⭐⭐⭐⭐ | 0 | Turn off all VPNs, let the machine talk to your home ISP |
| 🥉 Café Wi-Fi | ⭐⭐⭐ | coffee | Usually commercial broadband — cleaner than corporate VPN |
| ❌ Company office network | ⭐ | 0 | Most big companies egress through enterprise segments — instant deduction on registration |
| ❌ Cloudflare WARP | ⭐ | 0 | CF IP range — overseas services reject outright |
| ❌ Commercial VPN | ⭐ | $ | Data center IPs, worse than corporate office |

**In practice**: go home, enable phone hotspot, connect laptop, register in a few minutes, disable hotspot. Cheapest "disposable clean egress" approach available.

## Sensitivity by service

Based on several months of hands-on testing, mainstream services' KYC strictness roughly breaks down as:

| Service | KYC tooling | HK-enterprise trigger rate | CN-ID friendly |
|---|---|---|---|
| Oracle Cloud Free | (no explicit KYC, risk-scoring) | 🔴 almost guaranteed | N/A |
| Porkbun | Veriff | 🔴 frequent | Poor |
| Namecheap | Jumio/Sumsub | 🟡 sometimes | Medium |
| Spaceship | - | 🟡 unknown | Good |
| Cloudflare | - | 🟢 permissive | Good |

**Observation**: the more niche or anti-fraud-strict the service (Oracle, Porkbun), the more IP hygiene matters. Services aimed at global developers like Cloudflare are relatively permissive.

## A counter-intuitive thing that actually makes sense

**Q**: Big companies are big and legit — why is their office egress IP dirtier than home broadband?

**A**: Overseas risk systems score "what this IP range is usually used for." Big companies' office egress IPs historically have:

- Many employees using corporate VPN to access overseas services (already flagged)
- Aggregated enterprise traffic, more anomaly patterns
- VPN vendors sometimes lease these segments for proxy resale

So the risk model labels enterprise office egress as "proxy + jump-box" pattern. Your home ISP segment is cleaner precisely because it's not a proxy egress.

## One-command diagnostic template

Before registering any overseas service, run these three commands — 10 seconds total:

```bash
# 1. Get real egress
curl -s https://icanhazip.com

# 2. Check ORG (corporate segment or not)
curl -s https://ipinfo.io/$(curl -s https://icanhazip.com)/json | grep -E '"(org|country|city)"'

# 3. If org contains Limited / Cloud / Hosting / corporate name, switch to phone hotspot before registering
```

## Closing line

If you're a China-based developer registering an overseas service, **the office network is never the right place**. Default to going home or tethering from your phone, spend 10 seconds diagnosing the IP ORG, finish registration in 5 minutes. Don't skip those 5 minutes — post-hoc fixing a stuck tenancy or account hold is dozens of times more expensive.

## For overseas readers

If you're reading this from outside China, this post doubles as a window into what independent developers here routinely wrangle with. The fundamentals (ASN tagging, IP reputation, KYC-cross-checking) apply anywhere — they just kick in at different thresholds depending on the ID + IP combination the risk model sees.
