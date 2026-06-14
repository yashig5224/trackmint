// Verifies a Razorpay payment signature and writes subscription + payment + profile.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIER_LIMITS: Record<string, { ai_usage_limit: number; voice_enabled: boolean; premium_enabled: boolean }> = {
  free:   { ai_usage_limit: 10,   voice_enabled: false, premium_enabled: false },
  starter:{ ai_usage_limit: 100,  voice_enabled: false, premium_enabled: false },
  pro:    { ai_usage_limit: 9999, voice_enabled: false, premium_enabled: true  },
  elite:  { ai_usage_limit: 99999,voice_enabled: true,  premium_enabled: true  },
};

// Server-side source of truth for plan amounts/tier — never trust the client.
const PLAN_AMOUNTS: Record<string, { amount: number; name: string; cycle: "monthly" | "yearly"; tier: "pro" | "elite" | "starter" }> = {
  starter_monthly: { amount: 29900, name: "Starter", cycle: "monthly", tier: "starter" },
  pro_monthly:     { amount: 29900, name: "Pro AI", cycle: "monthly", tier: "pro" },
  pro_yearly:      { amount: 299900, name: "Pro AI", cycle: "yearly", tier: "pro" },
  elite_monthly:   { amount: 79900, name: "Elite AI+", cycle: "monthly", tier: "elite" },
  elite_yearly:    { amount: 799900, name: "Elite AI+", cycle: "yearly", tier: "elite" },
  ultimate_monthly:{ amount: 149900, name: "Ultimate AI", cycle: "monthly", tier: "elite" },
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing payment fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const expected = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Re-fetch the original order from Razorpay — server-side source of truth
    // for tier/planKey/amount. Client-supplied values are ignored.
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error("Razorpay order fetch failed", order);
      return new Response(JSON.stringify({ error: "Order verification failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const notes = order?.notes ?? {};
    if (notes.userId !== userId) {
      return new Response(JSON.stringify({ error: "Order does not belong to user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const planKey: string = notes.planKey;
    const plan = PLAN_AMOUNTS[planKey];
    if (!plan || Number(order.amount) !== plan.amount) {
      return new Response(JSON.stringify({ error: "Plan/amount mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const planName = plan.name;
    const cycle = plan.cycle;
    const tier = plan.tier;
    const amount = plan.amount;

    // Admin client (service role) to bypass RLS for cross-table writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const renewal = new Date(now);
    if (cycle === "yearly") renewal.setFullYear(renewal.getFullYear() + 1);
    else renewal.setMonth(renewal.getMonth() + 1);

    // Cancel any prior active subscription
    await admin.from("subscriptions").update({ status: "canceled" })
      .eq("user_id", userId).eq("status", "active");

    const { error: subErr } = await admin.from("subscriptions").insert({
      user_id: userId,
      plan_name: planName,
      billing_cycle: cycle,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: amount / 100,
      status: "active",
      start_date: now.toISOString(),
      renewal_date: renewal.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: renewal.toISOString(),
      price_id: planKey,
      environment: "sandbox",
    });
    if (subErr) console.error("subscription insert", subErr);

    await admin.from("payments").insert({
      user_id: userId,
      amount: amount / 100,
      currency: "inr",
      payment_status: "succeeded",
      razorpay_payment_id,
      razorpay_order_id,
      plan_name: planName,
      environment: "sandbox",
    });

    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
    await admin.from("profiles").update({
      current_plan: tier,
      ai_usage_limit: limits.ai_usage_limit,
      voice_enabled: limits.voice_enabled,
      premium_enabled: limits.premium_enabled,
    }).eq("id", userId);

    return new Response(JSON.stringify({ success: true, tier, planName, renewalDate: renewal.toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-razorpay-payment:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
