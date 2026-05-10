---
title: "Streamlit transposed DataFrame triggers pyarrow errors · the hidden mixed-type column trap"
date: 2026-05-05T11:00:00+08:00
tags: ["Streamlit", "pandas", "pyarrow", "pitfalls"]
categories: ["Debugging notes"]
draft: false
summary: "Streamlit's st.dataframe throws ArrowInvalid when converting mixed-type columns, but the UI fallback doesn't crash — so you don't notice at first. Transposing a DataFrame is a guaranteed way to step on it. Fix: cast to string right before display."
---

## Symptom

A Streamlit project has been running for a while. You open the logs and see this repeating:

```
pyarrow.lib.ArrowInvalid: ("Could not convert '20,30,60,120,250' with type str:
 tried to convert to double",
 'Conversion failed for column 2026-04-18 12:01:28 with type object')
```

Streamlit's **UI doesn't crash** — it has a fallback to HTML table rendering — but:

- Logs spam
- Certain columns display oddly
- Browser F12 may show console warnings

I stepped on this in a quant-research tool. There's a "threshold drift history" table on the page, looks perfectly normal at a glance, but the logs reported 200+ `ArrowInvalid` per day.

## Root cause

Classic **Arrow type inference failure on a mixed-type column**.

Suppose the source CSV `threshold_history.csv` looks like:

```
ts,MA_THRESHOLD,VOL_THRESHOLD,MA_PERIODS
2026-04-18 12:01:28,50.0,3.0,"20,30,60,120,250"
2026-04-19 12:03:00,50.5,3.1,"20,30,60,120,250"
```

`MA_PERIODS` is a string (comma-separated list of periods); the other columns are floats.

The page wants to show "how each field changed over time," so it transposes:

```python
th_t = th.set_index("ts").T
# rows are now field names (MA_THRESHOLD / VOL_THRESHOLD / MA_PERIODS)
# columns are timestamps (2026-04-18 12:01:28, 2026-04-19 12:03:00, ...)
```

**After transposing, every column contains all three fields' values** — two floats plus one string, **mixed dtype at the extreme**.

Internally `st.dataframe` converts the DataFrame to an Arrow Table via:

```python
pa.Table.from_pandas(df)
```

Arrow infers column types using sampling + majority-vote. After scanning two floats it decides the column is `double`; the third value, the string `'20,30,60,120,250'`, explodes.

## Fix

**Separate the display table from the data source**. The display table isn't used for computation, so casting to string is a safe fallback:

```python
th_t = th.set_index("ts").T.reset_index()
th_t = th_t.rename(columns={"index": "field"})

# Cast every column except the field name to str
for col in th_t.columns:
    if col != "field":
        th_t[col] = th_t[col].astype(str)

st.dataframe(th_t, width='stretch', hide_index=True)
```

**Don't** apply `astype(str)` to the original `th` DataFrame — `st.line_chart` on the same data still needs floats to render charts. I cast only at the last step before display, keeping the source DataFrame at original types.

## Why the fallback makes this especially sneaky

If Streamlit threw an exception when Arrow failed, I'd have fixed it long ago. But `st.dataframe` has **three fallback tiers**:

1. Preferred: Arrow Table → Perspective.js frontend rendering (fast, supports sort/filter)
2. Fallback 1: if Arrow fails, fall back to **HTML table** rendering (slow, fewer features, still works)
3. Fallback 2: if HTML also fails, show an error message

Most of the time you're seeing **fallback 1**: the UI looks fine, just missing sort/filter — easy to miss by eye.

**So you have to scan Streamlit logs daily**, not just look at the browser.

## Trigger conditions summary

Any one of these three and you're at risk:

1. **Transposed** (`.set_index(X).T`) then displayed with `st.dataframe`
2. A wide-table column originally has `object` dtype mixing strings + numbers / NaN
3. `concat` across heterogeneous sources turns a column into `object` dtype

## A lint rule for yourself

Before writing `st.dataframe(df, ...)`, ask yourself:

> Did this `df` come from `.T` / `.melt` / `.pivot` / `concat`?

If yes, add this step:

```python
for col in df.select_dtypes(include=["object"]).columns:
    df[col] = df[col].astype(str)
```

Or more aggressively — force every non-numeric column to string:

```python
for col in df.columns:
    if not pd.api.types.is_numeric_dtype(df[col]):
        df[col] = df[col].astype(str)
```

## Aftermath

The nature of this pitfall isn't a Streamlit bug — it's Arrow's type-discipline philosophy. Arrow assumes columns are **strictly typed** for performance; hit a mixed type, it explodes. Meanwhile pandas' `object` dtype is fully permissive. Gluing the two together, something eventually gives.

Next time you see `ArrowInvalid`, don't panic — 90% of the time it's this. Find the column, cast to string, done.
