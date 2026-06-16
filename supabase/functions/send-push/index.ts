// Firebase Cloud Messaging push via FCM HTTP v1 API.
// Signs a service-account JWT with Web Crypto (no Firebase Admin SDK needed in Deno).
// Stores notification history in public.notifications.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  userId?: string;        // if provided, lookup tokens from fcm_tokens table
  tokens?: string[];      // or explicit tokens
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: string;          // budget_alert | spending_spike | goal_reminder | subscription | automation
  link?: string;
}

// ── Service-account JWT signer (RS256) ───────────────────────────────────────
function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing");

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const header = { alg: "RS256", typ: "JWT" };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!r.ok) throw new Error(`oauth ${r.status} ${await r.text()}`);
  const data = await r.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

async function sendFcm(projectId: string, accessToken: string, token: string, title: string, body: string, data?: Record<string, string>, link?: string) {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { ...(data ?? {}), ...(link ? { link } : {}) },
        webpush: link ? { fcm_options: { link } } : undefined,
      },
    }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    if (!projectId) {
      return new Response(JSON.stringify({ error: "FIREBASE_PROJECT_ID not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userSb.auth.getClaims(authHeader.replace("Bearer ", ""));
    const callerId = claims?.claims?.sub as string | undefined;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqBody: PushRequest = await req.json();
    if (!reqBody?.title || !reqBody?.body) {
      return new Response(JSON.stringify({ error: "title + body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient + tokens
    const targetUserId = reqBody.userId ?? callerId;
    if (targetUserId !== callerId) {
      // only admins can push to other users
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let tokens: string[] = reqBody.tokens ?? [];
    if (!tokens.length) {
      const { data } = await sb.from("fcm_tokens").select("token").eq("user_id", targetUserId);
      tokens = (data ?? []).map((r: any) => r.token);
    }
    if (!tokens.length) {
      return new Response(JSON.stringify({ ok: false, reason: "no_tokens" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const results = await Promise.all(
      tokens.map((t) => sendFcm(projectId, accessToken, t, reqBody.title, reqBody.body, reqBody.data, reqBody.link)),
    );

    // Remove dead tokens (UNREGISTERED / INVALID_ARGUMENT)
    const dead = tokens.filter((_, i) => {
      const r = results[i];
      return !r.ok && (r.body.includes("UNREGISTERED") || r.body.includes("INVALID_ARGUMENT"));
    });
    if (dead.length) {
      await sb.from("fcm_tokens").delete().in("token", dead);
    }

    // Persist notification history
    await sb.from("notifications").insert({
      user_id: targetUserId,
      type: reqBody.type ?? "general",
      title: reqBody.title,
      message: reqBody.body,
      link: reqBody.link ?? null,
      metadata: { delivered_via: "fcm", data: reqBody.data ?? {} },
    });

    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ ok: true, sent, failed: results.length - sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-push fatal", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
