// POST /api/newsletter-subscribe
// Body: form or json — { email, source? }
// Stores in KV (binding: NEWSLETTER), sends welcome email via Resend,
// redirects 303 to /thanks/?type=newsletter on success.
//
// Env:
//   RESEND_API_KEY     — shared with /api/subscribe
//   NEWSLETTER_SECRET  — random 32+ char string, used for HMAC unsub tokens
//   NOTIFY_FROM        — default "Laither <noreply@laither.com>"
// Bindings:
//   NEWSLETTER         — KV namespace
//
// KV layout:
//   key   = "sub:" + email.toLowerCase()
//   value = JSON { email, ts, source, ip, status: "confirmed" }

export async function onRequestPost({ request, env }) {
  const notifyFrom = env.NOTIFY_FROM || "Laither <noreply@laither.com>";

  if (!env.NEWSLETTER)       return fail(500, "NEWSLETTER KV not bound");
  if (!env.RESEND_API_KEY)   return fail(500, "RESEND_API_KEY not configured");
  if (!env.NEWSLETTER_SECRET) return fail(500, "NEWSLETTER_SECRET not configured");

  let email = "", source = "";
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      const j = await request.json();
      email  = (j.email  || "").toString().trim().toLowerCase();
      source = (j.source || "").toString().trim();
    } else {
      const form = await request.formData();
      email  = (form.get("email")  || "").toString().trim().toLowerCase();
      source = (form.get("source") || "").toString().trim();
    }
  } catch { return redirect(request, "/subscribe-error/?reason=parse&type=newsletter"); }

  if (!isValidEmail(email)) {
    return redirect(request, "/subscribe-error/?reason=email&type=newsletter");
  }

  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";

  // Rate limit per IP: max 3 subscribes / 5 min
  if (ip) {
    const rlKey = `rl:sub:${ip}`;
    const count = parseInt((await env.NEWSLETTER.get(rlKey)) || "0", 10);
    if (count >= 3) {
      return redirect(request, "/subscribe-error/?reason=ratelimit&type=newsletter");
    }
    await env.NEWSLETTER.put(rlKey, String(count + 1), { expirationTtl: 300 });
  }

  const key = `sub:${email}`;
  const existing = await env.NEWSLETTER.get(key);
  if (existing) {
    // Already subscribed — treat as success (idempotent)
    return redirect(request, "/thanks/?type=newsletter&dup=1");
  }

  const record = {
    email,
    ts: new Date().toISOString(),
    source: source || "unknown",
    ip,
    ua: ua.slice(0, 200),
    status: "confirmed",
  };
  await env.NEWSLETTER.put(key, JSON.stringify(record));

  // Generate unsubscribe token
  const token = await hmacHex(env.NEWSLETTER_SECRET, email);
  const unsubUrl = new URL(request.url);
  unsubUrl.pathname = "/api/newsletter-unsubscribe";
  unsubUrl.search = `?e=${encodeURIComponent(email)}&t=${token}`;

  const siteRoot = `${new URL(request.url).origin}`;

  const isCN = /\b(zh|cn)\b/i.test(request.headers.get("accept-language") || "") ||
               source.includes("-zh-");

  const subject = isCN
    ? "感谢订阅 Laither Newsletter"
    : "Welcome to Laither Newsletter";

  const textBody = isCN ? welcomeTextCN(unsubUrl.toString(), siteRoot)
                        : welcomeTextEN(unsubUrl.toString(), siteRoot);
  const htmlBody = isCN ? welcomeHtmlCN(unsubUrl.toString(), siteRoot)
                        : welcomeHtmlEN(unsubUrl.toString(), siteRoot);

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    notifyFrom,
      to:      [email],
      subject,
      text:    textBody,
      html:    htmlBody,
      headers: {
        "List-Unsubscribe":      `<${unsubUrl.toString()}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.log(JSON.stringify({
      tag: "newsletter.welcome_fail",
      status: resp.status,
      error: err.slice(0, 500),
      email,
    }));
    // Still count as subscribed (record already in KV), just no welcome mail
    return redirect(request, "/thanks/?type=newsletter&welcome=fail");
  }

  console.log(JSON.stringify({
    tag: "newsletter.ok",
    email,
    source,
  }));
  return redirect(request, "/thanks/?type=newsletter");
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405 });
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function redirect(request, path) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}${path}`, 303);
}

function fail(status, msg) {
  return new Response(msg, { status });
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function welcomeTextCN(unsubUrl, root) {
  return [
    "感谢订阅 Laither Newsletter。",
    "",
    "你会不定期收到:",
    "  · stock_quant 产品发布通知(6 月上线前会提前 7 天告知)",
    "  · 重要技术笔记(踩坑笔记 / 方法论思考)",
    "  · 其他作品的重大更新",
    "",
    "我自己写,自己发,不外包,不买量。",
    "",
    `主站:   ${root}/`,
    `博客:   ${root}/posts/`,
    `作品:   ${root}/works/`,
    "",
    "随时退订(一键):",
    unsubUrl,
    "",
    "— 王磊 / Laither",
  ].join("\n");
}

function welcomeTextEN(unsubUrl, root) {
  return [
    "Thanks for subscribing to the Laither newsletter.",
    "",
    "You'll get, on an irregular cadence:",
    "  · Launch announcement for stock_quant (~ 7 days before June 2026)",
    "  · Technical notes (debugging stories & engineering methodology)",
    "  · Major updates on other Laither products",
    "",
    "Written and sent by me. No outsourcing, no list-buying.",
    "",
    `Home:   ${root}/en/`,
    `Blog:   ${root}/en/posts/`,
    `Works:  ${root}/en/works/`,
    "",
    "Unsubscribe any time (one click):",
    unsubUrl,
    "",
    "— Lei Wang / Laither",
  ].join("\n");
}

function welcomeHtmlCN(unsubUrl, root) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0 auto;padding:24px;">
<h2 style="color:#1a1a1a;">感谢订阅 Laither Newsletter</h2>
<p>你会不定期收到:</p>
<ul>
  <li><strong>stock_quant 产品发布通知</strong>(6 月上线前会提前 7 天告知)</li>
  <li>重要技术笔记(踩坑笔记 / 方法论思考)</li>
  <li>其他作品的重大更新</li>
</ul>
<p>我自己写,自己发,不外包,不买量。</p>
<p style="margin-top:24px;">
  <a href="${root}/" style="color:#87ff1f;text-decoration:none;">主站</a> ·
  <a href="${root}/posts/" style="color:#87ff1f;text-decoration:none;">博客</a> ·
  <a href="${root}/works/" style="color:#87ff1f;text-decoration:none;">作品</a>
</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:13px;color:#888;">
  随时 <a href="${unsubUrl}" style="color:#888;">一键退订</a>。<br>
  — 王磊 / Laither
</p>
</body></html>`;
}

function welcomeHtmlEN(unsubUrl, root) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0 auto;padding:24px;">
<h2 style="color:#1a1a1a;">Welcome to the Laither Newsletter</h2>
<p>You'll get, on an irregular cadence:</p>
<ul>
  <li><strong>Launch announcement for stock_quant</strong> (~7 days before the June 2026 launch)</li>
  <li>Technical notes (debugging stories &amp; engineering methodology)</li>
  <li>Major updates on other Laither products</li>
</ul>
<p>Written and sent by me. No outsourcing, no list-buying.</p>
<p style="margin-top:24px;">
  <a href="${root}/en/" style="color:#87ff1f;text-decoration:none;">Home</a> ·
  <a href="${root}/en/posts/" style="color:#87ff1f;text-decoration:none;">Blog</a> ·
  <a href="${root}/en/works/" style="color:#87ff1f;text-decoration:none;">Works</a>
</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:13px;color:#888;">
  Unsubscribe any time: <a href="${unsubUrl}" style="color:#888;">one-click unsubscribe</a>.<br>
  — Lei Wang / Laither
</p>
</body></html>`;
}
