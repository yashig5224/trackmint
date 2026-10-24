// Multi-provider AI router — OpenAI, Gemini, Groq, OpenRouter
// Uses YOUR API keys directly. No Lovable AI Gateway dependency.

export type Provider = "openai" | "gemini" | "groq" | "openrouter" | "local";
export type PlanTier = "free" | "pro" | "elite";

export interface ProviderSpec {
  id: Provider;
  label: string;
  model: string;
  strength: "balanced" | "reasoning" | "speed" | "analysis";
}

export const PROVIDERS: Record<Provider, ProviderSpec> = {
  groq:       { id: "groq",       label: "Groq (GPT-OSS)",  model: "openai/gpt-oss-120b", strength: "speed"     },
  gemini:     { id: "gemini",     label: "Gemini",          model: "gemini-flash-latest", strength: "balanced"  },
  openai:     { id: "openai",     label: "OpenAI GPT",      model: "gpt-4o-mini",         strength: "analysis"  },
  openrouter: { id: "openrouter", label: "OpenRouter",      model: "meta-llama/llama-3.3-70b-instruct", strength: "reasoning" },
  local:      { id: "local",      label: "Local / OSS LLM", model: "llama3.2",            strength: "reasoning" },
};

// Hard plan gates
const hasLocal = !!(Deno.env.get("LOCAL_LLM_URL") || Deno.env.get("OLLAMA_BASE_URL"));
const TIER_PROVIDERS: Record<PlanTier, Provider[]> = {
  free:  hasLocal ? ["local", "groq", "gemini"] : ["groq", "gemini"],
  pro:   hasLocal ? ["local", "groq", "gemini", "openrouter"] : ["groq", "gemini", "openrouter"],
  elite: hasLocal ? ["local", "groq", "gemini", "openai", "openrouter"] : ["groq", "gemini", "openai", "openrouter"],
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

  // Financial analysis → Gemini / Groq
  if (wantsAnalysis) return pick("gemini", "groq");
  // Fast responses → Groq
  if (wantsSpeed) return pick("groq", "gemini");
  // Reasoning → Groq
  if (wantsReasoning) return pick("groq", "gemini");
  // Default → Groq for speed & reliability
  return "groq";
}

// Failover chain: primary → next in priority order across all valid engines
export function failoverChain(primary: Provider, tier: PlanTier): Provider[] {
  const hasLocal = !!(Deno.env.get("LOCAL_LLM_URL") || Deno.env.get("OLLAMA_BASE_URL"));
  const priority: Provider[] = hasLocal
    ? ["local", "groq", "gemini", "openai", "openrouter"]
    : ["groq", "gemini", "openai", "openrouter"];
  const chain = [primary, ...priority.filter((p) => p !== primary)];
  return Array.from(new Set(chain));
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

// ── Google Gemini (Native endpoint with model fallbacks) ────────────────────
async function callGemini(messages: ChatMsg[]): Promise<CallResult> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new ProviderError(500, "GEMINI_API_KEY missing");
  const candidateModels = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];
  let lastErr = "";
  let lastStatus = 500;

  for (const m of candidateModels) {
    try {
      const systemMsg = messages.find((msg) => msg.role === "system")?.content;
      const nonSystem = messages.filter((msg) => msg.role !== "system");
      const contents = nonSystem.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const bodyPayload: any = { contents };
      if (systemMsg) {
        bodyPayload.systemInstruction = { parts: [{ text: systemMsg }] };
      }

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (r.ok) {
        const data = await r.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) return { text };
      }
      lastStatus = r.status;
      lastErr = await r.text();
    } catch (e: any) {
      lastErr = String(e);
    }
  }

  throw new ProviderError(lastStatus, lastErr);
}

// ── Groq (Ultra fast OSS models) ─────────────────────────────────────────────
async function callGroq(messages: ChatMsg[]): Promise<CallResult> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new ProviderError(500, "GROQ_API_KEY missing");
  const candidateModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
  let lastErr = "";
  let lastStatus = 500;

  for (const model of candidateModels) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      if (r.ok) {
        const data = await r.json();
        const text = data?.choices?.[0]?.message?.content ?? "";
        if (text) return { text, usage: data?.usage };
      }
      lastStatus = r.status;
      lastErr = await r.text();
    } catch (e: any) {
      lastErr = String(e);
    }
  }

  throw new ProviderError(lastStatus, lastErr);
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
      "HTTP-Referer": Deno.env.get("SITE_URL") || "https://trackmint-ashen.vercel.app",
      "X-Title": "TrackMint",
    },
    body: JSON.stringify({ model: PROVIDERS.openrouter.model, messages, stream: false }),
  });
  if (!r.ok) throw new ProviderError(r.status, await r.text());
  const data = await r.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
}

// ── Local / Self-Hosted Open-Weight LLM (Ollama / vLLM / OpenAI-compatible) ───
async function callLocalLLM(messages: ChatMsg[]): Promise<CallResult> {
  const url = Deno.env.get("LOCAL_LLM_URL") || Deno.env.get("OLLAMA_BASE_URL") || "http://127.0.0.1:11434/v1";
  const model = Deno.env.get("LOCAL_LLM_MODEL") || "llama3.2";
  const apiKey = Deno.env.get("LOCAL_LLM_API_KEY") || "ollama";
  const endpoint = `${url.replace(/\/+$/, "")}/chat/completions`;

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });
    if (!r.ok) throw new ProviderError(r.status, await r.text());
    const data = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", usage: data?.usage };
  } catch (err: any) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(503, `Local LLM unreachable at ${endpoint}: ${err?.message || err}`);
  }
}

export async function callProvider(provider: Provider, messages: ChatMsg[]): Promise<CallResult> {
  switch (provider) {
    case "local":      return callLocalLLM(messages);
    case "openai":     return callOpenAI(messages);
    case "gemini":     return callGemini(messages);
    case "groq":       return callGroq(messages);
    case "openrouter": return callOpenRouter(messages);
  }
}

export { ProviderError };
