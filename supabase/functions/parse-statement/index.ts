// Smart Statement Import — parses bank/credit-card PDF statements with AI
// and returns a structured list of transactions ready for review + import.
//
// Body: { fileBase64: string, fileName: string, mimeType?: string }
// Returns: { bank, accountHint, currency, transactions: [...] }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


const SYSTEM_PROMPT = `You are a financial-statement parser for Indian + global banks
(HDFC, ICICI, SBI, Axis, Kotak, IDFC, Yes Bank, AU Bank, Plaid/Tink exports, credit-card statements, etc.).

You will receive a PDF bank or credit-card statement. Extract EVERY transaction row.

For each transaction return:
- date  (ISO YYYY-MM-DD; if year is missing, infer from statement period)
- description  (cleaned merchant / narration)
- merchant     (short merchant name, e.g. "Swiggy", "Amazon", "Uber"; empty string if unknown)
- amount       (positive number, no currency symbol)
- type         ("income" | "expense" | "transfer")
- category     (one of: Food, Shopping, Travel, Bills, Entertainment, Health, Education, Salary, Investment, Transfer, Other)
- balance      (running balance if shown, else null)

Categorisation rules:
- Swiggy / Zomato / restaurants → Food
- Uber / Ola / Rapido / IRCTC / fuel → Travel
- Amazon / Flipkart / Myntra → Shopping
- Netflix / Spotify / Prime / Hotstar → Entertainment (mark recurring=true if monthly)
- Salary / payroll credits → Salary (income)
- UPI P2P transfers → Transfer
- Electricity / mobile / broadband → Bills
- If unsure, use Other.

Return STRICT JSON only — no markdown, no commentary.`;

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
          balance: { type: ["number", "null"] },
          recurring: { type: "boolean" },
        },
        required: ["date", "description", "amount", "type", "category"],
      },
    },
  },
  required: ["transactions"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, fileName, mimeType } = await req.json();
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 and fileName required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mt = mimeType || "application/pdf";
    const dataUrl = `data:${mt};base64,${fileBase64}`;

    const body = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `Parse this statement file: ${fileName}. Extract ALL transactions. Respond as JSON matching the schema.` },
            { type: "file", file: { filename: fileName, file_data: dataUrl } },
          ],
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_parsed_statement",
          description: "Return the parsed statement transactions.",
          parameters: RESPONSE_SCHEMA,
        },
      }],
      tool_choice: { type: "function", function: { name: "return_parsed_statement" } },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: `AI gateway: ${aiRes.status} ${errText.slice(0, 300)}` }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = null;
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch { /* fall through */ }
    }
    if (!parsed) {
      // fallback: try plain content
      const content = aiJson?.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
      }
    }
    if (!parsed || !Array.isArray(parsed.transactions)) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: aiJson }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalise
    const txns = parsed.transactions
      .map((t: any) => ({
        date: String(t.date || "").slice(0, 10),
        description: String(t.description || "").trim(),
        merchant: String(t.merchant || "").trim(),
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
