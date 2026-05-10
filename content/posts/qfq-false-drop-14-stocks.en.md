---
title: "14 'Fake Big Drops' in A-Share Backtests: How Ex-Dividend Fools Your Strategy"
date: 2026-05-10T10:00:00+08:00
tags: ["quant", "backtest", "A-share", "data cleaning", "front-adjusted price"]
categories: ["Quant R&D"]
draft: false
summary: "My S6F strategy used '60-day drop > 15%' as a deep-drop filter. After backfilling front-adjusted (qfq) prices, I found 14 stocks the raw close filter hit were not actually down — they'd just gone ex-dividend. Good news: S6F Top 10 candidates didn't change. Bad news: your strategy might not be so lucky."
---

> **Context for non-A-share readers**: This post talks about a universal problem — if your backtest uses raw closing prices without adjusting for corporate actions (dividends, stock splits, bonus shares), you'll see "fake drops" on ex-dividend days that aren't real price moves. In China-speak, `qfq`(前复权 / front-adjusted) rescales all historical prices so today's price = the real post-action price, preserving the true return. Your country may call this "adjusted close" or "total return price."

## A counterintuitive finding

My S6F strategy uses a simple condition:

```sql
WHERE (today_close / 60_days_ago_close - 1) * 100 < -15  -- Down >15% over 60 days
```

Looks harmless — drop over 15% counts as "deep drop", potential mean-reversion candidate.

Until I re-ran the backtest with front-adjusted prices (`close_qfq`).

## Discovered 14 "fake deep drops"

**2026-05-07 comparison**:

| Method | # Triggered |
|---|---|
| raw close (unadjusted) | 901 |
| **close_qfq (front-adjusted)** | 887 |
| Only raw triggered (**fake drops**) | **14** |
| Only qfq triggered (raw missed) | 0 |

These 14 stocks looked -15% to -35% on raw close but were actually down only 0-12% (or up!) after adjustment. **They didn't drop — they went ex-dividend.**

## The 14 names

| Ticker | Name | Industry | raw drop | qfq drop | Delta |
|---|---|---|---|---|---|
| 300532 | Jintian Intl | Software | **-35.47%** | -8.20% | 27.3 |
| 301082 | Jiusheng Electric | Electrical | **-32.46%** | -11.80% | 20.7 |
| 600506 | Tongyi | Petroleum | -28.15% | -6.46% | 21.7 |
| 301016 | Reerwei | Aerospace | -27.63% | **+1.96%** | 29.6 |
| 300996 | Pulian Software | Software | -25.63% | **+4.73%** | 30.4 |
| 301279 | Jindao Tech | General Eq | -23.93% | -0.41% | 23.5 |
| 002393 | Lisheng Pharma | Medicine | -23.16% | -5.20% | 18.0 |
| **688535** | **Huahai Chengke** | Computer | -21.08% | **+16.78%** | **37.9** ⭐ |
| **301280** | **Zhucheng Tech** | Computer | -19.69% | **+12.84%** | **32.5** ⭐ |
| 300458 | Allwinner | Computer | -17.58% | -0.65% | 16.9 |
| **001299** | **Meineng Energy** | Gas | -16.29% | **+12.59%** | **28.9** ⭐ |
| 300146 | By-Health | Food | -15.79% | -12.64% | 3.2 |
| 002911 | Foran Energy | Gas | -15.18% | -13.53% | 1.6 |
| 300100 | Shuanglin | Auto | -15.14% | -14.90% | 0.2 |

## Extreme case: Huahai Chengke

688535 Huahai Chengke · raw -21%, qfq +17%, **38 percentage points difference**.

What happened? In 2025: **15 bonus shares per 10 held** + 1 yuan / share dividend. After ex-date the price dropped visibly, looking "down 40%", but front-adjusted prices align with the pre-ex-date value, **preserving the true trajectory**.

**Zhucheng Tech / Meineng Energy** similar — both had major bonus issues or dividends in the past 60 days.

## Why S6F wasn't affected

**Good news**: My S6F strategy uses "60-day drop >15%" combined with:

1. **PE < 20** — many ex-dividend fake-drop stocks don't have low enough PE
2. **Market cap >= 8 billion RMB** — half of the 14 are < 6 billion, get filtered
3. **ROE >= 8% and trending up** — bonus-issue stocks don't necessarily have strong fundamentals
4. **Industry not in blacklist** — 2 gas stocks excluded directly

**Bad news**: If your strategy uses only "deep drop" as a single-condition filter, **14 fake-drops = 1-2% of your candidate pool**.

## The crueler trap: back-adjusted has the opposite problem

Front-adjusted fixes historical data. Back-adjusted (后复权 / back-adj) is the inverse:
- **Back-adjusted**: Lower historical prices so today's price = actual post-dividend price
- Used for **intraday live price alignment**, e.g., "percentage return vs N days ago" calculation

**Most A-share quant projects use front-adjusted** because it's strategy-friendly.

(Same principle applies to US stocks — Yahoo Finance's "Adj Close" is equivalent to front-adjusted.)

## Practical recommendations

### 1. When pulling data, use `adjust='qfq'`

```python
# Wrong
df = ak.stock_zh_a_hist(symbol='601336', period='daily')

# Right
df = ak.stock_zh_a_hist(symbol='601336', period='daily', adjust='qfq')
```

### 2. For existing data, add column don't drop table

My approach: add a `close_qfq` column to `daily` table, keep original `close`. Benefits:
- New strategies use `close_qfq`
- Old strategies unchanged
- Can compare both methods' backtests

Backfill script for 5500 stocks × 3 years took 45 minutes locally. Core logic loops tickers calling akshare's qfq endpoint, writes `close_qfq` column back, failed codes go into retry queue.

### 3. Regular incremental updates

Ex-dividend events typically happen **May-July** (pre-interim report) and **December-January** (pre-annual report) in A-shares.

(Your market may have different timing — US: quarterly dividends distributed throughout the year.)

My `run_daily.bat` pulls latest `close_qfq` every night, so stocks that went ex-dividend today get corrected by tomorrow.

## Conclusion: A simple adjustment may affect 1-2% of your candidate pool

Raw and front-adjusted prices agree on 95% of stocks, but that 5% systematic bias **amplifies 10×** under filters like "deep drop >15%".

**If your strategy uses "N-day price change" as a filter**, consider:

1. Switch to `close_qfq` now
2. Or add a second filter: "no ex-dividend events in past 60 days"

---

## Appendix: Quick self-check

Run this on your sqlite:

```sql
-- Stocks with >5% close_qfq / close divergence in past 60 days
SELECT code, COUNT(*) as n
FROM daily
WHERE date >= date('now', '-60 days')
  AND close > 0 AND close_qfq > 0
  AND ABS((close_qfq - close) / close * 100) > 5
GROUP BY code
ORDER BY n DESC;
```

If some code has n > 30, it likely went ex-dividend recently — "deep drop" filters will give false signals on its history.

---

**This post is research sharing only, not investment advice.**
