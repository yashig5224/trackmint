// Multi-provider AI router — OpenAI, Gemini, Groq, OpenRouter
// Uses YOUR API keys directly. No Lovable AI Gateway dependency.

export type Provider = "openai" | "gemini" | "groq" | "openrouter";
export type PlanTier = "free" | "pro" | "elite";

export interface ProviderSpec {
  id: Provider;
  label: string;
  model: string;
  strength: "balanced" | "reasoning" | "speed" | "analysis";
}

export const PROVIDERS: Record<Provider, ProviderSpec> = {
  openai:     { id: "openai",     label: "OpenAI GPT",      model: "gpt-4o-mini",                          strength: "analysis"  },
  gemini:     { id: "gemini",     label: "Gemini",          model: "gemini-2.5-flash",                     strength: "balanced"  },
  groq:       { id: "groq",       label: "Groq",            model: "llama-3.3-70b-versatile",              strength: "speed"     },
  openrouter: { id: "openrouter", label: "OpenRouter",      model: "meta-llama/llama-3.3-70b-instruct",    strength: "reasoning" },
};

// Hard plan gates — exactly as user requested.
// FREE → Gemini only
// PRO  → Gemini + Groq + OpenRouter
// ELITE → OpenAI + Gemini + Groq + OpenRouter
const TIER_PROVIDERS: Record<PlanTier, Provider[]> = {
  free:  ["gemini"],
  pro:   ["gemini", "groq", "openrouter"],
  elite: ["openai", "gemini", "groq", "openrouter"],
};

export function allowedProviders(tier: PlanTier): Provider[] {
  return TIER_PROVIDERS[tier] ?? TIER_PROVIDERS.free;
}

// Intent-based routing — picks the best provider for the request type,
// but only among those the user's tier allows.
export function smartRoute(message: string, tier: PlanTier): Provider {
  const m = message.toLowerCase();
  const wantsAnalysis  = /(forecast|predict|analy[sz]e|deep|long.?term|simulat|wealth|portfolio|invest|risk|scenari|tax|strategy)/.test(m);
  const wantsReasoning = /(why|explain|compare|should i|plan|trade.?off|optim[iy]z)/.test(m);
  const wantsSpeed     = /(quick|fast|short|tldr|summar[iy]|brief|one.?liner)/.test(m);

  const allowed = allowedProviders(tier);
  const pick = (p: Provider, fallback: Provider): Provider =>
    allowed.includes(p) ? p : fallback;

  // Financial analysis → OpenAI (elite only, fallback Gemini)
  if (wantsAnalysis) return pick("openai", "gemini");
  // Fast responses → Groq
  if (wantsSpeed) return pick("groq", "gemini");
  // Reasoning → OpenRouter (Llama-class)
  if (wantsReasoning) return pick("openrouter", "gemini");
  // Default → Gemini
  return "gemini";
}

// Failover chain: primary → next allowed in this priority order.
export function failoverChain(primary: Provider, tier: PlanTier): Provider[] {
  const priority: Provider[] = ["openai", "gemini", "groq", "openrouter"];
  const allowed = allowedProviders(tier);
  const chain = [primary, ...priority.filter((p) => p !== primary && allowed.includes(p))];
  // dedupe
  return Array.from(new Set(chain)).filter((p) => allowed.includes(p));
}

export interface ChatMsg { role: "user" | "assistant" | "system"; content: string }

interface CallResult {
  text: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

class ProviderError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`provider_${status}`);
    this.status = status;
    this.detail = detail;
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(messages: ChatMsg[]): Promise<CallResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new ProviderError(500, "OPENAI_API_KEY missing");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: PROVIDERS.openai.model, messages, stream: false }),
  });
  if (!r.ok) throw new ProviderError(r.status, await r.text());
  const data = await r.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
}

// ── Google Gemini (OpenAI-compatible endpoint) ───────────────────────────────
async function callGemini(messages: ChatMsg[]): Promise<CallResult> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new ProviderError(500, "GEMINI_API_KEY missing");
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: PROVIDERS.gemini.model, messages, stream: false }),
  });
  if (!r.ok) throw new ProviderError(r.status, await r.text());
  const data = await r.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
}

// ── Groq ─────────────────────────────────────────────────────────────────────
async function callGroq(messages: ChatMsg[]): Promise<CallResult> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new ProviderError(500, "GROQ_API_KEY missing");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: PROVIDERS.groq.model, messages, stream: false }),
  });
  if (!r.ok) throw new ProviderError(r.status, await r.text());
  const data = await r.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
}

// ── OpenRouter ───────────────────────────────────────────────────────────────
async function callOpenRouter(messages: ChatMsg[]): Promise<CallResult> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new ProviderError(500, "OPENROUTER_API_KEY missing");
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://finbee.lovable.app",
      "X-Title": "FinTrack AI",
    },
    body: JSON.stringify({ model: PROVIDERS.openrouter.model, messages, stream: false }),
  });
  if (!r.ok) throw new ProviderError(r.status, await r.text());
  const data = await r.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
}

export async function callProvider(provider: Provider, messages: ChatMsg[]): Promise<CallResult> {
  switch (provider) {
    case "openai":     return callOpenAI(messages);
    case "gemini":     return callGemini(messages);
    case "groq":       return callGroq(messages);
    case "openrouter": return callOpenRouter(messages);
  }
}

export { ProviderError };
