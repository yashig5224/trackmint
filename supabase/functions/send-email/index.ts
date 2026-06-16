// Transactional email via Resend (YOUR RESEND_API_KEY).
// Used for: welcome, verification, upgrade confirmation, payment success,
// subscription cancellation, monthly report delivery.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_DEFAULT = "FinTrack AI <onboarding@resend.dev>";

type TemplateName =
  | "welcome"
  | "verification"
  | "upgrade-confirmation"
  | "payment-success"
  | "subscription-cancelled"
  | "monthly-report";

interface SendRequest {
  to: string | string[];
  templateName?: TemplateName;
  subject?: string;
  html?: string;
  text?: string;
  data?: Record<string, unknown>;
  from?: string;
}

function renderTemplate(name: TemplateName, data: Record<string, any> = {}): { subject: string; html: string } {
  const safe = (v: unknown) => String(v ?? "").replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
  const brand = `<div style="font-family:-apple-system,Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#fafafa;border-radius:16px">`;
  const sign  = `<p style="margin-top:32px;font-size:13px;color:#888">— The FinTrack AI Team</p></div>`;

  switch (name) {
    case "welcome":
      return {
        subject: `Welcome to FinTrack AI, ${safe(data.name) || "there"}!`,
        html: `${brand}<h1 style="font-size:24px;margin:0 0 12px">Welcome aboard 🎉</h1>
<p>Hi ${safe(data.name) || "there"}, your FinTrack AI account is ready. Connect your first bank statement or add a transaction to unlock Lumo, your AI financial coach.</p>
<p><a href="${safe(data.appUrl) || "https://finbee.lovable.app"}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Open FinTrack AI</a></p>${sign}`,
      };
    case "verification":
      return {
        subject: "Verify your FinTrack AI email",
        html: `${brand}<h1 style="font-size:22px">Confirm your email</h1>
<p>Tap the button below to verify your address and finish setting up your account.</p>
<p><a href="${safe(data.verifyUrl)}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Verify email</a></p>${sign}`,
      };
    case "upgrade-confirmation":
      return {
        subject: `You're on the ${safe(data.plan) || "Pro"} plan 🚀`,
        html: `${brand}<h1 style="font-size:22px">Upgrade confirmed</h1>
<p>Your <strong>${safe(data.plan)}</strong> plan is now active. You've unlocked premium AI providers, automation rules, and advanced reports.</p>${sign}`,
      };
    case "payment-success":
      return {
        subject: `Payment received — ₹${safe(data.amount)}`,
        html: `${brand}<h1 style="font-size:22px">Payment successful</h1>
<p>We received your payment of <strong>₹${safe(data.amount)}</strong> for the <strong>${safe(data.plan)}</strong> plan.</p>
<p style="font-size:13px;color:#666">Reference: ${safe(data.paymentId)}</p>${sign}`,
      };
    case "subscription-cancelled":
      return {
        subject: "Your FinTrack AI subscription was cancelled",
        html: `${brand}<h1 style="font-size:22px">Subscription cancelled</h1>
<p>You'll keep premium access until <strong>${safe(data.endsAt)}</strong>. After that you'll move to the Free plan automatically.</p>${sign}`,
      };
    case "monthly-report":
      return {
        subject: `Your ${safe(data.month) || "monthly"} financial report`,
        html: `${brand}<h1 style="font-size:22px">${safe(data.month) || "Monthly"} report ready</h1>
<p>Spent: <strong>₹${safe(data.spent)}</strong> · Saved: <strong>₹${safe(data.saved)}</strong> · Health score: <strong>${safe(data.score)}/100</strong></p>
<p><a href="${safe(data.reportUrl)}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">View full report</a></p>${sign}`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth — require a valid user session OR a service-role internal call.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await sb.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendRequest = await req.json();
    if (!body?.to) {
      return new Response(JSON.stringify({ error: "`to` required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = body.subject ?? "";
    let html = body.html ?? "";
    let text = body.text;

    if (body.templateName) {
      const rendered = renderTemplate(body.templateName, body.data ?? {});
      subject = subject || rendered.subject;
      html = html || rendered.html;
    }

    if (!subject || (!html && !text)) {
      return new Response(JSON.stringify({ error: "subject + (html|text|templateName) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: body.from ?? FROM_DEFAULT,
        to: Array.isArray(body.to) ? body.to : [body.to],
        subject,
        html: html || undefined,
        text: text || undefined,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("resend error", r.status, data);
      return new Response(JSON.stringify({ error: "Email send failed", detail: data }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email fatal", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
