---
title: "A-Share Post-Holiday Day 1 Review: Best Fundamentals ≠ Best Performer"
date: 2026-05-06T21:00:00+08:00
tags: ["stocks", "quant", "review", "lessons"]
categories: ["Methodology"]
draft: false
summary: "First trading day after a 5-day holiday. Pre-market I spent 2 hours ranking stocks from overseas markets to sectors to individual tickers — my A-group picks #1 and #2 both crashed. The actual winner was my 'secondary' pick 688051 Jiahua (+9.00%). Reviewing the day showed I tuned the fundamental filter too narrow, ignoring a stronger axis: April 30's momentum."
---

> **A-share context**: Mainland China markets trade T+1 with daily price limit ±10% (some STAR/ChiNext +20%). A "limit-up" (涨停) = stock hit +10% cap. Retail owns ~60% of daily volume, which makes post-holiday sentiment-driven surges very common. The Labor Day holiday is a 5-day break (May 1-5 in 2026).

> **Data saved**: `C:/tmp/offline_20260506_intraday/` — 7 snapshots + 15:00 close freeze (Eastmoney backend down, failed over to Sina feed)

## Incident TL;DR

- **Pre-market A-group #1**: Haide Securities 000567 (Q1 +332% · only private AMC license in A-shares) → **Close -0.45%**
- **Pre-market A-group #2**: Gongniu 603195 (19¥ dividend / share · buyback) → **Close -2.99%**
- **Pre-market A-group #5**: Nanxin Pharma 688189 (leveraged bet) → **Close -3.13%**
- **Dark horse winner**: Jiahua Tech 688051 (I ranked it #3, judged "main business not semi, AI is fluff") → **Close +9.00% on high volume**
- **Fish that got away**: Changjiang Securities 000783 (**not on my pre-market list at all**) → **Hit limit-up +10.01% all day**
- **Benchmark winner**: Xiongtao 002733 (flagged pre-market but said "no action") → **Close +7.12%**
- **Sector king of the day**: Storage chips · Jiangbolong / Zhuoyi / Longcom / Shanghai Hejing **all 4 hit 20CM cap** · Haiguang +16.26%

## What I did pre-market

Got up 5:30 AM Monday, 2 hours of analysis after arriving at 7:00 AM:

1. **Overseas gap matrix** - US + Europe + commodities + FX + HK stocks over 5 days
2. **9-ticker pre-market news scan** - Q1 earnings + annual report + past 5 days announcements
3. **Peer comparison** - 3 AMC firms + 3 hydrogen firms Q1 earnings compared
4. **Corporate actions / shareholders / pledge risks** — 8 dimensions total

I did these 4 things thoroughly. **The error was in the filter.**

## Where the filter failed

My ranking logic was:

```
A-group priority = fundamental quality × earnings momentum × theme uniqueness
```

Which ranked:
1. Haide (Q1 +333% · AMC license rarity)
2. Gongniu (Q1 +8.55% · high dividend + buyback triple catalyst)
3. Jiahua (only "smart environment + AI concept", judged "concept is fluffy")
4. Yihuatong (hydrogen, but Q1 gross margin -36% dragging)
5. Nanxin (leveraged bet)

**Missing axis: April 30 momentum**.

- Changjiang Securities **hit limit-up on 4/30** (296M shares, 5× volume), post-holiday Day 1 is the momentum's "second wave", **5/6 limit-up again**
- Jiahua **accumulated +24% over 5 days 4/23-4/30**, Day 1 post-holiday is **momentum's "third wave continuation"**
- Haide **also hit limit-up on 4/30**, but its **spike-and-fade intraday pattern + Shenzhen-Connect net buy only 18.5M then reversed** — momentum is "burning out"
- Gongniu **pumped 12× volume to +8.49% on 4/30**, already in "profit-taking ahead of ex-dividend + institutional rebalance"

**If I'd added the "April 30 momentum" axis**, the ranking should have been:
- Changjiang Securities × limit-up day volume = strongest momentum
- Jiahua × continuation persistence = second
- Haide × spike-fade pattern = **momentum already released**
- Gongniu × high volume but ex-dividend pending = **passive momentum**

My #1 and #2 picks **showed "momentum digestion zone" at the pre-market signal level**, but I used fundamental data to support them anyway.

## The actual pattern

**In A-shares post-holiday Day 1, money doesn't seek the strongest fundamentals — it seeks sector leaders × sentiment resonance**:

- **Financial sector**: Already warming up pre-holiday → Changjiang Securities took the baton (Huijin + state-backed + securities triple theme)
- **AI / restructuring concepts**: Pre-holiday launch → Jiahua as mid-cap beta play
- **High dividend + large cap**: Gongniu too heavy, money doesn't push it
- **AMC quality**: Haide is good, but **money prefers the bigger financial theme (securities) over the niche (AMC)**

## Intraday system saved some ground

Good thing I added **page 14 realtime refresh** (Plan C) to stock_quant during the 5-day break. The intraday snapshots let me:

- Catch 688051 Jiahua's volume spike (09:43 starting → 11:25 +6.59% → 14:57 +8.62% → **close +9.00%**) → Correct the prediction
- Spot 000783 Changjiang Securities locked at limit-up by morning → Realize "fish that got away"
- Use 5 scheduled snapshots 10:43/10:50/11:00/11:15/11:25 + afternoon 14:57 Sina fallback, track 20 key tickers

**One cost worth logging**: Afternoon 13:10/13:30/14:00/14:30/14:55 scheduled snapshots all failed on Eastmoney `stock_zh_a_spot_em` with 5 consecutive `RemoteDisconnected`. **The script didn't have a Sina fallback**, so it just spun empty. Had to manually run `realtime.py` from `stock_trade_analysis` at 14:57 to recover closing data. First thing post-market: add multi-source fallback to both `intraday_snapshot.py` and `realtime.py`.

**Data visualization > pre-market reasoning**. Pre-market prediction is just the start — can't replace intraday observation. But the precondition is the observation tool can't die in critical windows.

## Post-market update · Found 77% of pct_chg was polluted

Writing this review and going back to implement the momentum filter, I found the local `daily` table's `pct_chg` column has severe pollution:

| Date | % rows with pct_chg=0 | Reality |
|---|---|---|
| 4/29 | 93.5% | True `(close-prev)/prev` non-zero, max +9.98% swallowed to 0 |
| 4/24 | 91.7% | Same |
| 4/23 | 93.0% | Same |
| 4/22 | 96.2% | Same |
| 4/20 | 96.2% | Same |

This is an upstream bug in `akshare.stock_zh_a_hist` — on days when "pct_chg is close to 0", it writes `pct_chg = 0` directly (but open/close/high/low are all correct). Scan found **21,834 rows** polluted across 14 trading days in the past 30 days.

Wrote a SQL patch using `(close - prev_close) / prev_close * 100` to recompute and write back, error threshold 0.3% (let through real micro movements). After fix, two conclusions in this article **changed**:

1. **Haide 000567 was actually a two-day limit-up sequence**: 4/29 true limit-up +9.98% (recorded as 0), 4/30 limit-up again +10.07%. My "Haide also limit-up'd 4/30, spike-fade" was correct, but I underestimated momentum strength — after 2 consecutive limit-ups, day 3 (5/6) -0.45% is **even more classic burning-out**, momentum score jumped 10.89 → 18.64.

2. **Jiahua 688051's "5-day continuous rise" description was imprecise**: Actually **4/23 was a 20CM big rally +15.47%** (single-day gain nearly max), then 4/24~4/30 consolidated, 5/6 accelerated again +9.00%. Not "continuous rise" — it's "breakout, consolidate, re-accelerate".

Momentum 4-quadrant classifier's market backtest numbers also adjusted slightly (🔥 Sustained group limit-up rate 27.8% → 25.0% after fix), but **conclusion holds**: sustained momentum group's limit-up rate is 8.3× market (3.0%), burning-out group is 0%.

The fix script (`scripts/fix_daily_pct_chg_pollution.py`) is now in daily `run_daily.bat` Step 1.2, auto-fixes after each data pull, no more accumulation.

Lesson: **In quant, don't trust vendor-provided fields — for key dimensions, verify against raw data once**. I watch open/close every day, but pct_chg is derived, used often but verified little, got burned for nearly a month.

## 5 takeaways today

1. **Filter needs a "momentum axis"** - April 30 limit-up/volume is the forward signal for post-holiday Day 1
2. **Sector leaders beat niche champions** - In financials pick big brokers, not niche AMC
3. **Good fundamentals ≠ short-term rally** - Old truth, but easy to forget when writing yourself
4. **Pre-market peer comparison "missing fish" worth chasing** - I spotted Xiongtao > Yihuatong, but missed Changjiang Securities > Haide
5. **Realtime system must have a Bottom 10 panel** - Top 10 only shows volume spikes, doesn't show "who's dumping"

## What to change tomorrow?

- **Pre-market list expanded to 15 tickers** (A-group + peer leaders + past 10 days limit-up board)
- **Page 14 adds "4/30 cumulative speed" column + "money flow"**
- **Drop "strongest fundamentals" ranking, change to weighted momentum + fundamentals composite**
- **The fault trade**: If I'd set 3% stop-loss on Haide, loss would be < 0.8%, and I'd have caught 688051's +5% return instead

## System-level fix list (post-market v1.1)

- [x] `scripts/intraday_snapshot.py` **add Sina fallback** (same-day post-market delivered, all 5511 auto-degrade)
- [x] `src/fetch_snapshot.py` add 5 momentum columns + `momentum_phase` 4-quadrant classifier
- [x] `scripts/fix_daily_pct_chg_pollution.py` fix 21,834 rows of akshare pollution + into run_daily
- [x] Page 14 add "📛 Yesterday's limit-up board" (117 tickers volume-sorted + 3 optional columns + realtime phase join)
- [ ] Page 14 add market temperature + watchlist alert panel
- [ ] Pre-market list expansion: A-group + peer leaders + past 10-day limit-up (~15 tickers)
- [x] Auto "📊 Pre-market prediction hit rate" panel (page 15 · prescreen_store + attach_realized)
- [ ] Blog workflow integrates with stock_quant data (today's post numbers were pulled manually at 14:57)
- [x] `scripts/intraday_snapshot.py` + dual schtask automation (5/7 onward 55× daily auto-save intraday)

---

**Note to self**: The market will teach you with a different angle next time. The point of quant isn't chasing "100% prediction" — it's extracting reusable patterns from every miss. Today's snapshots + review — worth it.

*This is Part 2 of the Laither quant-review series. Code repo: [stock_quant](https://github.com/laither) · Review data: `C:/tmp/offline_20260506_intraday/`*
