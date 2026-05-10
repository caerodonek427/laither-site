---
title: "Momentum 4-Quadrant Design: Turning 'Yesterday's Limit-Up' Into a Tradeable Signal"
date: 2026-05-06T21:30:00+08:00
tags: ["stocks", "quant", "signal design", "momentum"]
categories: ["Methodology"]
draft: false
summary: "Yesterday's limit-up doesn't mean today will go up. Two stocks both hit limit-up yesterday — Haide closed -0.45% today (momentum burned out), Changjiang Securities closed +10.01% (momentum continued). One axis can't tell them apart. Add 'today's pct_chg' as a second axis and four quadrants pop out. May 6 2026 backtest: the 🔥 sustained-momentum group hit limit-up 25% of the time (8.3× market average)."
---

> **A-share context (for overseas readers)**: Mainland China stocks trade T+1 with a daily price limit of ±10% (some ±20% for STAR/ChiNext). A "limit-up" (涨停) means the stock hit the +10% cap and can't go higher that day. Retail owns ~60% of daily volume in China, so momentum signals tend to persist more than in US markets.

> **Positioning**: This is Part 3 of my Laither quant-review series. Parts 1-2 covered why I started stock_quant and the post-holiday Day 1 failure review. This post covers the technical upgrade that came directly out of that failure.

## The problem after the crash

[Previous post](/en/posts/a-share-post-holiday-first-day-lessons/) described how I pre-ranked 5 fundamentally-strong stocks on 4/30: 3 lost, 2 flat, 0 won. Review revealed that **yesterday's limit-up** was a stronger signal than fundamentals — but there was a catch:

```
117 stocks that hit limit-up on 4/30, their 5/6 performance:
- Limit-up again: 23 (19.7%)
- Strong up +3~+9.8%: 33 (28.2%)
- Flat -3~+3%: 53 (45.3%)
- Reversed <-3%: 7 (6.0%)
```

Using only "yesterday's limit-up" as a filter, you'd buy both Changjiang Securities (good) and Haide (bad). So the question becomes: **how do you distinguish among limit-up stocks themselves**? Can an algorithm identify real continuation vs. a dying rally?

## Why one indicator isn't enough

The intuitive idea is "limit-up + high volume = strong, limit-up on low volume = weak". I first built a `momentum_score`:

```python
momentum_score = (
    limitup_days_last_20d * 3          # limit-ups in past 20 days
    + high_vol_days_last_20d * 1        # high-volume days (>=5x avg)
    + cum_pct_5d * 0.5                  # cumulative 5-day pct
    - penalty_if_no_recent_limitup      # penalty if no recent limit-up
)
```

Ran the numbers — Haide scored 18.64 (2 consecutive limit-ups + high volume + 23% cum 5-day), top 5 in the market. But —

**Haide's same-day performance was -0.45%**. High `momentum_score` ≠ today will go up.

Intuition said **"momentum released" and "momentum sustained" are two different things**. But looking only at "yesterday" as a single axis, you can't tell which will happen today.

## Adding one axis solves it

Key insight: **today's pct_chg is realized data, not predicted data**. Pre-market I don't know today's close, but **by 09:35 (5 minutes into session) I have the first 15 minutes of pct_chg**. Use that intraday data × yesterday's momentum score = a 2-layer filter:

|  | Today pct_chg ≥ +3% | -3% < Today < +3% | Today pct_chg ≤ -3% |
|---|---|---|---|
| **Momentum ≥ 5** | 🔥 Sustained | ⚠️ Burning out | 🚫 Crashing |
| **Momentum < 5** | 🟢 Fresh start | ⚪ No momentum | ⚪ No momentum |

Four quadrants, four behaviors:

- 🔥 **Sustained** · Strong yesterday, continuing today → **main trade**
- 🟢 **Fresh start** · Quiet yesterday, breaking out today → **secondary**
- ⚠️ **Burning out** · Strong yesterday but fading today → **avoid** (momentum burnt)
- 🚫 **Crashing** · Strong yesterday but reversing today → **avoid** (falling knife)

## May 6 2026 backtest numbers

All 5511 stocks that day:

| phase | n | Avg return | # limit-ups | Limit-up rate | Takeaway |
|---|---|---|---|---|---|
| 🔥 Sustained | 187 | **+6.94%** | 52 | **25.0%** | 8.3× market |
| 🟢 Fresh start | 914 | **+5.68%** | 114 | 12.5% | 4.2× market |
| ⚠️ Burning out | 244 | +0.59% | 0 | 0% | **True dead zone** |
| 🚫 Crashing | 42 | -4.30% | 0 | 0% | Reverse signal |
| ⚪ No momentum | 4128 | +0.33% | 0 | 0% | Market baseline |

Market baseline limit-up rate was 3.0% (166/5511). The 🔥 Sustained group's 25% is 8.3× that. More importantly, ⚠️ Burning out and 🚫 Crashing both had 0% limit-up rate — **negative predictive power is as valuable as positive**, telling you "don't chase these."

## Review validation: all classified correctly

Putting my original A-group picks and some reference stocks through the classifier:

| Stock | Today | Momentum | Phase | Reality |
|---|---|---|---|---|
| 000567 Haide | -0.45% | 18.64 | ⚠️ Burning out | ✅ Correctly flagged |
| 688189 Nanxin | -3.13% | 14.64 | 🚫 Crashing | ✅ Correctly flagged |
| 000783 Changjiang Sec | +10.01% | 9.48 | 🔥 Sustained | ✅ Correctly flagged |
| 688051 Jiahua | +9.00% | 6.61 | 🔥 Sustained | ✅ Correct (limit-up 4/30 too) |
| 603195 Gongniu | -2.99% | 2.84 | ⚪ No momentum | ✅ No 4/30 limit-up, fair |

Yesterday I ranked Haide #1 based on "fundamentals + earnings". If I had filtered with `momentum_phase == "🔥 Sustained"` top 20, Haide would be excluded (it's ⚠️), and Changjiang Securities / Jiahua / Feiwotai (the actual winners) would be in.

## A trap worth flagging

This classifier is **not a limit-up predictor** — it's a **risk classifier**. It can tell you:

- ✅ "These stocks are likely strong today" (🔥 group)
- ✅ "Don't touch these today" (⚠️ / 🚫 groups)
- ❌ "How much X will rise tomorrow"

Also the thresholds (momentum ≥5, pct ≥+3% or ≤-3%) are **single-day empirical values**. Next steps:

1. Validate thresholds across multiple days (not just today's coincidence)
2. Add intraday patterns: spike-then-fade vs. late-session pump, both are "+3%" but different meaning
3. Add money-flow / northbound data: burning-out often correlates with Shenzhen-Connect sells

## Where's the code

In `fetch_snapshot.py`, the `_load_momentum_features()` function and the `momentum_phase` column live in the `stock_quant` repo (not yet open source, waiting for stability). Data layer is sqlite + akshare free feed + Sina as fallback.

---

**Note to self**: Last night in blog post 2 I wrote "the filter needs a momentum axis." This noon I implemented `momentum_score`, afternoon realized it wasn't enough, evening added phase, producing this table. Full implementation cycle was 6 hours, and the essential change was going from "ranking with one number" to "classifying with two numbers". **Many breakthroughs in quant aren't about adding more data — they're about slicing the same data differently.**

*This is Part 3 of the Laither quant-review series. Previous: [A-share Post-Holiday Day 1 Lessons](/en/posts/a-share-post-holiday-first-day-lessons/)*
