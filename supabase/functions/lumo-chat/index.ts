// Lumo AI chat — Lovable AI Gateway (no API keys required from user)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage { role: "user" | "assistant" | "system"; content: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Server-side daily AI usage quota based on profile.ai_usage_limit
    const { data: profile } = await sb
      .from("profiles").select("ai_usage_limit").eq("id", userId).maybeSingle();
    const limit = Number((profile as any)?.ai_usage_limit ?? 10);
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: usedToday } = await sb
      .from("ai_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfDay.toISOString());
    if ((usedToday ?? 0) >= limit) {
      return new Response(JSON.stringify({ error: "Daily AI limit reached. Upgrade for more." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, persona, history = [], context } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personaName = persona?.name ?? "Personal Finance";
    const personaId = persona?.id ?? "general";
    const ctxLines: string[] = [];
    if (context?.monthlyIncome) ctxLines.push(`Monthly income: ₹${context.monthlyIncome}`);
    if (context?.totalSpent) ctxLines.push(`Spent this month: ₹${context.totalSpent}`);
    if (context?.topCategories?.length) ctxLines.push(`Top categories: ${context.topCategories.join(", ")}`);
    if (context?.goals?.length) ctxLines.push(`Active goals: ${context.goals.join("; ")}`);

    const personaTones: Record<string, string> = {
      student: "Encouraging, beginner-friendly, educational. Focus on saving small amounts, simple budgeting, expense control.",
      salary: "Practical, structured. Focus on automating savings, emergency funds, debt reduction.",
      investor: "Analytical, strategic, wealth-focused. Focus on portfolio allocation, SIPs, risk-adjusted returns.",
      hustler: "Productivity-driven, entrepreneurial. Focus on income tracking, taxes, cash flow optimization.",
      minimalist: "Calm, intentional. Focus on essentials, cutting waste, quiet financial habits.",
      family: "Warm, protective. Focus on education corpus, insurance, shared budgets.",
      luxury: "Aspirational, lifestyle-aware. Focus on smart luxury, travel optimization, wealth + lifestyle balance.",
      crypto: "Risk-aware, modern. Focus on allocation discipline, stablecoin strategy, volatility cushioning.",
    };
    const tone = personaTones[personaId] ?? "Warm, sharp, premium personal-finance coach.";

    const system = `You are Lumo AI — a premium AI financial coach inside FinTrack AI helping users understand spending, optimize savings, build wealth, and make smarter financial decisions.

Persona: ${personaName} (${personaId}).
Tone: ${tone}

${ctxLines.length ? "User financial snapshot:\n" + ctxLines.join("\n") : "No personal financial data — answer generally but stay specific and actionable."}

RESPONSE FORMAT — strict:
- Always respond in well-structured markdown.
- Open with a short bold heading (## ...) summarizing the topic.
- Use bullet lists for analysis, never one big paragraph.
- Include a "## Recommendation" section with 2-4 concrete actions.
- Where it adds value, include a "## Potential Impact" with an ₹ estimate.
- End with one short encouraging or motivating line (no emoji spam — at most one tasteful emoji per response).
- Use INR (₹) for all amounts. Indian formatting (e.g. ₹1,25,000).
- Keep total length under ~180 words. Be sharp, not chatty.
- Never mention OpenAI, Google, Anthropic, or any provider. You are Lumo AI.
- Celebrate progress; gently warn on overspending; never lecture.`;

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...history.slice(-8).map((m: any) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: String(m.text ?? m.content ?? ""),
      })),
      { role: "user", content: message },
    ];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("AI gateway error", r.status, errText);
      const status = r.status === 429 || r.status === 402 ? r.status : 500;
      return new Response(JSON.stringify({
        error: r.status === 429 ? "Rate limit — slow down a sec." :
               r.status === 402 ? "AI credits exhausted. Add credits in Workspace → Usage." :
               "AI temporarily unavailable.",
      }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "I couldn't generate a response. Try again.";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lumo-chat error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
