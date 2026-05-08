// POST /api/newsletter-broadcast
//
// Admin-only: send an email to all confirmed newsletter subscribers
// stored in the NEWSLETTER KV, using Resend batch API in chunks of
// 100.
//
// Request:
//   Header   X-Admin-Token: <must match env.ADMIN_TOKEN>
//   Content-Type: application/json
//   Body {
//     subject:   string (required)
//     text:      string (required)
//     html:      string (optional, falls back to <pre>text</pre>)
//     dry_run:   boolean (default true)   ← safety: must explicitly pass false
//     limit:     number  (optional, default all)
//     from:      string  (optional, overrides NOTIFY_FROM)
//   }
//
// Response: {
//   total_subscribers, attempted, succeeded, failed, failed_emails[],
//   dry_run, sample_payload
// }
//
// Env:
//   ADMIN_TOKEN         — long random string (Secret)
//   RESEND_API_KEY      — same as subscribe
//   NEWSLETTER_SECRET   — same as subscribe (for unsub token HMAC)
//   NOTIFY_FROM         — default "Laither <noreply@laither.com>"
// Bind:
//   NEWSLETTER (KV)

export async function onRequestPost({ request, env }) {
  // --- auth -------------------------------------------------
  if (!env.ADMIN_TOKEN) return json({ error: "ADMIN_TOKEN not configured" }, 500);
  const provided = request.headers.get("x-admin-token") || "";
  if (!constEq(provided, env.ADMIN_TOKEN)) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!env.NEWSLETTER)        return json({ error: "NEWSLETTER KV not bound" }, 500);
  if (!env.RESEND_API_KEY)    return json({ error: "RESEND_API_KEY not set" }, 500);
  if (!env.NEWSLETTER_SECRET) return json({ error: "NEWSLETTER_SECRET not set" }, 500);

  // --- body parse --------------------------------------------
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "invalid json body" }, 400); }

  const subject = (body.subject || "").toString().trim();
  const text    = (body.text    || "").toString();
  const html    = (body.html    || "").toString();
  const dryRun  = body.dry_run !== false;   // default: true (safe)
  const limit   = Math.max(0, Math.min(100000, body.limit | 0 || 100000));
  const notifyFrom = (body.from || env.NOTIFY_FROM || "Laither <noreply@laither.com>").toString();

  if (!subject) return json({ error: "subject required" }, 400);
  if (!text)    return json({ error: "text required" }, 400);

  // --- list all subscribers from KV -------------------------
  // KV `list` is paginated; key prefix "sub:" = confirmed subscribers
  const subscribers = [];
  let cursor = undefined;
  do {
    const page = await env.NEWSLETTER.list({ prefix: "sub:", cursor });
    for (const k of page.keys) {
      if (subscribers.length >= limit) break;
      const raw = await env.NEWSLETTER.get(k.name);
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw);
        if (rec.email && rec.status === "confirmed") subscribers.push(rec);
      } catch { /* skip malformed */ }
    }
    cursor = page.list_complete ? undefined : page.cursor;
    if (subscribers.length >= limit) break;
  } while (cursor);

  // --- build per-email payload -------------------------------
  const origin = new URL(request.url).origin;
  async function buildPayload(email) {
    const token = await hmacHex(env.NEWSLETTER_SECRET, email);
    const unsubUrl = `${origin}/api/newsletter-unsubscribe?e=${encodeURIComponent(email)}&t=${token}`;
    const htmlBody = html || `<pre style="font-family:Consolas,monospace;font-size:14px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(text)}</pre>\n<hr><p style="font-size:12px;color:#888;">Unsubscribe: <a href="${unsubUrl}">${unsubUrl}</a></p>`;
    const textBody = `${text}\n\n---\nUnsubscribe: ${unsubUrl}\n`;
    return {
      from:    notifyFrom,
      to:      [email],
      subject,
      text:    textBody,
      html:    htmlBody,
      headers: {
        "List-Unsubscribe":      `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  }

  // --- dry run: return preview + first sample payload -------
  if (dryRun) {
    const sample = subscribers.length ? await buildPayload(subscribers[0].email) : null;
    return json({
      dry_run:           true,
      total_subscribers: subscribers.length,
      attempted:         0,
      succeeded:         0,
      failed:            0,
      failed_emails:     [],
      sample_payload:    sample,
      note:              "Pass dry_run=false to actually send.",
    });
  }

  // --- send in batches of 100 (Resend limit) -----------------
  let succeeded = 0;
  let failed    = 0;
  const failedEmails = [];
  const CHUNK = 100;

  for (let i = 0; i < subscribers.length; i += CHUNK) {
    const slice = subscribers.slice(i, i + CHUNK);
    const payloads = await Promise.all(slice.map(s => buildPayload(s.email)));

    const resp = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(payloads),
    });

    if (!resp.ok) {
      // Whole chunk failed → mark all as failed for visibility
      const errText = await resp.text().catch(() => "");
      console.log(JSON.stringify({
        tag: "broadcast.chunk_fail",
        chunk_start: i,
        chunk_size:  slice.length,
        status:      resp.status,
        error:       errText.slice(0, 500),
      }));
      failed += slice.length;
      slice.forEach(s => failedEmails.push(s.email));
      continue;
    }

    // Resend batch API returns { data: [...] } with per-item id on success
    let result;
    try { result = await resp.json(); }
    catch { result = null; }

    if (result && Array.isArray(result.data)) {
      // Per-item error detection (some Resend plans return nulls for rejected)
      slice.forEach((s, idx) => {
        const item = result.data[idx];
        if (item && item.id) succeeded++;
        else { failed++; failedEmails.push(s.email); }
      });
    } else {
      // Fallback: assume all succeeded if 2xx but unparseable
      succeeded += slice.length;
    }
  }

  console.log(JSON.stringify({
    tag: "broadcast.done",
    total: subscribers.length,
    succeeded,
    failed,
  }));

  return json({
    dry_run:           false,
    total_subscribers: subscribers.length,
    attempted:         subscribers.length,
    succeeded,
    failed,
    failed_emails:     failedEmails,
  });
}

export async function onRequestGet() {
  return json({ error: "Method Not Allowed, POST only" }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function constEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
