// Smart Statement Import — parses bank/credit-card PDF, CSV, and image statements with AI
// and returns a structured list of transactions ready for review + import.
//
// Body: { fileBase64: string, fileName: string, mimeType?: string, userId?: string }
// Returns: { bank, accountHint, currency, transactions: [...] }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a world-class financial-statement parser for Indian & global banks
(HDFC, ICICI, SBI, Axis, Kotak, IDFC, Yes Bank, AU Bank, Paytm, PhonePe, Google Pay exports, credit card statements, etc.).

You will receive a bank statement, card statement, or transaction ledger (as text, CSV, PDF, or image).
Extract EVERY transaction row faithfully.

For each transaction return:
- date  (ISO YYYY-MM-DD; if year is missing, infer from statement period or use 2026)
- description  (cleaned merchant narration / UPI reference)
- merchant     (concise merchant name, e.g. "Swiggy", "Amazon", "Uber", "Zomato", "Starbucks", "Airtel"; or party name)
- amount       (positive number, no currency symbol)
- type         ("income" | "expense" | "transfer")
- category     (one of: Food, Shopping, Travel, Bills, Entertainment, Health, Education, Salary, Investment, Transfer, Other)
- balance      (running balance if shown, else null)
- recurring    (true if subscription/EMI/rent, else false)

Categorisation rules:
- Swiggy / Zomato / restaurants / coffee / food / groceries / Blinkit / Zepto / Instamart → Food
- Uber / Ola / Rapido / IRCTC / Metro / fuel / petrol pump → Travel
- Amazon / Flipkart / Myntra / clothing / electronics → Shopping
- Netflix / Spotify / Prime / Hotstar / YouTube / cinema → Entertainment
- Salary / payroll credits / client payments → Salary (type: "income")
- UPI P2P transfers → Transfer
- Electricity / mobile / broadband / water / DTH / utility → Bills
- Medicine / pharmacy / doctor / hospital / gym → Health
- School / college / tuition / books / courses → Education
- Mutual funds / Zerodha / Groww / SIP / stocks / FD → Investment
- If unsure, use Other.

Return STRICT JSON only:
{
  "bank": "Bank Name",
  "accountHint": "XXXX1234",
  "currency": "INR",
  "period": "Oct 2026",
  "transactions": [
    {
      "date": "2026-10-01",
      "description": "Swiggy order",
      "merchant": "Swiggy",
      "amount": 250,
      "type": "expense",
      "category": "Food",
      "balance": null,
      "recurring": false
    }
  ]
}`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    bank: { type: "string" },
    accountHint: { type: "string" },
    currency: { type: "string" },
    period: { type: "string" },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          merchant: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense", "transfer"] },
          category: { type: "string" },
          balance: { type: "number", nullable: true },
          recurring: { type: "boolean" },
        },
        required: ["date", "description", "amount", "type", "category"],
      },
    },
  },
  required: ["transactions"],
};

// Fast PDF text extractor (under 1ms)
function extractTextFromPdfBase64(b64: string): string {
  try {
    const raw = atob(b64);
    const textParts: string[] = [];

    // Tj operators
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(raw)) !== null) {
      if (match[1] && match[1].length > 0) {
        textParts.push(match[1].replace(/\\([()\\])/g, "$1"));
      }
    }

    // TJ array operators
    const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = arrayTjRegex.exec(raw)) !== null) {
      const inner = match[1];
      const parts = inner.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g) || [];
      const line = parts.map((p) => p.slice(1, -1).replace(/\\([()\\])/g, "$1")).join("");
      if (line.trim().length > 0) textParts.push(line);
    }

    return textParts.join("\n");
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const body = await req.json().catch(() => ({} as any));

    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
        if (userData?.user) userId = userData.user.id;
      } catch {}
    }
    if (!userId && body?.userId) {
      userId = String(body.userId);
    }

    const { fileBase64, fileName, mimeType } = body;
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 and fileName required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine MIME type
    let mt = mimeType || "application/pdf";
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".png")) mt = "image/png";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mt = "image/jpeg";
    else if (lowerName.endsWith(".webp")) mt = "image/webp";
    else if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) mt = "text/plain";

    const isPdf = mt === "application/pdf";
    const isText = mt === "text/plain";
    const isImg = mt.startsWith("image/");

    // Fast text extraction
    let textContent = "";
    if (isText) {
      try {
        textContent = atob(fileBase64);
      } catch {
        textContent = fileBase64;
      }
    } else if (isPdf) {
      const extracted = extractTextFromPdfBase64(fileBase64);
      if (extracted.trim().length > 40) {
        textContent = extracted;
      }
    }

    const hasText = textContent.trim().length > 40;
    let parsed: any = null;
    let providerUsed = "";
    const errors: string[] = [];

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    // ── 1. If text is available (CSV, TXT, or text PDF): Use Groq (sub-second) ──
    if (hasText && groqKey) {
      const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
      for (const gm of groqModels) {
        try {
          const t0 = Date.now();
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: gm,
              response_format: { type: "json_object" },
              temperature: 0.1,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Filename: ${fileName}\n\nStatement Content:\n${textContent.slice(0, 50000)}` },
              ],
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (groqRes.ok) {
            const gJson = await groqRes.json();
            const text = gJson.choices?.[0]?.message?.content;
            if (text) {
              const resObj = JSON.parse(text);
              if (resObj && Array.isArray(resObj.transactions) && resObj.transactions.length > 0) {
                parsed = resObj;
                providerUsed = `Groq ${gm} (${Date.now() - t0}ms)`;
                break;
              }
            }
          } else {
            errors.push(`Groq ${gm}: ${groqRes.status}`);
          }
        } catch (e: any) {
          errors.push(`Groq ${gm}: ${e.message}`);
        }
      }
    }

    // ── 2. Fallback to OpenAI gpt-4o-mini (Supports text & images, ~1.2s) ──
    if ((!parsed || !Array.isArray(parsed.transactions)) && openAiKey) {
      try {
        const t0 = Date.now();
        const userContent: any[] = [];
        if (hasText) {
          userContent.push({
            type: "text",
            text: `Filename: ${fileName}\n\nStatement Content:\n${textContent.slice(0, 50000)}`,
          });
        } else if (isImg) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${mt};base64,${fileBase64}` },
          });
          userContent.push({
            type: "text",
            text: `Statement file: ${fileName}. Extract all transactions as JSON.`,
          });
        }

        if (userContent.length > 0) {
          const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              temperature: 0.1,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", userContent },
              ],
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (oaiRes.ok) {
            const oaiJson = await oaiRes.json();
            const text = oaiJson.choices?.[0]?.message?.content;
            if (text) {
              const resObj = JSON.parse(text);
              if (resObj && Array.isArray(resObj.transactions) && resObj.transactions.length > 0) {
                parsed = resObj;
                providerUsed = `OpenAI gpt-4o-mini (${Date.now() - t0}ms)`;
              }
            }
          } else {
            errors.push(`OpenAI: ${oaiRes.status}`);
          }
        }
      } catch (e: any) {
        errors.push(`OpenAI: ${e.message}`);
      }
    }

    // ── 3. Fallback to Google Gemini (Native multimodal PDF & images) ──
    if ((!parsed || !Array.isArray(parsed.transactions)) && geminiKey) {
      const parts: any[] = [];
      if (hasText) {
        parts.push({
          text: `${SYSTEM_PROMPT}\n\nFilename: ${fileName}\n\nStatement Content:\n${textContent.slice(0, 50000)}\n\nExtract ALL transactions as JSON.`
        });
      } else {
        parts.push({
          text: `${SYSTEM_PROMPT}\n\nParse this statement document: ${fileName}. Extract ALL transactions as JSON.`
        });
        parts.push({
          inlineData: { mimeType: mt, data: fileBase64 }
        });
      }

      const geminiBody = {
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      };

      const candidateModels = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-flash-latest"];
      for (const model of candidateModels) {
        try {
          const t0 = Date.now();
          const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(geminiBody),
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!aiRes.ok) {
            const errText = await aiRes.text();
            errors.push(`${model}: ${aiRes.status}`);
            continue;
          }

          const aiJson = await aiRes.json();
          const content = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof content === "string") {
            try {
              const resObj = JSON.parse(content);
              if (resObj && Array.isArray(resObj.transactions)) {
                parsed = resObj;
                providerUsed = `Gemini ${model} (${Date.now() - t0}ms)`;
                break;
              }
            } catch {
              const m = content.match(/\{[\s\S]*\}/);
              if (m) {
                const resObj = JSON.parse(m[0]);
                if (resObj && Array.isArray(resObj.transactions)) {
                  parsed = resObj;
                  providerUsed = `Gemini ${model} (${Date.now() - t0}ms)`;
                  break;
                }
              }
            }
          }
        } catch (e: any) {
          errors.push(`${model}: ${e.message}`);
        }
      }
    }

    if (!parsed || !Array.isArray(parsed.transactions)) {
      return new Response(JSON.stringify({
        error: `Could not parse statement: ${errors.join(" | ") || "No valid transactions extracted."}`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalise transactions
    const txns = parsed.transactions
      .map((t: any) => ({
        date: String(t.date || "").slice(0, 10),
        description: String(t.description || t.merchant || "Transaction").trim(),
        merchant: String(t.merchant || t.description || "").trim(),
        amount: Math.abs(Number(t.amount) || 0),
        type: ["income", "expense", "transfer"].includes(t.type) ? t.type : "expense",
        category: String(t.category || "Other"),
        balance: t.balance == null ? null : Number(t.balance),
        recurring: !!t.recurring,
      }))
      .filter((t: any) => t.date && t.amount > 0);

    return new Response(JSON.stringify({
      bank: parsed.bank || null,
      accountHint: parsed.accountHint || null,
      currency: parsed.currency || "INR",
      period: parsed.period || null,
      transactions: txns,
      provider: providerUsed,
      durationMs: Date.now() - startTime,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
