---
title: "Naming a brand from scratch that can hold multiple products · a 5-step method"
date: 2026-05-05T07:30:00+08:00
tags: ["branding", "methodology", "indie", "decision-making"]
categories: ["Methodology"]
draft: false
summary: "The day I named my own studio (Laither), I distilled a repeatable 5-step process: define tone first, dig out the core, coin words, check availability, then use 4-axis scoring to decide. Writing it down for anyone who needs to name something in the future (including future me)."
---

## Why write this

Naming feels emotional but is actually a structured decision problem. I recently named my own studio (Laither) and three product lines, and noticed that running the same process each time was both faster and more regret-resistant.

This post distills the process into 5 steps. Applies to:

- Studio / sole proprietorship / company main brand
- App / SaaS / product sub-brand
- Rebranding an existing product

**Doesn't apply to**: domain-squatter style naming (3-letter short domains), personal creator / KOL brands (different logic).

---

## Step 1 · Define the tone before touching the name

The most common way naming fails is jumping straight into generating candidate words. You'll quickly enter the fatigue zone of "each one is kind of interesting and none is perfect."

**Answer four orthogonal questions first**:

1. **Tone** (how the name looks and reads) · multi-select
   - Geek-tech feel / literary-abstract / bilingual-friendly / abstract-symbol
2. **Identity** (brand vibe) · multi-select
   - Indie craftsperson / data-rational / daily-life-ordered / intelligent-future
3. **Category core** (shared theme across all products) · single-select
   - Data analysis / tool efficiency / introspection-reflection / craftsperson accumulation
4. **Personal marker** · single-select
   - None / includes initials / full real name

Once you've answered all four, you've already made half the name concrete in your head.

## Step 2 · Seemingly contradictory dimensions are an opportunity, not a problem

I picked "literary-abstract + bilingual-friendly + abstract-symbol" across tones, and all four identity vibes. Is that too scattered?

No. These aren't parallel options — they're **three layers of a brand**:

- **Tone** = how it "looks / reads"
- **Identity** = who it "feels like"
- **Category** = "all products tell the same story"

A good name hits all three layers simultaneously. A few familiar examples:

- **Notion** → abstract-symbol + intelligent-craftsperson + knowledge-thinking
- **Stripe** → geek-tech + infrastructure-rational + payments
- **Figma** → abstract-symbol + collaborative-craftsperson + design

The way to resolve "scatter" is **projecting one core image across multiple layers**. The core image for Laither ended up being "layered accumulation" — which simultaneously hits abstract-symbol (the Layer word root), indie-craftsperson vibe, and craftsperson-accumulation category.

## Step 3 · Coin words from the core, don't cherry-pick from a word list

**Don't** open a 10,000-word English dictionary and pick "nice-sounding ones." That gets tiring fast, and every word you pick has been considered by countless others before you.

**Do** fix the core concept and fuse 2-3 core verbs / roots into a new word.

### My coining path

Core = **compounding / accumulation / layering / sedimentation**

Core verbs:
- Gather → Gither (drop the "a" for hardness)
- Layer → Layar / Lither
- Stack → Stacc / Stackly
- Fold → Foldry / Cofold
- Accrue → Accrur

Fusion-coined:
- Layer + Gather → **Laither** ← final pick
- Layer + Gither → Lither (.com held by an investor from 15 years ago)
- Gather + Lay → Gathlay / Githlay
- Layer + Pile → Laypile

### Rules of thumb for coining

| Rule | Why |
|---|---|
| 5-8 letters is optimal | Sub-5-letter .com is mostly already held; 9+ letters are hard to remember |
| Avoid two adjacent plosives | `Gith-lay` reads awkwardly; `Lai-ther` flows |
| Avoid three-in-a-row vowels or consonants | Foreign speakers can't pronounce them |
| `-er` / `-or` / `-ly` / `-ry` endings often help | Action-ize / place-ize; abstract-brand friendly |
| Pairs well with a 2-character CJK complement (if bilingual matters) | Laither pairs with 叠时 (CJK for "layered time") for the bilingual rollout |
| `.com` availability is a hard prerequisite | If no `.com`, drop it — don't fall back to `.io` / `.app` |

## Step 4 · Triple-check: domain, search, trademark

**Priority**: domain > search occupancy > trademark

### 4.1 Domain check (free, fast)

Use the official RDAP API, not `whois.com`-type sites (they rate-limit behind Cloudflare captchas):

```bash
curl -s "https://rdap.verisign.com/com/v1/domain/LAITHER.COM"
# 404 = available ✅
# 200 returns registration info = taken ❌
```

Batch check — prepare 5-10 candidates, parallel RDAP lookups:

```bash
for n in laither accrur githlay laypile foldry; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://rdap.verisign.com/com/v1/domain/${n^^}.COM")
  echo "$n.com : $code"
done
```

For `.io` / `.app`, swap in `rdap.nic.io` / `rdap.nic.app`.

### 4.2 Search occupancy check

Use `duckduckgo.com` or `bing.com` for consistent global results.

Search `"XXXX"` with quotes for exact match. **Look at the first 20 results for**:

- Existing companies / popular products that collide
- Negative slang meaning (check Urban Dictionary)
- Big-brand sub-product lines sharing the name

### 4.3 Trademark check (can be deferred, but not skipped)

- **US**: USPTO TESS (`tmsearch.uspto.gov`)
- **EU**: EUIPO eSearch
- **Global**: WIPO `branddb.wipo.int`
- **China** (if operating here): `sbj.cnipa.gov.cn`, search class 9 (software) + class 42 (SaaS services)

You don't need to immediately register a trademark at Phase 0 ($200+ USD per class per country for a lawyer-assisted filing). **But you must confirm no prior-existing trademark exists.** Register formally once you hit stable revenue.

## Step 5 · Score across 4 axes, don't rely on gut

Down to 2-3 finalists. Use quantitative scoring to decide.

| Dimension | Weight | Meaning |
|---|---|---|
| Memorable & pronounceable | 25% | Can users spell it after 5 seconds? Can a stranger repeat it after hearing once? |
| Multi-category loadability | 25% | Can it hold the current products plus what you want to build in the next 6-12 months? |
| Brand distinctiveness | 20% | How empty are search results? What's the risk of colliding with a big brand? |
| Commercializability | 15% | How expandable is it for future incorporation / overseas / fundraising? |
| Bilingual pairability (if applicable) | 15% | Does it pair with a 2-character counterpart in your secondary language without being a clumsy phonetic transliteration? |

Score each 1-10, weight-sum. My final scores: Laither 9.2 / Accrur 7.55 / Githlay 7.35. **If the gap is over 1.5, don't hesitate**.

## Step 6 · Within 24 hours of deciding, land 5 things

Once you've picked the name, do these 5 within a day:

1. **Register `.com`** — domain-squatting AI bots scan RDAP 24/7, one day of hesitation can cost you the domain. For registrars that accept non-US payment methods, Porkbun / Spaceship are good.
2. **Collect backup domain names** — add `.io` / `.app` of the same name to your watchlist, no rush to register but track them
3. **Reserve Bundle ID** — when registering iOS / Android developer accounts down the line, use `com.XXX.*` prefix; grab it now
4. **Rewrite all docs** — every "TBD" placeholder in your existing notes, batch-replace now
5. **Plan subdomains** — `stock.XXX.com` / `vault.XXX.com` / `blog.XXX.com` should be pre-thought-out, so you don't rewire DNS later

---

## 5 anti-patterns (each of which I stepped on once)

### ❌ Opening with "what do you want to call it?"

The answer will be "I don't know, what do you recommend?" Without the tone step done first, throwing out 10 candidates just makes it more confusing.

### ❌ Proposing candidates too early

"I think Laither is pretty good, what do you think?" — the moment you say that, the other person's independent judgment is over. **Dimensions first, candidates second, scoring third** — order matters.

### ❌ Chasing absolute uniqueness

Githlay scored 10/10 on distinctiveness but 5/10 on memorability. **Distinctiveness isn't "the higher the better," it's "sufficient distinctiveness"**.

### ❌ Using real name / initials

Problems down the road with personally-marked brands:

- Incorporating = rebrand (brand equity reset)
- Team won't identify with the name after hiring
- VCs will push you to rename during fundraising

**Brand equity should be transferable** — plan for that from day one.

### ❌ Only checking .com without search and trademark

Someone registered "Gemini" as an app, then Google launched Gemini AI and crushed them. Colliding with a big brand's trademark is just handing over your brand.

---

## Toolkit

| Tool | Purpose | Free? |
|---|---|---|
| `rdap.verisign.com/com/v1/domain/XXX.COM` | `.com` lookup | ✅ |
| `rdap.nic.io/domain/XXX.io` | `.io` lookup | ✅ |
| `rdap.nic.app/domain/XXX.app` | `.app` lookup | ✅ |
| Porkbun / Spaceship | Domain registration | $10-20/year |
| USPTO TESS | US trademark | ✅ |
| EUIPO eSearch | EU trademark | ✅ |
| `branddb.wipo.int` | WIPO global trademark | ✅ |
| `duckduckgo.com` / `bing.com` | Search occupancy | ✅ |
| `urbandictionary.com` | Negative slang check | ✅ |

## Time budget

From zero to landing a good brand name, assuming a clear decision framework:

- Step 1-2 tone + core · 30 min
- Step 3 coinage · 30-60 min
- Step 4 availability (5 candidates in parallel) · 10 min
- Step 5 scoring · 10 min
- Step 6 landing · 30 min

**Full process 2-3 hours**, feels best spread across a half-day.

---

## Aftermath

The real value of this methodology isn't "guaranteeing a great name" — it's **guaranteeing no regret 3 months later**. Gut-picked names often feel "a bit off" a month after launch, and need changing at 6 months; each change throws away some brand equity.

After running through the 5 steps, even if what comes out isn't "stunning," it will be "defensible + future-expandable." Defensible > stunning — that's the truest lesson from running this a few times.
