import { EmailContent } from "./email-template";

// ─── lib/send-email.ts ────────────────────────────────────────────
// Sends via Resend (recommended) or falls back to console log in dev.
// Install: npm install resend
// Get API key: https://resend.com → free tier = 3000 emails/month

export async function sendEmail(to: string, content: EmailContent): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  // ── Dev mode: log instead of send ────────────────────────────
  if (!apiKey || process.env.NODE_ENV === "development") {
    console.log("\n─── CANDOR EMAIL (dev mode) ───────────────────");
    console.log("TO:", to);
    console.log("SUBJECT:", content.subject);
    console.log("BODY:\n" + content.text);
    console.log("───────────────────────────────────────────────\n");
    return { ok: true, id: "dev_" + Date.now() };
  }

  // ── Production: send via Resend ───────────────────────────────
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "Candor <weekly@candor.so>",  // replace with your verified domain
        to:      [to],
        subject: content.subject,
        text:    content.text,
        html:    content.html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Resend error]", data);
      return { ok: false, error: data.message || "Resend failed" };
    }

    return { ok: true, id: data.id };

  } catch (err: any) {
    console.error("[sendEmail error]", err.message);
    return { ok: false, error: err.message };
  }
}
