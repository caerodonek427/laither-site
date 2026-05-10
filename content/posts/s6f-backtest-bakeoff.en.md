---
title: "From -0.60% to +5.80%: a 6-strategy 3-year backtest bake-off (with Simpson's paradox reflection)"
subtitle: "A-share quant strategy dev log · and how I nearly got fooled by my own backtest numbers"
date: 2026-05-08T21:36:00+08:00
draft: false
tags: [quant, backtest, A-share, strategy, research, Simpson's paradox]
categories: ["Methodology"]
summary: "Six strategies backtested on 2023-2025 data, 30,000+ trades, ranging from S2PP daily limit-up chasing at -0.60% all the way up to S6F low-PE with market-trend filter at +5.80%. But behind the pretty number is a Simpson's paradox trap: 2025's 66% of the sample single-handedly diluted the 2023/2024 back-to-back losses. This post preserves both the original process and the cool-down reflection."
---

## ⚠️ Warning before reading

> Context for non-A-share readers: A-share refers to the mainland Chinese stock market (Shanghai + Shenzhen exchanges). Trading uses T+1 settlement (can't sell same-day), has a daily price limit (±10% for most stocks; "limit-up" = hitting the +10% ceiling), and retail investors make up >60% of volume — which makes momentum and emotional-window patterns much stronger than in US equities.

The first draft of this article excitedly promoted S6F's `+5.80%` aggregate return. **A few hours after writing it, a reader pointed out**:

> "Year by year: 2023 -2.36%, 2024 -1.16%, 2025 +9.94%. The 3-year aggregate of +5.80% is dominated by 2025's single-year 1316 trades (66% of the sample) — that's a **Simpson's paradox**."

That made me realize: the "3-year aggregate" headline number is poisoned. **This post preserves both the original process and the reflection chapter, as a cautionary tale for fellow researchers**.

---

## TL;DR

| Strategy | Core | 3yr mean | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|
| S2PP (v0) | Daily limit-up chase + 4 iron rules | -0.60% | -1.74% | -0.71% | +2.02% |
| S5A | MA20 crosses MA60, all stocks | +2.72% | -1.76% | +4.85% | +5.04% |
| S6 | Low PE reversal | +3.32% | -3.79% | +6.32% | +9.94% |
| **S6F** | **Low PE + market trend filter** | **+5.80%** | **-2.36%** ❌ | **-1.16%** ❌ | **+9.94%** ⭐ |

**2025 alone: S6F +10% / Sharpe 9.07 looks great**, but **2023 and 2024 were both negative**. The aggregate is a weighted illusion.

---

## I. Failed starting point: S2PP daily-chase school

On 2026-05-07 I had just shipped strategy S2PP: "yesterday limit-up with high volume + 4 iron rules (cold-market / exclude micro-cap / blacklist sectors / bear-market escape)." The 2025 single-year backtest showed `+2.02% / Sharpe 5.72` — I excitedly wrote in my memo, "**the only live-trading candidate right now**."

That evening I backtested 2024 at `-0.71%` and 2023 at `-1.74%`. Aggregate: `-0.60%`.

> **Pretty single-year number ≠ working strategy. First pitfall I stepped on.**

2023 was especially brutal: every quarter was -1% to -3%. The "cold-market" filter classified every quietly-declining day as "open for entry"; after chasing the limit-up, by the T+3 sell the stock had already drifted down 2-3 percentage points.

### Lesson 1 · A backtest covering less than 3 years can't draw conclusions

A-share has 4 structural regimes — bull / bear / choppy / grinding-decline — 1 year doesn't cover enough of them. Minimum sample is 3 years; 5+ is better.

---

## II. Direction turn: from daily to medium-term

The daily-school strategies S1/S2/S3/S2PP all had negative aggregate alpha. I re-examined:

> **The problem might not be "what to buy," but "how long to hold"**

"Yesterday limit-up with volume + buy T+1 + sell T+3" is fundamentally chase-high → mean-revert → catch the falling knife. **This is the single most common mistake made by A-share retail traders**.

Switched to **medium-term strategies**:
- **S5**: MA20 crosses above MA60, hold 30 days
- **S6**: Low PE (<20) + down 15%+ in last 60 days, hold 60 days

### Level 1 optimization · Backtest sped up 5-10x

Engineering concern: S5/S6 needs 65 days of MA history for each query; 242 trading days × 65 days in SQL = **15,730 queries**. The naive implementation took 1-1.5 hours per year; 3 years was an overnight job.

Fix: pull one full year + a ~300-day front-buffer in one query, compute MA vectorized with pandas `rolling().mean()`, then index by date.

**3-year S5 went from 3 hours to 40 minutes**. Key code:

```python
def _build_ma_cross_year_cache(year):
    # pull one full year + 65-day buffer
    df = pd.read_sql(..., date BETWEEN start_buf AND year_end)
    # vectorized MA
    df["ma20"] = df.groupby("code")["close"].transform(lambda s: s.rolling(20).mean())
    df["ma60"] = df.groupby("code")["close"].transform(lambda s: s.rolling(60).mean())
    # previous-day comparison
    df["prev_ma20"] = df.groupby("code")["ma20"].shift(1)
    df["is_cross"] = (df["ma20"] > df["ma60"]) & (df["prev_ma20"] <= df["prev_ma60"])
    # cache by date
    for date, sub in df[df["is_cross"]].groupby("date"):
        _CACHE[date] = sub
```

---

## III. 6-strategy 3-year bake-off

| Strategy | Trades | 2023 | 2024 | 2025 | Aggregate |
|---|---|---|---|---|---|
| S1 composite-score Top10 | 2407 | - | - | -1.29% | - |
| S2 yesterday limit-up volume | 1821 | - | - | -0.58% | - |
| S3 composite-score 20-day hold | 2397 | - | - | -3.71% | - |
| S2PP daily 4 iron rules | 501 | -1.74% | -0.71% | +2.02% | -0.60% |
| S5 MA Top10 | 6138 | -1.68% | +3.79% | +5.65% | +2.50% |
| S5A MA all stocks | 16678 | -1.76% | +4.85% | +5.04% | **+2.72%** |
| S6 low-PE reversal | 5064 | -3.79% | +6.32% | +9.94% | **+3.32%** |
| **S6F low-PE + market trend** | **1993** | **-2.36%** | **+5.82%** | **+9.94%** | **+5.80%** ⭐ |

### 3 key findings

**Finding 1 · Medium-term crushes daily** — Same stock-picking logic, holding 30-60 days beats T+3 by 3-4 percentage points.

**Finding 2 · Low-PE reversal > MA cross** — Deep-drop, low-valuation bottom stocks have systematically larger rebound space than MA-chase-high stocks.

**Finding 3 · The market-trend filter is what makes S6F work**

Only execute the S6 signal when the all-market composite-index MA60 > MA120; otherwise stay in cash:
- **2024 Q1-Q2 avalanche**: F correctly stays in cash, avoids the -12.63% quarter-from-hell
- **2023 grind-down**: F is in cash most of the time, rescues S6's -3.79% to -2.36%
- **2024 Q3 "924" rally**: F reacts late, misses the +21.80% burst (known flaw)

---

## IV. S6F strategy definition (current live-trading candidate)

```
Entry conditions (all must hold):
  1. 0 < pe_ttm < 20
  2. 60-day return < -15%
  3. Total market cap >= 8bn RMB
  4. Not an ST (Special Treatment / distressed) stock
  5. Not in blacklisted sectors (Real Estate / Instruments / Gas / Chemicals / Rubber / Professional Tech Services)
  6. Latest ROE >= 8% AND > 3-year average (trending up)
  7. F market filter: all-market composite index MA60 > MA120

Ranking: score = -ret_60d + (20 - pe_ttm), take Top 10

Position: buy T+1, sell T+60, equal weight
```

Live-trading Top 5 candidates on 2026-05-07:

| Code | Name | PE | 60-day drop | Mkt Cap (100M RMB) | ROE | Score |
|---|---|---|---|---|---|---|
| 601717 | Zhengzhou CoalMining | 8.30 | -26.85% | 356 | 18.88% | 38.6 |
| **601336** | **New China Life** | **5.40** | -23.08% | **2005** | **34.69%** | 37.7 |
| 601319 | PICC | 6.89 | -21.77% | **3264** | 16.10% | 34.9 |
| 600662 | China FortuneHR | 10.61 | -19.29% | 116 | 23.42% | 28.7 |
| 601688 | Huatai Securities | 10.51 | -16.82% | 1721 | 9.20% | 26.3 |

Mostly insurance + brokerages + metals. New China Life at **PE=5.4 + ROE=34.7% + 60-day drop 23%** is a textbook low-valuation reversal candidate.

---

## V. Unresolved holes

1. **Missed 2024 Q3 rally**: F filter lags on trend reversals; can't catch sharp-turn rallies like the "924" event
2. **2023 still -2.36%**: Neither the 4 iron rules nor the F filter block "false-upside rebounds"
3. **Small sample**: S6F only has 1993 trades across 3 years, avg 660/year — wide confidence interval
4. **ROE lookahead bias**: the `financial` table only has the current snapshot, so the backtest uses "future" ROE values

All known flaws. I'm not claiming S6F is the holy grail.

---

## VI. Three takeaways for fellow quant researchers

1. **Backtest 3 years before going live**. Not "go live and watch for two weeks" — it's "**pass backtests on 3 different market regimes before going live**"
2. **Strategy alpha comes from a stack of timing + stock-picking + hedging**, single-factor stock-picking isn't the answer
3. **Level 1 caching + vectorized pandas** moves backtests from hours to minutes — it's engineering, not black magic

## What's next

- Top 5, 10% position each, go live Monday 5/13
- Hold 60 days (through ~2026-08-05)
- Weekly review of F trend; if it turns down, step-reduce positions
- Accumulate 2-3 holding cycles, then publish a "live vs backtest" reality-check post

---

**Open-source**: the backtest framework + S6F generator + Streamlit dashboard all live in my local repo. After accumulating one full holding cycle of live data, I'll clean them up and open-source them.

*(This article is not investment advice. A-share has risks; invest with caution.)*
