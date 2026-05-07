// GET  /api/newsletter-unsubscribe?e=<email>&t=<hmac-hex>
// POST /api/newsletter-unsubscribe?e=<email>&t=<hmac-hex>  (RFC 8058 one-click)
//
// - POST: always consumes (one-click unsubscribe from email clients)
// - GET:  show confirmation page when ?confirm not set; on ?confirm=1 consume
//
// Env:   NEWSLETTER_SECRET
// Bind:  NEWSLETTER (KV)

export async function onRequestGet({ request, env }) {
  return handle(request, env, /*forceConsume=*/ false);
}

export async function onRequestPost({ request, env }) {
  // RFC 8058: POST with List-Unsubscribe=One-Click body must consume immediately.
  return handle(request, env, /*forceConsume=*/ true);
}

async function handle(request, env, forceConsume) {
  if (!env.NEWSLETTER || !env.NEWSLETTER_SECRET) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const url     = new URL(request.url);
  const email   = (url.searchParams.get("e") || "").trim().toLowerCase();
  const token   = (url.searchParams.get("t") || "").trim().toLowerCase();
  const confirm = url.searchParams.get("confirm") === "1";

  if (!email || !token) return pageBad("缺少参数");

  const expect = await hmacHex(env.NEWSLETTER_SECRET, email);
  if (!constEq(token, expect)) return pageBad("链接校验失败");

  // POST (one-click) or GET?confirm=1 → actually delete
  if (forceConsume || confirm) {
    await env.NEWSLETTER.delete(`sub:${email}`);
    console.log(JSON.stringify({ tag: "newsletter.unsub", email }));
    return pageOk(email);
  }

  // GET without confirm → show confirm button
  return pageConfirm(request.url, email);
}

function pageOk(email) {
  const body = `<!doctype html><html lang="zh-cn"><head><meta charset="UTF-8">
<title>已退订 · Laither</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#1a1a1a;color:#e8e8e8;max-width:560px;margin:0 auto;padding:48px 24px;line-height:1.6;}
h1{color:#87ff1f;} a{color:#87ff1f;}</style></head>
<body>
<h1>已退订 ✓</h1>
<p>${escapeHtml(email)} 已从订阅列表移除。</p>
<p>以后不会再收到来自 Laither 的 newsletter。</p>
<p style="margin-top:32px;">
  <a href="/">回主页</a> ·
  <a href="/posts/">看博客</a>
</p>
<hr style="border:none;border-top:1px solid #333;margin:32px 0;">
<p style="font-size:13px;color:#888;">
If you've unsubscribed in error, you can <a href="/works/stock-quant/">re-subscribe from any landing page</a>.
</p>
</body></html>`;
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function pageConfirm(reqUrl, email) {
  const u = new URL(reqUrl);
  u.searchParams.set("confirm", "1");
  const body = `<!doctype html><html lang="zh-cn"><head><meta charset="UTF-8">
<title>确认退订 · Laither</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#1a1a1a;color:#e8e8e8;max-width:560px;margin:0 auto;padding:48px 24px;line-height:1.6;}
h1{color:#FF8700;} a{color:#87ff1f;}
.btn{display:inline-block;background:#FF8700;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;}
.btn-secondary{background:transparent;border:1px solid rgba(232,232,232,0.3);color:#e8e8e8;margin-left:8px;}</style></head>
<body>
<h1>确认退订</h1>
<p>要从 Laither newsletter 订阅列表中移除 <strong>${escapeHtml(email)}</strong> 吗?</p>
<p>确认后以后不再收到邮件。</p>
<p>
  <a href="${u.toString()}" class="btn">确认退订</a>
  <a href="/" class="btn btn-secondary">取消</a>
</p>
</body></html>`;
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function pageBad(reason) {
  const body = `<!doctype html><html lang="zh-cn"><head><meta charset="UTF-8">
<title>退订链接无效 · Laither</title>
<style>body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#1a1a1a;color:#e8e8e8;max-width:560px;margin:0 auto;padding:48px 24px;line-height:1.6;}
h1{color:#ff6b6b;} a{color:#87ff1f;}</style></head>
<body>
<h1>退订链接无效</h1>
<p>${escapeHtml(reason)}。</p>
<p>如果你确实要退订,请回邮件里点"一键退订",或邮件 <a href="mailto:hi@laither.com">hi@laither.com</a> 说一声,我手动帮你去除。</p>
<p><a href="/">回主页</a></p>
</body></html>`;
  return new Response(body, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
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
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
