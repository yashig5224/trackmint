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

// Fast PDF text extractor with decompression support
async function extractTextFromPdfBase64(b64: string): Promise<string> {
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

    // If stream compressed, try decompressing FlateDecode blocks
    if (textParts.join(" ").length < 80) {
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let sMatch;
      let streamCount = 0;
      while ((sMatch = streamRegex.exec(raw)) !== null && streamCount < 20) {
        streamCount++;
        const streamData = sMatch[1];
        const sBytes = new Uint8Array(streamData.length);
        for (let j = 0; j < streamData.length; j++) sBytes[j] = streamData.charCodeAt(j);

        for (const format of ["deflate", "deflate-raw"] as const) {
          try {
            const ds = new DecompressionStream(format);
            const writer = ds.writable.getWriter();
            writer.write(sBytes);
            writer.close();
            const decompressed = await new Response(ds.readable).arrayBuffer();
            const decText = new TextDecoder("utf-8", { fatal: false }).decode(decompressed);

            let subMatch;
            while ((subMatch = tjRegex.exec(decText)) !== null) {
              if (subMatch[1]?.length > 0) textParts.push(subMatch[1].replace(/\\([()\\])/g, "$1"));
            }
            while ((subMatch = arrayTjRegex.exec(decText)) !== null) {
              const parts = subMatch[1].match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g) || [];
              const line = parts.map((p) => p.slice(1, -1).replace(/\\([()\\])/g, "$1")).join("");
              if (line.trim().length > 0) textParts.push(line);
            }
            break;
          } catch {}
        }
      }
    }

    return textParts.join("\n");
  } catch {
    return "";
  }
}

// Deterministic tabular parser for CSV, TSV, or structured lines
function parseDeterministicTransactions(text: string): any[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: any[] = [];
  const dateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;

  for (const line of lines) {
    const dMatch = line.match(dateRegex);
    if (!dMatch) continue;

    // Extract numbers with possible decimal
    const numMatches = line.match(/(?:INR|Rs\.?|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
    if (!numMatches || numMatches.length === 0) continue;

    const nums: number[] = [];
    for (const nm of numMatches) {
      const clean = nm.replace(/[^0-9.]/g, "");
      const val = parseFloat(clean);
      if (!isNaN(val) && val > 0 && val < 50000000) nums.push(val);
    }
    if (nums.length === 0) continue;

    const amount = nums[0];
    const balance = nums.length > 1 ? nums[nums.length - 1] : null;

    // Detect credit vs debit
    const isCredit = /\b(cr|credit|deposit|received|inward|refund)\b/i.test(line);
    const type = isCredit ? "income" : "expense";

    // Clean description
    let desc = line
      .replace(dMatch[0], "")
      .replace(/[0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?/g, "")
      .replace(/[,;|\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!desc || desc.length < 2) desc = "Bank Transaction";

    // Standardise date
    let isoDate = "";
    try {
      const dStr = dMatch[1].replace(/-/g, "/");
      const parts = dStr.split("/");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          isoDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else {
          const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          isoDate = `${yr}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    } catch {
      isoDate = new Date().toISOString().slice(0, 10);
    }

    if (isoDate && amount > 0) {
      results.push({
        date: isoDate,
        description: desc.slice(0, 80),
        merchant: desc.split(/[-_/|]/)[0].trim().slice(0, 30) || "Merchant",
        amount,
        type,
        category: type === "income" ? "Salary" : "Other",
        balance,
        recurring: false,
      });
    }
  }

  return results;
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
      const extracted = await extractTextFromPdfBase64(fileBase64);
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
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    // ── 1. If text is available (CSV, TXT, or text PDF): Use Groq (sub-second) ──
    if (hasText && groqKey) {
      const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
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
            signal: AbortSignal.timeout(9000),
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

    // ── 2. OpenAI (gpt-4o-mini supports text & images, fast & reliable) ──
    if ((!parsed || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) && openAiKey) {
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
                { role: "user", content: userContent },
              ],
            }),
            signal: AbortSignal.timeout(10000),
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

    // ── 3. Google Gemini (Native multimodal PDF & images) ──
    if ((!parsed || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) && geminiKey) {
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

      const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
      for (const model of candidateModels) {
        try {
          const t0 = Date.now();
          const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(geminiBody),
              signal: AbortSignal.timeout(8000),
            }
          );

          if (!aiRes.ok) {
            errors.push(`${model}: ${aiRes.status}`);
            continue;
          }

          const aiJson = await aiRes.json();
          const content = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof content === "string") {
            try {
              const resObj = JSON.parse(content);
              if (resObj && Array.isArray(resObj.transactions) && resObj.transactions.length > 0) {
                parsed = resObj;
                providerUsed = `Gemini ${model} (${Date.now() - t0}ms)`;
                break;
              }
            } catch {
              const m = content.match(/\{[\s\S]*\}/);
              if (m) {
                const resObj = JSON.parse(m[0]);
                if (resObj && Array.isArray(resObj.transactions) && resObj.transactions.length > 0) {
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

    // ── 4. OpenRouter Fallback ──
    if ((!parsed || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) && openRouterKey && hasText) {
      try {
        const t0 = Date.now();
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://trackmint-ashen.vercel.app",
            "X-Title": "TrackMint",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Filename: ${fileName}\n\nStatement Content:\n${textContent.slice(0, 50000)}` },
            ],
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (orRes.ok) {
          const orJson = await orRes.json();
          const text = orJson.choices?.[0]?.message?.content;
          if (text) {
            const resObj = JSON.parse(text);
            if (resObj && Array.isArray(resObj.transactions) && resObj.transactions.length > 0) {
              parsed = resObj;
              providerUsed = `OpenRouter (${Date.now() - t0}ms)`;
            }
          }
        }
      } catch (e: any) {
        errors.push(`OpenRouter: ${e.message}`);
      }
    }

    // ── 5. Deterministic fallback if text exists and AI providers failed ──
    if ((!parsed || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) && (hasText || isText)) {
      const fallbackRows = parseDeterministicTransactions(textContent);
      if (fallbackRows.length > 0) {
        parsed = {
          bank: "Imported Statement",
          accountHint: null,
          currency: "INR",
          period: null,
          transactions: fallbackRows,
        };
        providerUsed = "Deterministic Parser";
      }
    }

    if (!parsed || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
      return new Response(JSON.stringify({
        error: `Could not parse statement: ${errors.join(" | ") || "No valid transactions could be extracted from this document."}`
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
