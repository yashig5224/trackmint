// Creates a Razorpay order for a plan checkout.
// Requires Authorization: Bearer <supabase-jwt> in the request.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_AMOUNTS: Record<string, { amount: number; name: string; cycle: "monthly" | "yearly"; tier: "pro" | "elite" | "starter" }> = {
  starter_monthly: { amount: 29900, name: "Starter", cycle: "monthly", tier: "starter" },
  pro_monthly:     { amount: 29900, name: "Pro AI", cycle: "monthly", tier: "pro" },
  pro_yearly:      { amount: 299900, name: "Pro AI", cycle: "yearly", tier: "pro" },
  elite_monthly:   { amount: 79900, name: "Elite AI+", cycle: "monthly", tier: "elite" },
  elite_yearly:    { amount: 799900, name: "Elite AI+", cycle: "yearly", tier: "elite" },
  ultimate_monthly:{ amount: 149900, name: "Ultimate AI", cycle: "monthly", tier: "elite" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { planKey } = await req.json();
    const plan = PLAN_AMOUNTS[planKey];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const auth = btoa(`${keyId}:${keySecret}`);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: plan.amount,
        currency: "INR",
        receipt: `r_${userData.user.id.slice(0, 8)}_${Date.now()}`,
        notes: { userId: userData.user.id, planKey, planName: plan.name, cycle: plan.cycle, tier: plan.tier },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error("Razorpay order error", order);
      return new Response(JSON.stringify({ error: order.error?.description || "Failed to create order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      planName: plan.name,
      cycle: plan.cycle,
      tier: plan.tier,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-razorpay-order:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
