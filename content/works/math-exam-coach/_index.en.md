---
title: "math_exam_coach · Kids' math contest prep tool"
date: 2026-05-08T10:00:00+08:00
draft: false
description: "Math and English contest training. Built for my own kid, not a subscription product."
---

# math_exam_coach

**This is not a commercial product. It's a training tool I built for my kid to prepare for math contests.**

I'm documenting it here in case any parent runs into the same problem and wants to build something similar — this page is meant to save you some trial-and-error.

---

## Why I built it

My kid needed to work through a lot of past contest problems. Existing apps were either too gamified (distracting away from the actual work) or too paper-bound (slow to grade, hard to revisit mistakes).

What I wanted:

- **Per-problem workflow**: let the kid write out the approach, system grades it, then shows the reference solution
- **Spaced repetition**: wrong answers automatically resurface ~2 weeks later
- **Low-key incentives**: small streak badges, nothing flashy
- **Kid-safe UI**: no ads, no social features, PIN-locked parent zone

Nothing off-the-shelf matched. So I wrote one. It's been in active use for 3 weeks.

---

## Current state

- **12 Streamlit pages**: home · subject · problem · grading · mistake log · review · stats · approach cards · PDF export · settings · about · parent view
- **54 approach cards**: math and English, natural-language writeups
- **Two subjects**: math (primary), English (partial)
- **Core features**:
  - Smart grading: compare the student's written approach against the reference, not just final answer matching
  - Spaced repetition using an SM-2 variant (Anki-style)
  - Streak badges (3/7/15 correct in a row, no animations)
  - Kid mode (PIN-protected parent settings area)
- **SQLite backend + reportlab CID-font PDF export**
- **Runs entirely locally** on the household desktop; the kid uses a tablet over Wi-Fi via QR code

## Notes on tech choices

I picked Streamlit not because it's "fast to build" — because **an education tool should prioritize iteration speed over interaction polish**. The kid doesn't care if a page reloads; I care that I can change UI in 10 seconds.

The whole Python stack (answer matching + spaced repetition + easily pluggable subjects) is about an order of magnitude lighter than a conventional frontend/backend split.

SQLite over a cloud database, for a simpler reason: **this data shouldn't go to the cloud.** A kid's answer history and mistake patterns are not data I want any SaaS to host.

---

## What might come later

I haven't decided whether to commercialize. A few tensions:

- Paid parents' price ceiling for "study software" is low (<¥50/month in China). Wouldn't cover server + content ops.
- Expanding the question bank needs subject experts; one person can't scale it.
- Kid usage data is extremely sensitive → multi-tenant SaaS compliance load is high.

Current direction:

- **Short term**: keep using it at home, sharpen the product.
- **Medium term**: if other parents want it, maybe a "download-a-copy, run it yourself" distribution — no hosted version.
- **Long term**: possibly open source so parents can self-deploy.

---

## If you're a parent reading this

Things you can do:

- **Want a copy?** Email `hi@laither.com`. I'll send a packaged local build (Windows/macOS). Free.
- **Want to compare notes on math contest prep methodology?** Happy to chat by email — I have 3 weeks of usage data and a few takeaways.
- **Work in edtech?** Let's see if commercialization makes sense. I don't have to be the one to do it, but I'd like the approach to reach more kids.

---

## vs stock_quant

Readers sometimes ask: "You work on [stock_quant](/en/works/stock-quant/) and math_exam_coach — same direction?"

No.

- **stock_quant** is the **main commercial line**, subscription launching June 2026, aimed at becoming income that supports me working independently.
- **math_exam_coach** is a **personal utility**, not going to be a business in the near term, maybe open-sourced later.

Running both in parallel mainly because stock_quant is tool-plus-cognition (financial decision-making), math is tool-plus-pedagogy (learning). The product-thinking differences between the two domains are big; alternating between them keeps me from defaulting into "everything should be a SaaS."

---

## Contact

Interested in a copy or have thoughts: email `hi@laither.com`

More works: [Works index](/en/works/) · Technical blog: [Blog](/en/posts/)
