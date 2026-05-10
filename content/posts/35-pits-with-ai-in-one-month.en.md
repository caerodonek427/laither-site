---
title: "One month working with AI · 35 pitfalls I stepped on"
date: 2026-05-09
tags: ["AI", "Claude Code", "pitfalls", "collaboration", "engineering discipline"]
categories: ["Methodology"]
draft: false
summary: "Between April 20 and May 9, I accumulated 35 feedback entries in my AI-collaboration rule library. Not a hype piece, not a hit piece — these are pitfalls stepped on while using it across four fronts: code review, quant strategy, personal site, and daily automation. The rolling monthly view is more interesting than I expected: it's not that AI is getting more ready, it's that the shape of the pitfalls is shifting — April was all about diagnostic thinking; May shifted toward interaction discipline and business judgment."
---

## Context

For the past 20 days my AI-collaboration environment has been Claude Code: it has local bash/file/script permissions, can call MCP servers to hit internal tools, and can run background agents for hours. Compared with a pure chat-style AI, the surface area for both errors and delegated authority is much larger — a script it writes might actually run on my laptop, a commit might actually land in my local repo, a scheduled task might actually fire at 3 AM.

So out of 35 pitfalls, only a tiny few are classic AI hallucinations. Most of them cluster into three categories:

- **It can use tools → it used my tools wrong**
- **It has autonomy → it stepped over a boundary**
- **It has context → the context polluted its judgment**

Below, grouped by those three hooks, sorted within each group by date of first occurrence. Item numbering 1-35 is preserved so you can cross-reference with the monthly distribution table at the end.

---

## It can use tools → used my tools wrong (12 items)

> These are the pitfalls that show up the moment AI fires off a tool call that goes sideways: parallel-as-serial, wrong process killed, misread curl response, commit without push, wrong tool configuration. This class of bugs surfaces fastest — the symptom is a failed command or a tool error — but the cost is often more than one retry.

### 1. Multi-file tracing should be parallel, not serial (4/20)

When tracing a code path across multiple repos, I initially asked AI to read A first, then B, then C. It obediently went serial — 10 files, 40 seconds. In reality the Read/Grep tools can fire 10 parallel calls and finish in 10.

**Lesson**: When you're tracing a long chain, say so in the prompt — tell it to read the next N files in parallel. Don't let it default to serial.

### 9. Scripts for users must be simulated locally (4/23)

AI wrote a `.bat` file for a teammate to collect logs. Locally I Read the content, reviewed the syntax, signed off. Teammate's video feedback: double-click, flash, gone. Turns out AI used Write's default LF line endings, and cmd treated the entire bat as one line — everything after `@echo off` never executed.

**Lesson**: Scripts you hand to someone else — run them yourself under cmd //c, inject stdin for pause prompts. Static review misses line endings, encoding, permission token — all runtime issues.

### 11. Proactive check-in on long waits (30 min) (4/24)

I had AI run a background agent for a code scan. Budget was 2 hours, but the agent stalled at 60 minutes — AI didn't check on it, just waited silently until I got back.

**Lesson**: Any background task / agent / slow MCP response — if it's been silent for more than 30 minutes, proactively check.

### 16. Don't taskkill the Streamlit dev server the user is using (5/2)

After a full regression test, AI wanted to clean up the environment and ran `taskkill //IM python.exe` as a blanket sweep. Killed the dev server I was actively using.

**Lesson**: Kill processes by exact PID — always `tasklist | grep` first, then act.

### 17. Streamlit regression test: HTTP 200 is not enough (5/2)

AI's regression script just curled the home URL and checked the status code — 200 = pass. Problem: when Streamlit throws a Traceback, the error page itself returns 200. The exception is rendered as HTML and shown in the browser.

**Lesson**: Streamlit tests must grep for Traceback/NameError — 0 lines is the pass bar.

### 25. Commit-then-push is one action (5/8)

One project I was local-ahead-of-origin-main by **3 days / 6 commits** before noticing. AI had rationalized "push everything together at the end." Except the next day I'd pull on another machine — and pull what? Yesterday's stale state.

**Lesson**: Commit and push are the same action. At the end of every session, verify `git log origin..HEAD` is empty.

### 26. Memory is bound to cwd (5/8)

This one is Claude Code-specific (other AI tools may not hit it), but the underlying illness is worth discussing: Claude Code's project memory directory is mapped by cwd. Shells started from different paths write to different memory folders; both sides keep updating independently, silently diverging for a while before I noticed.

**Lesson**: AI tools' notion of "project directory" is based on launch path, not current-command path — tool state pinned to the launch environment is an industry-wide issue, not unique to one tool. Always launch from the same cwd. That's the floor.

### 30. Parallel-by-default, but still ask on A/B/C branches

Two default-value boundaries: execution-type questions run in parallel without asking; decision-type questions stop and ask.

### 31. Long-wait 30 min check-in (duplicate)

Same rule as item 11, just from a different angle. Waiting is an expensive behavior — silent cost doubles.

### 33. Don't re-report known pending legacy issues

Code review had a batch of historical issues already confirmed to be patched in a queued CL. Reporting them every review is noise — you have to feed the exclusion list to the AI.

### 34. Memory priority conventions (P0/P1/P2/P3)

Every rule/reference in the memory library gets a priority prefix. P0 daily mandatory, P1 frequent pitfalls, P2 infrequent reference, P3 short-term state. Memory without priority is just a pile of un-indexed text.

### 35. Check the review system before diagnosing

Before diagnosing a bug, look at the code review system for an existing fix CL. One time I reasoned my way into "module A must need the change," AI actually made the change — but somebody else had already fixed it in module B weeks ago, via a completely different approach.

**Lesson**: AI's instinct is to reason backward from the code. The real fix lives in the review system. Checking existing CLs is 10x faster than reasoning from scratch.

---

## It has autonomy → stepped over a boundary (11 items)

> These are the pitfalls from the moment AI has to answer "should I do this, how far, and when is it done?" — cross-module overreach fixes, whether to merge, how far to run on default, autonomy scope. This class is the sneakiest: the code runs, the build passes, all votes are green.

### 2. App layer CAN work around a framework bug ≠ app layer SHOULD fix it (4/21)

An application can route around a framework bug, but that doesn't mean the application is the right place to fix it. Decision authority, generality, impact surface — three gates that must be passed. Merging a fix that skips those is digging a hole for future you.

**Lesson**: AI defaults to "fix it wherever you can fix it." You have to hold the "should it be fixed here" gate.

### 4. Stop asking for proceed confirmation · default yes (4/21)

AI tools' permission systems keep popping "Do you want to proceed? 1. Yes 2. Yes and don't ask again 3. No." At first I'd reply every time. Eventually I wrote it into memory: proceed prompts default yes; only genuine branches (A/B/C design choices) and destructive operations (force push, rm -rf) warrant asking.

**Lesson**: The efficiency bottleneck isn't AI — it's AI waiting for you to answer a popup.

### 6. Offline autonomous mode when the user is away (4/23)

I went out for 90 minutes and told AI to keep moving. Got back — it was sitting at the first question, hadn't moved, worried about doing something wrong. Afterwards I codified offline-autonomous as a hard rule: read-only tasks + output to a temp directory + don't push + don't write to external systems + on a branch, list options and wait for my return.

**Lesson**: Autonomy isn't granting freedom, it's defining a safe fence.

### 8. Default yes, but design choices still get asked (4/23)

A patch to rule 4. "Default yes" doesn't mean "never ask." A/B/C technical approaches, destructive operations, anything requiring business judgment — ask. The boundary: **execution-type questions default yes, decision-type questions must ask**.

### 12. JNI data-path ExceptionClear is the correct call (4/29)

During code review, AI flagged the `ExceptionClear` in a per-frame JNI callback as an "exception-swallowing defect." But that's a high-frequency data path — throwing would drag the whole process down; clearing to keep the connection alive is a design choice, not a bug.

**Lesson**: Review rules need to separate control paths from data paths. AI's default "treat them all the same" will false-positive.

### 13. Use R/P/N review for refactor CLs · don't judge them on bugfix metrics (4/29)

For pure-refactor CLs, the standard is "no new issues + no behavior change"; historical issues are exempt under the P tier. AI's first review draft used the bugfix yardstick — "fix ratio too low, -1" — and I nearly voted along.

**Lesson**: Before reviewing, tell AI the CL type (R/Bugfix/Feature/Refactor). That's how it picks the right ruler.

### 19. A polished commit message ≠ a correct fix (5/3)

AI-generated commit messages can have Root Cause/Solution/Backtrack/Test all 8 sections filled in, log evidence annotated three lines deep — format-wise, nothing to criticize. But inside, a line saying "the app layer should adapt" can itself be a wrong call — **the more polished the format, the easier it is for reviewers to wave it through**.

**Lesson**: Review CLs with a layering heuristic first. Only look at the commit message after. Format compliance = +0, judgment content = scores.

### 20. Voting system five greens ≠ should merge (5/3)

Our merge gate requires 5-way automated voting (code review + test verification + format check + AI scan + CI). With all 5 green, AI auto-pipelines it to the "ready to merge" queue. But one of those changes was a whitelist workaround — merging it would permanently embed a special case for a downstream caller.

**Lesson**: The blind spot of a voting system is "code correct + rules pass" — it doesn't check "should this exist." Any automation gate has blind spots. All green only means "no wall hit," not "right direction."

### 21. Weekly-report KPIs over-inference (5/4)

Automated weekly reports have AI aggregate the dozen or so CLs landed that week — it counted all of them as delivery. In reality some were whitelist workarounds (symptom killed, root cause still there), some were commit-msg-only batch edits (no-op), some were pure formatting. Mixed into the number, the KPI looks great but doesn't hold up.

**Lesson**: Aggregating-KPI agents need hard stops: force a status snapshot with at least one counter-category. Prevent one-direction accumulation.

### 27. Overnight autonomous-run playbook (5/8)

Most counter-intuitive one. One night I gave AI a 6-hour window to work autonomously. Morning review — it had actually done ~2 hours of work with 3-4 hours of stalls. Root cause: Claude Code is turn-based (no speak, no move), no self-driving mechanism.

The fix is 7 disciplines: pre-schedule 10-15 tasks with dependencies before starting, push slow tasks to background, monitor progress with the Monitor tool, self-wake every 20 minutes via ScheduleWakeup, stay conservative (don't gamble), write a handoff README at close, default yes on execution questions.

**Lesson**: AI autonomy isn't innate — it's something you scaffold with scheduling discipline.

### 32. Progressive bugfix priority

For the weekly bug hunt, prioritize high-certainty + easy-to-fix + small-diff. Three small wins > one risky big change. AI will default to the hardest one to show off — you have to steer it back.

---

## It has context → context polluted its judgment (12 items)

> These are the pitfalls from the moment AI reasons from "prior context" to "new material": inferring diff from subject, root cause from a keyword, distribution from a partial sample, next screenshot from the previous one, a period from an aggregated mean. This class is the most expensive: once a bad inference is written into a report, a CL, or a strategy, it drags the entire downstream chain along.

### 3. R/P/N classification needs a second-pass scan (4/21)

For refactor-CL review I use R (Refactor) / P (Preserved-legacy exempt) / N (New) categories. AI's first pass only catches semantic-migration R — it misses two kinds of hidden R: guard-condition tightening/loosening (`if (a > 0)` becomes `if (a > 0 && b != null)` — behavior changed), and accidental bugfix (the refactor incidentally fixed an old bug but the commit msg didn't say so).

**Lesson**: After its first pass, proactively ask: "any conditional tightening/loosening? any incidental bugfixes not mentioned in the commit msg?"

### 5. An error tag in the log ≠ a root cause (4/21)

AI instinctively treats ERROR / FAILED / Exception as a problem source. But many errors are part of a normal shutdown flow — e.g., socket-close generating an error log when a connection is intentionally torn down.

**Lesson**: Ask first: "Is this error emitted from a normal stop path?"

### 7. Offline script baseline date must be recalibrated (4/23)

I had a pre-market summary script pinned to a particular day's snapshot as baseline. Ran for a week with nobody noticing — until one day the conclusion didn't add up. The snapshot's "last trading day" was four days stale.

**Lesson**: Any script with a pinned-baseline date must compare baseline date vs latest data date before running. More than one day of drift → recompute.

### 10. Distribution claims need full samples (4/24)

My quant backtest was 70% done and I glanced at the partial result. AI gave a verdict: "factor X has stable positive alpha." When the remaining 30% finished — which was the bear-market segment — the conclusion flipped.

**Lesson**: When batch-running backtests in code-alphabetical order, the subset has systematic bias (large caps first, small caps later; or chronologically bull-before-bear). Below 70% sample, never issue a distribution verdict.

### 14. CL subject is not ground truth · diff is (4/30)

AI habitually reads the commit subject first and bases its understanding on that title. But subject = problem framing (author's narrative), diff = actual changes (what the author did). They often diverge. The most common form: subject says "fix scenario X," diff actually adds a whitelist special-case — symptom gone, root cause untouched.

**Lesson**: In review prompts, explicitly say "use diff as ground truth, subject for reference only."

### 15. Cross-check device model / branch before accepting a trace verdict (4/30)

A stack trace looks like a perfect hit for the root cause in a ticket, AI says "that's it." I casually checked the device codename — ticket is model A, log is model B. Same SoC, different branches, the code could be 200 commits apart.

**Lesson**: Before accepting any trace verdict, cross-validate device codename + ROM branch prefix. Both matching = hit.

### 18. A closed causal chain + code you can change ≠ root cause (5/3)

AI traced from the log all the way to one source line, drew a perfect causal chain, had a fix diff ready. I asked: "why does only this one device reproduce?" — couldn't answer. Truth was: a user had toggled an obscure developer-options switch, changing the framework's fallback behavior. The code could be changed, build could pass, symptom could disappear — all by coincidence.

**Lesson**: Before accepting any located verdict, force-ask: "who caused this branch to be taken?" If you can't answer, you're not at root cause yet.

### 22. Always fetch local time from the system (5/6)

AI has no built-in clock. Once it looked at the last background event at 05:35 and inferred "it's around 05:30, you should get to bed." Actual local time was 07:16, morning. Tool event timestamps are when that event happened — not when you replied.

**Lesson**: Any time-involving decision, actively run `date` or `Get-Date` to fetch local time.

### 23. Pre-market ordering · momentum dimension before fundamentals (5/6)

Post-holiday first-trading-day or emotional-window conditions — stocks that limit-up with huge volume the prior session have roughly 19.8% odds of consecutive limit-up the next day. That's more than 3x the "best fundamentals" cohort (low PE + strong earnings). AI defaults to scoring on fundamentals and misses this "emotional relay" setup.

**Lesson**: Quant factor weights should switch dynamically by emotional window. Post-holiday first day weighs momentum — not the same scoring function used the rest of the year.

### 24. Read the meta before the screenshot (5/7)

User sent a browser screenshot. Prior conversation context was platform X; AI defaulted to "this is also X." The URL bar in the image clearly showed platform Y — it didn't look. Similar miss happened twice in one week.

**Lesson**: Screenshot-reading hard rule — first `stat` + `md5` to confirm the file is fresh, then read the URL bar / page title, then the main visual.

### 28. Three anti-patterns in strategy evaluation (5/8)

Stepped on the same pattern twice in a row: Simpson's paradox + sample skew + holding-period dependence. 3-year aggregated mean looks great, year-by-year looks terrible every year — because one outlier year dragged the aggregate up.

**Lesson**: Every new strategy must pass three questions: year-by-year alpha distribution, sample time/sector distribution, holding-period sensitivity. Aggregate mean is a poisoned headline number.

### 29. Agile filter must align with the alpha source (5/9)

Added a momentum-uptick filter ("5-day limit-up frequency high") to a low-PE deep-drop rebound strategy, assuming it would make entry sharper. 9-year backtest: every single year was worse than base. 9-year aggregate Sharpe went from +3.99 to -2.04 — sign flipped.

**Failure root cause**: The base strategy wants the best entry at market-cool moments, when a deep-drop low-PE stock has bottomed but emotion hasn't picked up. The new filter demands "emotion is already hot" — exact opposite direction.

**Lesson**: Before adding any filter, ask: where does the alpha come from? Does the filter's direction agree?

---

## Monthly distribution

I ran a monthly rollup script before writing this post.

**Totals by category**:

| Category | Total | Character |
| --- | ---: | --- |
| Tools | 12 | Most direct — command failure / tool error |
| Boundary | 11 | Most hidden — code runs, build passes, all green |
| Context | 12 | Most expensive — bad inference drags the whole downstream chain |

**By month (only the 29 items with explicit first-occurrence dates)**:

| Month | New | Tools | Boundary | Context |
| --- | ---: | ---: | ---: | ---: |
| 2026-04 (30 days) | 15 | 3 | **6** | **6** |
| 2026-05 (9 days) | 14 | **4** | 4 | **6** |

*Items 30-35 are repeat-validated cross-scenario disciplinary rules, not single incidents — not counted in the time distribution.*

The most important observation: **it's not that it gets more ready, the shape of the pitfalls shifts**.

April pitfalls clustered on "boundary" and "context" — 80% were AI going sideways on "should I do this" or "inferring from known to unknown." May didn't reduce "context," halved "boundary," but doubled "tools" — because I was using it deeper, wiring up more tools, and tool-layer pitfalls naturally surfaced.

So the KPI isn't "monthly feedback count declining." It's **topic-switching velocity**: the same class of pitfall shouldn't occupy the top slot two months in a row.

---

## One sentence

AI is not a hype machine nor a bug machine. It's a collaborator who **executes extremely well but has no innate sense of business boundaries**. You can't outsource judgment to it, but you can outsource almost all execution — on the condition that you write boundaries, tools, and discipline into a reusable rule library.

These 35 items are the rulebook I've accumulated in 20 days. End of next month I'll publish another rolling post — to see what the pitfalls have shifted to.
