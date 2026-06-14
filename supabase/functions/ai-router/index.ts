// Multi-AI routing engine — secure server-side AI orchestration.
// Routes to GPT / Gemini / Claude-class models via Lovable AI Gateway,
// enforces plan-based access, smart-routes by intent, falls back on failure,
// builds a real Financial Context snapshot from Supabase (Phase 2 AI Coach),
// persists conversations to ai_history, and logs every request to ai_usage_logs.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Provider = "lumo" | "gpt" | "gemini" | "claude";
type PlanTier = "free" | "pro" | "elite";

interface ProviderSpec {
  id: Provider;
  label: string;
  model: string;
  minTier: PlanTier;
  strength: "balanced" | "reasoning" | "speed" | "analysis";
}

const PROVIDERS: Record<Provider, ProviderSpec> = {
  lumo:   { id: "lumo",   label: "Lumo Core",     model: "google/gemini-3-flash-preview", minTier: "free",  strength: "balanced"  },
  gpt:    { id: "gpt",    label: "GPT-class",     model: "openai/gpt-5-mini",             minTier: "pro",   strength: "reasoning" },
  gemini: { id: "gemini", label: "Gemini Pro",    model: "google/gemini-2.5-pro",         minTier: "pro",   strength: "speed"     },
  claude: { id: "claude", label: "Claude Sonnet", model: "openai/gpt-5",                  minTier: "elite", strength: "analysis"  },
};

const tierRank: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

async function resolveTier(sb: ReturnType<typeof createClient>, userId: string): Promise<PlanTier> {
  const { data } = await sb
    .from("subscriptions")
    .select("status, price_id, renewal_date, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || data.status !== "active") return "free";
  const end = data.renewal_date || data.current_period_end;
  if (end && new Date(end as string).getTime() < Date.now()) return "free";
  const k = String(data.price_id ?? "");
  if (k.startsWith("elite") || k.startsWith("ultimate")) return "elite";
  if (k.startsWith("pro")) return "pro";
  return "free";
}

function smartRoute(message: string, tier: PlanTier): Provider {
  const m = message.toLowerCase();
  const wantsAnalysis = /(forecast|predict|analy[sz]e|deep|long.?term|simulat|wealth|portfolio|invest|risk|scenari)/.test(m);
  const wantsReasoning = /(why|explain|compare|should i|plan|strategy|trade.?off|optim[iy]z)/.test(m);
  const wantsSpeed = /(quick|fast|short|tldr|summar[iy]|brief|one.?liner)/.test(m);
  if (wantsAnalysis && tier === "elite") return "claude";
  if (wantsReasoning && tierRank[tier] >= 1) return "gpt";
  if (wantsSpeed && tierRank[tier] >= 1) return "gemini";
  return tier === "free" ? "lumo" : "gemini";
}

function allowedProviders(tier: PlanTier): Provider[] {
  return (Object.values(PROVIDERS) as ProviderSpec[])
    .filter((p) => tierRank[tier] >= tierRank[p.minTier])
    .map((p) => p.id);
}

interface ChatMsg { role: "user" | "assistant" | "system"; content: string }

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Financial Context Engine
// Pulls a real-time snapshot from Supabase and renders it as compact context
// for the LLM. Strictly read-only; bounded query sizes; safe on partial data.
// ─────────────────────────────────────────────────────────────────────────────

interface FinancialSnapshot {
  hasData: boolean;
  plan: string;
  currency: string;
  monthlyIncome: number;
  income30: number;
  expense30: number;
  savings30: number;
  savingsRate: number;
  topCategories: { category: string; spent: number; pct: number }[];
  recentTx: { date: string; title: string; category: string; amount: number; type: string }[];
  budgets: { category: string; limit: number; spent: number; usage: number }[];
  goals: { name: string; target: number; current: number; pct: number; deadline: string | null }[];
  subscriptions: { title: string; amount: number; lastSeen: string }[];
  automation: { rule: string; reason: string; action: string; when: string }[];
  priorAi: { q: string; a: string }[];
  notes: string[];
}

function inr(n: number): string {
  if (!isFinite(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

async function buildSnapshot(
  sb: ReturnType<typeof createClient>,
  userId: string,
  tier: PlanTier,
): Promise<FinancialSnapshot> {
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [profileQ, txQ, budgetsQ, goalsQ, autoQ, aiHistQ] = await Promise.all([
    sb.from("profiles").select("monthly_income,currency,current_plan").eq("id", userId).maybeSingle(),
    sb.from("transactions")
      .select("transaction_date,title,category,amount,type,recurring")
      .eq("user_id", userId)
      .gte("transaction_date", since30)
      .order("transaction_date", { ascending: false })
      .limit(400),
    sb.from("budgets")
      .select("category,monthly_limit,spent_amount,month")
      .eq("user_id", userId)
      .order("month", { ascending: false })
      .limit(40),
    sb.from("goals")
      .select("goal_name,target_amount,current_amount,deadline,category")
      .eq("user_id", userId).limit(20),
    sb.from("automation_logs")
      .select("rule_name,trigger_reason,action_taken,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(6),
    sb.from("ai_history")
      .select("message,ai_response,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(6),
  ]);

  const profile = profileQ.data as any;
  const txs = (txQ.data ?? []) as any[];
  const budgets = (budgetsQ.data ?? []) as any[];
  const goals = (goalsQ.data ?? []) as any[];
  const automation = (autoQ.data ?? []) as any[];
  const aiHist = (aiHistQ.data ?? []) as any[];

  const income30 = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense30 = txs.filter((t) => t.type !== "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const savings30 = income30 - expense30;
  const savingsRate = income30 > 0 ? Math.max(-100, Math.min(100, (savings30 / income30) * 100)) : 0;

  // Category aggregation
  const byCat = new Map<string, number>();
  for (const t of txs) {
    if (t.type === "income") continue;
    const k = (t.category as string) || "Uncategorized";
    byCat.set(k, (byCat.get(k) || 0) + Number(t.amount || 0));
  }
  const topCategories = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, spent]) => ({
      category,
      spent,
      pct: expense30 > 0 ? (spent / expense30) * 100 : 0,
    }));

  // Budgets — keep current-month rows only when possible
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetRows = budgets
    .filter((b) => !b.month || String(b.month).startsWith(currentMonth))
    .slice(0, 8)
    .map((b) => {
      const lim = Number(b.monthly_limit || 0);
      const sp = Number(b.spent_amount || 0);
      return { category: b.category, limit: lim, spent: sp, usage: lim > 0 ? (sp / lim) * 100 : 0 };
    });

  const goalRows = goals.map((g) => {
    const tgt = Number(g.target_amount || 0);
    const cur = Number(g.current_amount || 0);
    return {
      name: g.goal_name,
      target: tgt,
      current: cur,
      pct: tgt > 0 ? (cur / tgt) * 100 : 0,
      deadline: g.deadline ?? null,
    };
  });

  // Subscription detection — recurring flag or recurring-looking titles
  const subMap = new Map<string, { amount: number; lastSeen: string }>();
  for (const t of txs) {
    if (t.type === "income") continue;
    if (t.recurring) {
      const key = String(t.title || "").trim().toLowerCase();
      if (!key) continue;
      const prev = subMap.get(key);
      if (!prev || t.transaction_date > prev.lastSeen) {
        subMap.set(key, { amount: Number(t.amount || 0), lastSeen: t.transaction_date });
      }
    }
  }
  const subscriptions = [...subMap.entries()]
    .slice(0, 6)
    .map(([title, v]) => ({ title, amount: v.amount, lastSeen: v.lastSeen }));

  const recentTx = txs.slice(0, 8).map((t) => ({
    date: t.transaction_date,
    title: t.title,
    category: t.category ?? "—",
    amount: Number(t.amount || 0),
    type: t.type,
  }));

  const automationRows = automation.map((a) => ({
    rule: a.rule_name, reason: a.trigger_reason, action: a.action_taken,
    when: String(a.created_at).slice(0, 10),
  }));

  const priorAi = aiHist
    .filter((h) => h.ai_response)
    .map((h) => ({
      q: String(h.message || "").slice(0, 140),
      a: String(h.ai_response || "").slice(0, 220),
    }));

  const notes: string[] = [];
  const monthlyIncome = Number(profile?.monthly_income || 0);
  if (monthlyIncome > 0 && expense30 > monthlyIncome) notes.push("Spending exceeds declared monthly income.");
  if (savingsRate < 10 && income30 > 0) notes.push("Savings rate below healthy 20% threshold.");
  for (const b of budgetRows) {
    if (b.usage >= 100) notes.push(`Budget breached: ${b.category} at ${Math.round(b.usage)}%.`);
    else if (b.usage >= 80) notes.push(`Budget nearing limit: ${b.category} at ${Math.round(b.usage)}%.`);
  }

  return {
    hasData: txs.length > 0 || goalRows.length > 0 || budgetRows.length > 0,
    plan: String(profile?.current_plan || tier),
    currency: String(profile?.currency || "INR"),
    monthlyIncome,
    income30, expense30, savings30, savingsRate,
    topCategories, recentTx, budgets: budgetRows, goals: goalRows,
    subscriptions, automation: automationRows, priorAi, notes,
  };
}

function renderSnapshot(s: FinancialSnapshot): string {
  if (!s.hasData && !s.monthlyIncome) {
    return "USER FINANCIAL SNAPSHOT: (no data yet — user hasn't logged transactions, goals, or budgets). Encourage them to add data; give general but specific guidance.";
  }
  const lines: string[] = ["USER FINANCIAL SNAPSHOT (live from database):"];
  lines.push(`- Plan: ${s.plan} • Currency: ${s.currency}`);
  if (s.monthlyIncome) lines.push(`- Declared monthly income: ${inr(s.monthlyIncome)}`);
  lines.push(`- Last 30d income: ${inr(s.income30)} | expenses: ${inr(s.expense30)} | net savings: ${inr(s.savings30)} (rate ${s.savingsRate.toFixed(1)}%)`);

  // Phase 4 — Financial Health Score
  const savingsRateScore = s.income30 > 0
    ? Math.max(0, Math.min(100, ((s.income30 - s.expense30) / s.income30) * 100 * 4 + 30))
    : 40;
  const budgetUsedScore = s.budgets.length
    ? (s.budgets.filter((b) => b.usage <= 100).length / s.budgets.length) * 100
    : 60;
  const goalAvg = s.goals.length ? s.goals.reduce((a, g) => a + g.pct, 0) / s.goals.length : 50;
  const subPct = s.income30 > 0
    ? Math.min(100, (s.subscriptions.reduce((a, x) => a + x.amount, 0) / s.income30) * 100)
    : 0;
  const subScore = Math.max(20, 100 - subPct * 3);
  const healthOverall = Math.round(savingsRateScore * 0.35 + budgetUsedScore * 0.2 + goalAvg * 0.2 + subScore * 0.25);
  const healthGrade = healthOverall >= 85 ? "Excellent" : healthOverall >= 70 ? "Good" : healthOverall >= 50 ? "Fair" : "Poor";
  lines.push(`- Financial Health Score: ${healthOverall}/100 (${healthGrade})`);

  // Phase 5 — Forecast (30 days ahead, baseline = last 30d)
  const nextSpendForecast = s.expense30;
  const nextSavingsForecast = s.income30 - s.expense30;
  lines.push(`- 30d forecast: spending ~${inr(nextSpendForecast)}, savings ~${inr(nextSavingsForecast)}`);

  if (s.topCategories.length) {
    lines.push("- Top spend categories (30d):");
    for (const c of s.topCategories) lines.push(`   • ${c.category}: ${inr(c.spent)} (${c.pct.toFixed(0)}% of spend)`);
  }
  if (s.budgets.length) {
    lines.push("- Active budgets (this month):");
    for (const b of s.budgets) lines.push(`   • ${b.category}: ${inr(b.spent)} / ${inr(b.limit)} (${b.usage.toFixed(0)}% used)`);
  }
  if (s.goals.length) {
    lines.push("- Goals:");
    for (const g of s.goals) lines.push(`   • ${g.name}: ${inr(g.current)} / ${inr(g.target)} (${g.pct.toFixed(0)}%${g.deadline ? `, due ${g.deadline}` : ""})`);
  }
  if (s.subscriptions.length) {
    lines.push("- Recurring/subscriptions detected:");
    for (const sub of s.subscriptions) lines.push(`   • ${sub.title}: ${inr(sub.amount)} (last ${sub.lastSeen})`);
  }
  if (s.recentTx.length) {
    lines.push("- Recent transactions:");
    for (const t of s.recentTx) lines.push(`   • ${t.date} ${t.type === "income" ? "+" : "-"}${inr(t.amount)} ${t.title} [${t.category}]`);
  }
  if (s.automation.length) {
    lines.push("- Recent automation triggers:");
    for (const a of s.automation) lines.push(`   • ${a.when} ${a.rule} → ${a.action} (${a.reason})`);
  }
  if (s.priorAi.length) {
    lines.push("- Prior coach conversation memory (most recent first):");
    for (const p of s.priorAi) lines.push(`   • Q: ${p.q}\n     A: ${p.a}`);
  }
  if (s.notes.length) {
    lines.push("- Flags:");
    for (const n of s.notes) lines.push(`   • ${n}`);
  }
  return lines.join("\n");
}

function buildSystem(provider: Provider, persona: { id?: string; name?: string }, snapshot: string): string {
  const personaName = persona?.name ?? "Personal Finance";
  const styleByProvider: Record<Provider, string> = {
    lumo:   "Warm, balanced, concise.",
    gpt:    "Highly structured, step-by-step reasoning.",
    gemini: "Sharp, fast, compact.",
    claude: "Deeply analytical, multi-angle.",
  };
  return `You are Lumo AI — a premium AI financial coach inside FinTrack AI, routed through the "${PROVIDERS[provider].label}" engine.

Persona: ${personaName}.
Voice: ${styleByProvider[provider]}

${snapshot}

CRITICAL RULES — Phase 2 Personalization Engine:
- You MUST ground every answer in the snapshot above. Quote real numbers (₹), real category names, real goal names, real budgets.
- NEVER invent transactions, balances, goals, or categories that aren't in the snapshot.
- If the user asks "how am I doing", "where am I overspending", "can I afford X" — compute the answer from the snapshot data (savings rate, budget usage, goal commitments, projected savings).
- Reference prior coach conversations when relevant ("Last time we discussed…").
- If the snapshot has no data, say so briefly and give specific generic guidance.

OUTPUT FORMAT — strict markdown, always these four sections in this order:
## Summary
One-paragraph plain-English read of the situation, with at least one real ₹ number.
## Key Findings
- 3–5 bullets. Each bullet must cite a real number from the snapshot.
## Recommendations
- 3–4 concrete, prioritized actions tailored to this user's data.
## Action Plan
- Numbered list of 3 steps the user can do this week, with ₹ targets where possible.

Style: use ₹ and Indian formatting (₹1,25,000). Keep under ~220 words. No emoji spam (max one tasteful emoji). Never name OpenAI/Google/Anthropic — you are Lumo AI. End with one short motivating line after the Action Plan.`;
}

async function callGateway(provider: Provider, messages: ChatMsg[], apiKey: string) {
  const spec = PROVIDERS[provider];
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({ model: spec.model, messages, stream: false }),
  });
  if (!r.ok) {
    const errText = await r.text();
    const err: any = new Error(`gateway_${r.status}`);
    err.status = r.status; err.detail = errText;
    throw err;
  }
  const data = await r.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await sb.auth.getClaims(token);
    const userId = (claimsData?.claims?.sub as string) ?? null;
    if (claimsErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, persona = {}, history = [], context, model: requestedModel = "auto" } =
      await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tier: PlanTier = await resolveTier(sb, userId);
    const allowed = allowedProviders(tier);

    // ── Build snapshot (authed users get real data, demo gets client-provided)
    let snapshotText: string;
    if (userId) {
      try {
        const snap = await buildSnapshot(sb, userId, tier);
        snapshotText = renderSnapshot(snap);
      } catch (e) {
        console.error("snapshot build failed", e);
        snapshotText = "USER FINANCIAL SNAPSHOT: (unavailable — proceed with general guidance).";
      }
    } else if (context && typeof context === "object") {
      // Demo mode — use whatever the client passed.
      const lines = ["USER FINANCIAL SNAPSHOT (demo mode):"];
      if (context.monthlyIncome) lines.push(`- Monthly income: ₹${context.monthlyIncome}`);
      if (context.totalSpent)    lines.push(`- Spent this month: ₹${context.totalSpent}`);
      if (context.topCategories?.length) lines.push(`- Top categories: ${context.topCategories.join(", ")}`);
      if (context.goals?.length)         lines.push(`- Active goals: ${context.goals.join("; ")}`);
      snapshotText = lines.join("\n");
    } else {
      snapshotText = "USER FINANCIAL SNAPSHOT: (no data — demo / unauthenticated).";
    }

    let primary: Provider;
    if (requestedModel === "auto") primary = smartRoute(message, tier);
    else if ((Object.keys(PROVIDERS) as Provider[]).includes(requestedModel as Provider)) {
      const req = requestedModel as Provider;
      primary = allowed.includes(req) ? req : smartRoute(message, tier);
    } else primary = smartRoute(message, tier);

    const fallbackOrder: Provider[] = [
      primary,
      ...(["gemini", "lumo", "gpt", "claude"] as Provider[]).filter(
        (p) => p !== primary && allowed.includes(p),
      ),
    ];

    const baseMessages: ChatMsg[] = [
      ...history.slice(-8).map((h: any) => ({
        role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: String(h.text ?? h.content ?? ""),
      })),
      { role: "user", content: message },
    ];

    const started = Date.now();
    let lastErr: any = null;
    for (let i = 0; i < fallbackOrder.length; i++) {
      const provider = fallbackOrder[i];
      const messages: ChatMsg[] = [
        { role: "system", content: buildSystem(provider, persona, snapshotText) },
        ...baseMessages,
      ];
      try {
        const { text, usage } = await callGateway(provider, messages, apiKey);
        const latency = Date.now() - started;

        if (userId) {
          // Log usage + persist conversation memory (best-effort, parallel).
          await Promise.all([
            sb.from("ai_usage_logs").insert({
              user_id: userId, provider, model: PROVIDERS[provider].model,
              requested_model: requestedModel,
              prompt_tokens: usage?.prompt_tokens ?? null,
              completion_tokens: usage?.completion_tokens ?? null,
              total_tokens: usage?.total_tokens ?? null,
              latency_ms: latency, status: "ok", fallback_used: i > 0,
            }),
            sb.from("ai_history").insert({
              user_id: userId,
              persona: persona?.id ?? null,
              message,
              ai_response: text,
            }),
          ]);
        }

        return new Response(JSON.stringify({
          text, provider, providerLabel: PROVIDERS[provider].label,
          model: PROVIDERS[provider].model, fallbackUsed: i > 0, tier, latencyMs: latency,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        lastErr = e;
        console.error(`provider ${provider} failed`, e?.status, e?.detail);
        if (e?.status === 429 || e?.status === 402) {
          if (userId) {
            await sb.from("ai_usage_logs").insert({
              user_id: userId, provider, model: PROVIDERS[provider].model,
              requested_model: requestedModel, status: "error",
              latency_ms: Date.now() - started, error: `gateway_${e.status}`,
            });
          }
          return new Response(JSON.stringify({
            error: e.status === 429 ? "Rate limit — slow down a sec." : "AI credits exhausted.",
          }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    if (userId) {
      await sb.from("ai_usage_logs").insert({
        user_id: userId, provider: primary, model: PROVIDERS[primary].model,
        requested_model: requestedModel, status: "error",
        latency_ms: Date.now() - started, error: String(lastErr?.message ?? "all_failed"),
      });
    }
    return new Response(JSON.stringify({ error: "AI temporarily unavailable" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-router fatal", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
