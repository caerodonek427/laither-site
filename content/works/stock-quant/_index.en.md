---
title: "stock_quant · Stock-picking and review tool for individual investors"
date: 2026-05-05T10:00:00+08:00
draft: false
description: "Python + Streamlit + open data. Deep review pages, 4-rule resonance, natural-language inspiration DSL. Auto-scan the whole A-share market every evening."
---

# stock_quant

**Not signals, not courses — the system I use myself every day.**

Self-built, self-maintained. 190 tickers in my watchlist, reviewed every evening after close.
Resonance signals from 4 independent rules, inspiration-log backtests written in natural language,
a market-wide volume board you can scan in five minutes before the open.

---

## What it does

- **Daily 4-dimension review** over 190 watchlisted tickers: price-volume, moving-averages, industry-tier context, new/old-face rotation
- **Signal-resonance board**: independent rules, only surface tickers where multiple rules fire the same day
- **3-tier industry lifecycle model** to classify whether a sector is hype / uptrend / repair-mode, so price action reads against the right backdrop
- **Inspiration capture** in a simple natural-language DSL: scribble an idea like "after 3 consecutive up-limits, short-term pullback 5+ days, volume down 30%" and let the system search history for matches
- **Pre-open radar**: top volume-burst / breakout / breakdown / bottom-stabilizer boards every morning

---

## Why

Commercial tools in this space are either expensive (thousand-dollar software selling signals) or dumb (free software that dumps every indicator into a single table and makes you figure it out).

I wanted something in between:

- **Crystallize my repeated judgment into code** — like "MA stacked bullish + volume surge + industry not overheated," which I used to eyeball across 200 tickers every night
- **Keep my own decisions** — the system produces signals, not buy/sell orders
- **Remember my own review notes** — what I was thinking six months ago, what I got right, surfaced back when it's relevant

That's why stock_quant exists.

---

## Pricing

- **Free tier**: 60 parse / hr · 10 evaluate / day · 3 backtest / day · public features, no account
- **Subscriber**: ¥38/month (≈$5). Full watchlist review, resonance alerts, inspiration DSL unlimited, export to CSV.
- Launch target: June 2026.

<form action="/api/subscribe" method="post" style="margin:2rem auto;max-width:480px;">
  <input type="hidden" name="source" value="stock-quant-en-top">
  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
    <input type="email" name="email" required placeholder="you@example.com"
           style="flex:1;min-width:220px;padding:0.65rem 0.9rem;border-radius:6px;border:1px solid rgba(128,128,128,0.4);background:rgba(255,255,255,0.04);color:inherit;font-size:1rem;">
    <button type="submit"
            style="background:#FF8700;color:#fff;padding:0.65rem 1.4rem;border-radius:6px;border:none;font-weight:600;cursor:pointer;font-size:1rem;">
      Request beta invite
    </button>
  </div>
  <p style="text-align:center;font-size:0.85rem;opacity:0.7;margin-top:0.8rem;">First-batch launch notice + beta invite, one email, no list sharing.</p>
</form>

---

## A real example

**How I used stock_quant to look at my watchlist before the May 6, 2026 open**

Based on the market snapshot from April 30, 2026 (last trading day before the May Day break), stock_quant automatically surfaced:

- **Group A · Strong breakouts, 5 names** (e.g. Haide 2 consecutive up-limits + 7.6× volume · Bull Group 13.77× single-day volume · Nanxin Pharma +11.46% on 6.32× volume)
- **Group B · Breakdowns, 4 names** (e.g. Hongtushuke down-limit on 5.27× volume · Jinyu Jidong −7.36% on 5.12× volume)
- **Group C · Bottom-stabilizers, 3 names** (e.g. Jiabiyou down-limit followed by 5 flat sessions)

For each group, concrete **observation actions** (what to do on a ≥5% gap-up, what to do on −3% gap-down, which windows confirm volume) — not buy/sell conclusions. The decision stays with the user.

> Observation notes written Monday evening, May 5. Actual post-break validation gets written back after May 6 open.

---

## FAQ

**Is this a trading bot?**
No. It produces signals and review tables. You still click buy/sell yourself, at your broker.

**Is this for day-traders?**
No. The system is designed around an end-of-day, next-morning cadence. Intraday work is outside scope.

**How much market experience do I need?**
Enough to read basic price/volume and have opinions about industries. The system will not teach you to invest.

**Does it cover markets other than A-shares?**
Not right now. Roadmap includes HK and US tickers; no timeline committed.

**What data source?**
[akshare](https://github.com/akfamily/akshare) + a few additional scraped sources. Everything is cached locally; no paid data feeds required.

---

## About me

Indie developer. Day job: Android systems engineer. Nights: Python tooling for things I want to use myself.

stock_quant is not the first thing I've built, but probably the first I'm taking seriously enough to ship to other people.

Contact: [Laither home](/en/) · [Blog](/en/posts/) · [Other works](/en/works/)

<form action="/api/subscribe" method="post" style="margin:3rem auto 0;padding:1.5rem;background:rgba(255,135,0,0.05);border:1px dashed #FF8700;border-radius:8px;max-width:520px;">
  <input type="hidden" name="source" value="stock-quant-en-bottom">
  <p style="margin:0 0 1rem;"><strong>Still curious?</strong> Drop your email and I'll send the beta invite when the June launch ships.</p>
  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
    <input type="email" name="email" required placeholder="you@example.com"
           style="flex:1;min-width:220px;padding:0.6rem 0.85rem;border-radius:6px;border:1px solid rgba(128,128,128,0.4);background:rgba(255,255,255,0.05);color:inherit;">
    <button type="submit"
            style="background:#FF8700;color:#fff;padding:0.6rem 1.3rem;border-radius:6px;border:none;font-weight:600;cursor:pointer;">
      Notify me
    </button>
  </div>
  <p style="margin:0.8rem 0 0;font-size:0.82rem;opacity:0.75;">Or follow <a href="/en/">Laither home</a> for updates.</p>
</form>
