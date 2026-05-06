// POST /api/subscribe
// Body: application/x-www-form-urlencoded 或 application/json
//   email (required), source (optional), message (optional)
// Sends notification to hi@laither.com via Resend, returns 303 redirect
// to /thanks/ on success, /subscribe-error/ on failure.
//
// Env vars (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY   — re_xxxxxxxxxxxx (secret, production only)
//   NOTIFY_TO        — hi@laither.com (fallback default below)
//   NOTIFY_FROM      — Laither <noreply@send.laither.com> (fallback default)

export async function onRequestPost({ request, env }) {
  const notifyTo   = env.NOTIFY_TO   || "hi@laither.com";
  const notifyFrom = env.NOTIFY_FROM || "Laither <noreply@send.laither.com>";

  let email = "", source = "", message = "", ua = "", ip = "";

  const ct = (request.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      const j = await request.json();
      email   = (j.email   || "").toString().trim();
      source  = (j.source  || "").toString().trim();
      message = (j.message || "").toString().trim();
    } else {
      const form = await request.formData();
      email   = (form.get("email")   || "").toString().trim();
      source  = (form.get("source")  || "").toString().trim();
      message = (form.get("message") || "").toString().trim();
    }
  } catch (e) {
    return redirect(request, "/subscribe-error/?reason=parse");
  }

  if (!isValidEmail(email)) {
    return redirect(request, "/subscribe-error/?reason=email");
  }

  ua = request.headers.get("user-agent") || "";
  ip = request.headers.get("cf-connecting-ip") || "";

  if (!env.RESEND_API_KEY) {
    // Misconfigured — fail loud so operator notices.
    return new Response("RESEND_API_KEY not configured", { status: 500 });
  }

  const subject = `[Laither] New inquiry from ${email}${source ? " · " + source : ""}`;
  const bodyTxt = [
    `email:   ${email}`,
    `source:  ${source || "(none)"}`,
    `message: ${message || "(none)"}`,
    `---`,
    `ua: ${ua}`,
    `ip: ${ip}`,
    `ts: ${new Date().toISOString()}`,
  ].join("\n");
  const bodyHtml =
    `<pre style="font-family:Consolas,monospace;font-size:14px;line-height:1.5;">` +
    escapeHtml(bodyTxt) +
    `</pre>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:     notifyFrom,
      to:       [notifyTo],
      reply_to: email,
      subject,
      text:     bodyTxt,
      html:     bodyHtml,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.log("resend failed", resp.status, errText.slice(0, 500));
    return redirect(request, "/subscribe-error/?reason=send");
  }

  return redirect(request, "/thanks/");
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405 });
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function redirect(request, path) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}${path}`, 303);
}
