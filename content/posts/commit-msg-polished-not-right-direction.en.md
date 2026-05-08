---
title: "A polished commit message is not evidence of a correct fix"
date: 2026-05-08T08:15:00+08:00
tags: ["code review", "Gerrit", "methodology", "traps"]
categories: ["Methodology"]
draft: false
summary: "Engineering teams invest a lot in commit-message conventions — Root Cause, Solution, Test sections filled in, log evidence attached. But a well-formed commit message can actively mislead reviewers into approving a wrong-direction fix. The format is doing something subtle to your brain you should know about."
---

## An unintuitive observation

If you've spent time in a team with strict commit-message conventions — think Android, Linux kernel, or any serious Gerrit workflow with mandatory Root Cause/Solution/Test fields — you've probably noticed something counter-intuitive:

**The most polished commit messages are also the most likely to sail through review. Regardless of whether the fix is actually correct.**

## A concrete scenario

Imagine a CL that looks like this:

```
[Title] Fix black screen during projection

[Issue Description]
On specific in-vehicle scenarios, the screen goes black after
switching applications.

[Root Cause]
Callback xxx did not correctly update mState under yyy conditions,
causing zzz.

[Solution]
Add state synchronization inside xxx callback; additional logging
for future tracing.

[Regression Test]
- Log evidence: [link to log excerpt]
- Whitelist scope: pkg=com.xxx.yyy AND channel=CH_A

[Test]
Test 1: Reproduce on vehicle X — black screen gone
Test 2: Reproduce on vehicle Y — no regression in existing features
```

Eight fields filled in. Log evidence linked. Test links clickable. A reviewer skims this and both halves of their brain agree: this looks legitimate.

But the **actual truth** might be:

- The black screen only appears under a specific vehicle's screen-calibration mode
- It's not a phone-side projection bug — it's a vehicle hardware or firmware issue
- The CL adds a **whitelist bypass in the phone code** that only activates for that one vehicle
- In other words: **this code should not have been modified at all.** But because the CL is polished, reviewers don't have the heart to send it back.

## Why "well-written" is actually dangerous

Because reviewer cognitive bandwidth is limited.

- An **empty Root Cause field** / **a one-line Solution** triggers suspicion. Reviewers dig deeper.
- A **detailed multi-paragraph Root Cause** makes the brain default to "the author already thought this through" and skip straight to line-level review of the diff — without ever questioning the direction.

This **"format compliance → psychological shortcut → no direction questioning"** failure mode is especially common in teams that pride themselves on rigorous commit-message standards. The more the team emphasizes format, the stronger the bias.

## The dual rule: empty Root Cause is a *strong* signal

After watching this pattern a few times, I added a hard rule to my reviews:

> **When a CL's Root Cause section is notably detailed**, force yourself to ask:
> - Is the *subject* of the Root Cause description actually code in this repo?
> - If the subject is code *elsewhere* (vehicle firmware, OS kernel, third-party SDK), why am I fixing it here?
> - If the answer is "because fixing it here is faster", this is a workaround, not a fix.

Conversely, when **Root Cause is empty or only a single line**, that's often a *stronger* signal of integrity:

- The author hasn't fully figured it out — and a workaround in that state is easier to see through
- Reviewers naturally ask "what's the root cause?" — catching it early
- Harder to disguise as a legitimate fix

So: **the more polished the CL, the easier it slips through**. Form reshaping content.

## Three heuristics I apply when the message looks too good

For any CL with a flawless commit message, I run through these three questions before accepting the diff:

### H2 · Symptom boundary

- Does the issue only reproduce on a specific device/product/version?
- Is there a user-level workaround (toggle a setting, swap a cable, change a config)?
- If the problem has exactly one narrow condition, the root cause is almost always in that one narrow variable — which is probably not my repo.

### H3 · Whitelist detection

- Does the CL introduce `if (pkg == xxx && channel == yyy) { ... }` style guards?
- The more specific the conditions (more fields, more exact-match literals), the more likely this is a workaround
- Real fixes rarely need whitelists.

### H4 · Subject of the Root Cause

- Who is the grammatical subject of the root cause description?
- If it's code outside this repo (firmware, OS, SDK), **the responsibility chain is not here**
- The right fix is to change **how your repo talks to that subject** (API, protocol, fallback), not to absorb the other side's bug

**Any one of the three** firing is enough to send the CL back, even if the Test data is beautiful.

## Counter-argument: should I write *less* polished commit messages?

No. Well-written commit messages have real value:

- Future `git blame` gives clear context
- The act of writing a Root Cause forces you to think — if you can't write it, you don't understand the fix yet
- Reviewers need the context to review *the implementation*

But **writing it well only solves "future debuggability"**, not "is this fix correct *right now*".

The two things need separate review:
- **Content**: grill the direction hard (H2/H3/H4)
- **Format**: encourage thorough writing

**Format compliance earns +0 review points.** Only content judgment earns points.

## The bottom line

The virtue of format is that it standardizes what a good commit message looks like. The hidden cost is that anything shaped like a good commit message gets treated as a good commit message.

If you review code, tape this to your monitor:

> **A well-formatted CL is exactly the kind that most needs its direction questioned.**

---

The lesson generalizes beyond code review — to design reviews, paper reviews, grant proposals, anywhere content is wrapped in convention. When the wrapping gets good enough, the content stops being read.
