---
title: "Streamlit 转置表 pyarrow 报错 · 混合类型列的隐蔽坑"
date: 2026-05-05T11:00:00+08:00
tags: ["Streamlit", "pandas", "pyarrow", "踩坑"]
categories: ["踩坑笔记"]
draft: false
summary: "Streamlit 的 st.dataframe 对混合类型列做 Arrow 转换时会报 ArrowInvalid,但 UI fallback 不崩,所以一开始察觉不到。转置 DataFrame 后一定会踩,修法是展示前 `.astype(str)` 兜底。"
---

## 症状

Streamlit 项目跑一段时间,打开日志发现反复刷这个错:

```
pyarrow.lib.ArrowInvalid: ("Could not convert '20,30,60,120,250' with type str:
 tried to convert to double",
 'Conversion failed for column 2026-04-18 12:01:28 with type object')
```

Streamlit **UI 没崩** (它有 fallback 退到 HTML table 渲染),但:

- 日志刷屏
- 某些列显示异常
- 浏览器 F12 可能看到 console warning

我踩这个坑是在一个量化复盘工具里,页面有张"阈值漂移历史"表,看起来挺正常,但日志一天报 200+ 条 `ArrowInvalid`。

## 根因

典型的 **Arrow 类型推断失败在混合类型列**。

假设原始 CSV `threshold_history.csv` 长这样:

```
ts,MA_THRESHOLD,VOL_THRESHOLD,MA_PERIODS
2026-04-18 12:01:28,50.0,3.0,"20,30,60,120,250"
2026-04-19 12:03:00,50.5,3.1,"20,30,60,120,250"
```

`MA_PERIODS` 是字符串 (逗号分隔的周期列表),其他都是浮点。

页面想给用户看"每个字段随时间的变化",所以转置:

```python
th_t = th.set_index("ts").T
# 现在行是字段名 (MA_THRESHOLD/VOL_THRESHOLD/MA_PERIODS)
# 列是 ts 时间戳 (2026-04-18 12:01:28, 2026-04-19 12:03:00, ...)
```

**转置后每一列都包含三个字段的值** —— 两个 float + 一个字符串,**mixed dtype** 到极致。

`st.dataframe` 内部把 DataFrame 转成 Arrow Table 用:

```python
pa.Table.from_pandas(df)
```

Arrow 推断列类型用**采样 + 多数投票**的思路,扫到两个 float 后认为列是 `double`,第三个字符串 `'20,30,60,120,250'` 就炸了。

## 修法

**展示表和数据源分开**。展示表不参与计算,转成 str 兜底即可:

```python
th_t = th.set_index("ts").T.reset_index()
th_t = th_t.rename(columns={"index": "字段"})

# 除了字段名那一列,其他全转 str
for col in th_t.columns:
    if col != "字段":
        th_t[col] = th_t[col].astype(str)

st.dataframe(th_t, width='stretch', hide_index=True)
```

**不要**把 `astype(str)` 应用到原始 `th` DataFrame —— 同一份数据的 `st.line_chart` 还需要 float 类型画图。我是在展示前的最后一步才 cast,源数据保持原始类型。

## 为什么 fallback 让这个问题特别隐蔽

如果 Streamlit 看到 Arrow 失败就直接抛异常,我早就修了。但 Streamlit 的 `st.dataframe` 有 **三层 fallback**:

1. 首选:Arrow Table → 前端 Perspective.js 渲染 (快,支持排序/筛选)
2. 回退 1:如果 Arrow 失败,退到 **HTML table** 渲染 (慢,功能少,但能看)
3. 回退 2:如果 HTML 也失败,显示错误提示

大部分情况你看到的是**回退 1**,UI 显示正常,只是没了排序/筛选功能,肉眼难察觉。

**所以要每天扫一次 Streamlit 日志**,不能只看浏览器。

## 触发条件总结

只要满足下面三条之一,就可能踩:

1. **转置** (`.set_index(X).T`) 后用 `st.dataframe` 显示
2. 宽表某列原本是 `object` dtype,里面混了字符串 + 数字 / NaN
3. 多种数据源 concat 后某列 dtype 变 `object`

## 一条 lint 规则

写完 `st.dataframe(df, ...)` 前自问一句:

> 这个 `df` 是从 `.T` / `.melt` / `.pivot` / `concat` 出来的吗?

只要 yes,就加一步:

```python
for col in df.select_dtypes(include=["object"]).columns:
    df[col] = df[col].astype(str)
```

或者更严格 —— 所有非数值列强制转 str:

```python
for col in df.columns:
    if not pd.api.types.is_numeric_dtype(df[col]):
        df[col] = df[col].astype(str)
```

## 后话

这个坑的本质不是 Streamlit 的 bug,是 Arrow 对混合类型列的设计哲学 —— Arrow 为了性能假定列是 **strictly typed**,遇到混合类型就炸。而 pandas 的 `object` dtype 是完全放任的。两者拼在一起总有一天会出事。

下次看到 `ArrowInvalid` 别慌,90% 是这类问题 —— 找到那列转 str,解决。
