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

You will receive a bank statement, card statement, or transaction ledger (as a PDF, image, or text/CSV).
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

Return STRICT JSON only matching the schema. Do not add markdown backticks.`;

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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Statement parsing not configured (GEMINI_API_KEY missing)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, fileName, mimeType } = body;
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 and fileName required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine MIME type
    let mt = mimeType || "application/pdf";
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".png")) mt = "image/png";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mt = "image/jpeg";
    else if (lowerName.endsWith(".webp")) mt = "image/webp";
    else if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) mt = "text/plain";

    // Build multimodal payload
    let parts: any[] = [];
    if (mt === "text/plain") {
      let textContent = "";
      try {
        textContent = atob(fileBase64);
      } catch {
        textContent = fileBase64;
      }
      parts = [
        { text: `${SYSTEM_PROMPT}\n\nStatement filename: ${fileName}.\n\nRaw CSV/Text Content:\n${textContent.slice(0, 40000)}\n\nExtract ALL transactions as JSON.` }
      ];
    } else {
      parts = [
        { text: `${SYSTEM_PROMPT}\n\nParse this statement file: ${fileName}. Extract ALL transactions as JSON matching the schema.` },
        { inline_data: { mime_type: mt, data: fileBase64 } },
      ];
    }

    const geminiBody = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    };

    // Candidate Gemini models with auto-failover
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
    ];

    let lastError = "";
    let parsed: any = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const aiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          lastError = `${model}: ${aiRes.status} ${errText.slice(0, 200)}`;
          continue;
        }

        const aiJson = await aiRes.json();
        const content = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof content === "string") {
          try {
            parsed = JSON.parse(content);
            if (parsed && Array.isArray(parsed.transactions)) break;
          } catch {
            const m = content.match(/\{[\s\S]*\}/);
            if (m) {
              try {
                parsed = JSON.parse(m[0]);
                if (parsed && Array.isArray(parsed.transactions)) break;
              } catch {}
            }
          }
        }
      } catch (err) {
        lastError = String(err);
      }
    }

    if (!parsed || !Array.isArray(parsed.transactions)) {
      return new Response(JSON.stringify({
        error: `Could not parse statement: ${lastError || "No valid transactions extracted."}`
      }), {
        status: 502,
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
