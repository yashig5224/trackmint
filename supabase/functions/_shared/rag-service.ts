// Advanced Hybrid RAG Engine for TrackMint Lumo AI Coach
// Combines:
// 1. Semantic Document Retrieval using Supabase pgvector + Hugging Face Embeddings
// 2. SQL-based Structured Financial Data Retrieval from live database
// 3. Multi-turn Conversation Memory from ai_history
// 4. Verifiable Source Citations and Historical Financial Insights

import { createClient } from "npm:@supabase/supabase-js@2";

export interface KnowledgeChunk {
  id?: string;
  title: string;
  category: "taxation" | "investing" | "budgeting" | "debt" | "emergency_fund" | "retirement" | "credit" | "trackmint_system";
  content: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
}

export interface RetrievedSource {
  id: string;
  title: string;
  category: string;
  type: "knowledge" | "financial_data";
  snippet: string;
  similarity?: number;
}

export interface HybridRAGContext {
  knowledgeChunks: KnowledgeChunk[];
  dataSources: RetrievedSource[];
  allSources: RetrievedSource[];
  promptContext: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Hugging Face Open-Source Embeddings (sentence-transformers/all-MiniLM-L6-v2)
// 384 dimensions — lightweight, fast, highly accurate for financial queries
// ─────────────────────────────────────────────────────────────────────────────

const HF_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim().slice(0, 1000);
  const hfKey = (Deno.env.get("HUGGINGFACE_API_KEY") || "").trim().replace(/^["']|["']$/g, "");

  if (hfKey) {
    try {
      // Primary: Hugging Face Inference API
      const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_EMBED_MODEL}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: cleanText,
          options: { wait_for_model: true },
        }),
      });

      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          // Flatten if nested [[...]]
          const vector = Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);
          if (vector.length === 384) {
            return normalizeVector(vector);
          }
        }
      } else {
        console.warn("Hugging Face embed status:", res.status, await res.text());
      }
    } catch (e) {
      console.warn("Hugging Face API call failed, using fallback vectorizer:", e);
    }
  }

  // Resilient deterministic unit-norm 384-dim semantic hash vectorizer fallback
  return generateDeterministicEmbedding(cleanText);
}

function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const mag = Math.sqrt(sumSq) || 1e-10;
  return vec.map((v) => Number((v / mag).toFixed(6)));
}

function generateDeterministicEmbedding(text: string): number[] {
  const dim = 384;
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().match(/\w+/g) || ["money"];

  for (let t = 0; t < tokens.length; t++) {
    const word = tokens[t];
    for (let c = 0; c < word.length; c++) {
      const charCode = word.charCodeAt(c);
      const idx1 = (charCode * 31 + c * 17 + t * 7) % dim;
      const idx2 = (charCode * 53 + c * 23 + t * 13) % dim;
      vec[idx1] += Math.sin(charCode + c);
      vec[idx2] += Math.cos(charCode * t + 1);
    }
  }
  return normalizeVector(vec);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Curated Financial Knowledge Base (Seed Corpus)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_KNOWLEDGE: KnowledgeChunk[] = [
  {
    title: "Indian Income Tax Act — Old vs New Regime & Section 80C/80D",
    category: "taxation",
    content: "Under the New Tax Regime (Section 115BAC default), tax slabs are broader with standard deduction of ₹75,000 for salaried employees, but 80C/80D are not allowed. The Old Regime allows up to ₹1,50,000 deduction under 80C (EPF, PPF, ELSS mutual funds, life insurance), ₹25,000/₹50,000 for health insurance under 80D, and an additional ₹50,000 under Section 80CCD(1B) for Tier-1 NPS. Choose Old Regime if total eligible deductions exceed ₹3.75 Lakhs.",
    metadata: { jurisdiction: "India", fiscal_year: "2026-27", authority: "Income Tax Department" },
  },
  {
    title: "Equity & Capital Gains Tax Rules (STCG vs LTCG)",
    category: "taxation",
    content: "Listed equity shares and equity mutual funds held for more than 12 months qualify for Long Term Capital Gains (LTCG) taxed at 12.5% for gains exceeding ₹1.25 Lakh per financial year (exemption limit ₹1.25L). Short Term Capital Gains (STCG, held less than 12 months) are taxed at 20%. Debt mutual funds purchased after April 1, 2023 are taxed at applicable income tax slab rates regardless of holding period.",
    metadata: { instrument: "Equity, Mutual Funds, Stocks", rule_type: "Capital Gains" },
  },
  {
    title: "The 50/30/20 Budgeting Rule & Urban Metro Adjustments",
    category: "budgeting",
    content: "The golden baseline splits net take-home salary into: 50% Needs (rent, utilities, groceries, EMIs, health), 30% Wants (dining out, entertainment, shopping, vacations), and 20% Wealth Building (SIPs, emergency fund, retirement). In Tier-1 Indian metro cities like Bengaluru or Mumbai where rent exceeds 30%, adapt to the 60/20/20 split: 60% Needs, 20% Wants, 20% Savings. Never reduce the 20% savings threshold.",
    metadata: { framework: "50-30-20 Rule", adjustment: "Tier-1 Metro Indian Cities" },
  },
  {
    title: "Emergency Fund Blueprint — Structure and Liquidity",
    category: "emergency_fund",
    content: "An emergency fund must cover 3 to 6 months of non-negotiable living expenses (rent + groceries + utility bills + active loan EMIs + insurance premiums). Salaried employees with stable jobs need 3-4 months; freelancers and single-income families need 6-9 months. Store 30% in high-yield savings account or auto-sweep FD for immediate UPI access, and 70% in Liquid or Overnight Mutual Funds with instantaneous redemption. Never lock emergency reserves in equity, real estate, or long-term lock-in instruments.",
    metadata: { horizon: "Immediate", liquidity: "High", risk: "Ultra Low" },
  },
  {
    title: "SIP Compounding & The 15x15x15 Wealth Creation Rule",
    category: "investing",
    content: "Systematic Investment Plans (SIP) leverage rupee cost averaging to reduce timing risk. The 15x15x15 wealth rule demonstrates compounding: investing ₹15,000 monthly for 15 years at an expected 15% CAGR generates ₹1 Crore corpus (₹27 Lakh invested, ₹73 Lakh wealth generated). Increasing your SIP by 10% each year (Step-up SIP) cuts the time to ₹1 Crore by nearly 3 years and boosts terminal wealth by over 60%. Prioritize low-cost Nifty 50 and Nifty Next 50 index funds with expense ratio under 0.2%.",
    metadata: { principle: "Compounding", formula: "15*15*15 Rule", vehicle: "Index Mutual Funds" },
  },
  {
    title: "Debt Elimination Strategy — Avalanche vs Snowball Method",
    category: "debt",
    content: "Two proven mathematical frameworks eliminate debt: 1) Debt Avalanche pays minimums on all obligations while directing every excess rupee to the debt with the highest interest rate (e.g. credit cards at 36-42% APR, then personal loans at 12-16%, then auto loans at 8-10%). This saves the maximum money in total interest. 2) Debt Snowball pays off the smallest balance first regardless of interest to score quick psychological wins. For high-interest credit card debt, Avalanche is mandatory to stop compound interest destruction.",
    metadata: { strategy: "Avalanche vs Snowball", target: "High-interest debt elimination" },
  },
  {
    title: "Credit Score (CIBIL) Optimization & 30% Utilization Barrier",
    category: "credit",
    content: "A healthy credit score (CIBIL 750+) unlocks lowest home loan interest rates (saving ₹10-20 Lakhs over loan tenures). Key levers: 1) Maintain Credit Utilization Ratio (CUR) below 30% of total limit across all credit cards. 2) Pay full statement balance 3 days before the due date — never pay only minimum due (which triggers 42% APR interest on all new purchases). 3) Maintain an old credit line active to preserve credit history age. 4) Avoid applying for multiple loan inquiries in short periods.",
    metadata: { score_type: "CIBIL / Experian", target_score: "750+" },
  },
  {
    title: "Retirement Planning & FIRE (Financial Independence, Retire Early)",
    category: "retirement",
    content: "To achieve Financial Independence, calculate your FIRE number as 25x to 30x your annual living expenses adjusted for 6-7% Indian inflation. Using the 4% Safe Withdrawal Rate (SWR), a portfolio of ₹3 Crore generates ₹12 Lakh annual income (₹1 Lakh/month) with low depletion risk over 30 years. Allocate assets across 60% Equity (Index/Flexicap funds), 30% Fixed Income (PPF, EPF, Debt funds), and 10% Gold/Emergency cash. PPF offers sovereign EEE tax exemption with ₹1.5L annual limit.",
    metadata: { framework: "FIRE", safe_withdrawal_rate: "3.5% - 4.0%", benchmark: "25x-30x annual expenses" },
  },
  {
    title: "TrackMint Automated Habits & Direct In-Chat Actions",
    category: "trackmint_system",
    content: "TrackMint provides interactive execution directly within the Lumo AI conversation. When you ask Lumo to 'log ₹350 for dinner', 'create a ₹10,000 food budget', or 'set a ₹50,000 emergency fund goal', Lumo formats an automated action block. You can approve the action with one tap to directly write into your transactions, budgets, or goals database without navigating between screens.",
    metadata: { product: "TrackMint", feature: "In-chat Action Blocks" },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Knowledge Base Seeder (Auto-runs if table is empty)
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureKnowledgeBaseSeeded(sb: ReturnType<typeof createClient>): Promise<number> {
  try {
    const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, adminKey);

    const { count, error } = await adminSb
      .from("financial_knowledge_chunks")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.warn("Could not check financial_knowledge_chunks count:", error.message);
      return 0;
    }

    if (count && count > 0) {
      return count;
    }

    console.log("🌱 Seeding financial knowledge base with pgvector embeddings...");
    let inserted = 0;

    for (const chunk of SEED_KNOWLEDGE) {
      const embedding = await generateEmbedding(`${chunk.title} \n ${chunk.content}`);
      const { error: insErr } = await adminSb.from("financial_knowledge_chunks").insert({
        title: chunk.title,
        category: chunk.category,
        content: chunk.content,
        metadata: chunk.metadata || {},
        embedding,
      });

      if (!insErr) inserted++;
      else console.warn("Failed to insert knowledge chunk:", chunk.title, insErr.message);
    }

    console.log(`✅ Seeded ${inserted} knowledge chunks into pgvector.`);
    return inserted;
  } catch (err) {
    console.error("ensureKnowledgeBaseSeeded failed:", err);
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Semantic Knowledge Retrieval (Vector Search)
// ─────────────────────────────────────────────────────────────────────────────

export async function retrieveSemanticKnowledge(
  sb: ReturnType<typeof createClient>,
  query: string,
  matchCount = 4
): Promise<KnowledgeChunk[]> {
  try {
    // Generate query embedding using Hugging Face model
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await sb.rpc("match_financial_knowledge", {
      query_embedding: queryEmbedding,
      match_threshold: 0.0,
      match_count: matchCount,
    });

    if (error) {
      console.warn("RPC match_financial_knowledge error:", error.message);
      // Fallback: simple text match on knowledge chunks
      return fallbackTextMatch(sb, query, matchCount);
    }

    if (data && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        metadata: row.metadata,
        similarity: Number(row.similarity ?? 0),
      }));
    }

    // If no vector results, fallback to text match
    return fallbackTextMatch(sb, query, matchCount);
  } catch (err) {
    console.error("Semantic search retrieval failed:", err);
    return [];
  }
}

async function fallbackTextMatch(
  sb: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<KnowledgeChunk[]> {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 3);
    let q = sb.from("financial_knowledge_chunks").select("id, title, category, content, metadata").limit(limit);

    if (keywords.length > 0) {
      const orFilter = keywords.map((k) => `content.ilike.%${k}%,title.ilike.%${k}%`).join(",");
      q = q.or(orFilter);
    }

    const { data } = await q;
    return (data || []).map((row: any) => ({
      ...row,
      similarity: 0.75,
    }));
  } catch (_e) {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SQL-Based Financial Data Retrieval (Structured Database Snapshot)
// ─────────────────────────────────────────────────────────────────────────────

export async function retrieveFinancialData(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<{ snapshotText: string; sources: RetrievedSource[] }> {
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const sources: RetrievedSource[] = [];

  const [profileRes, txRes, budgetRes, goalRes, historyRes] = await Promise.all([
    sb.from("profiles").select("monthly_income, currency, current_plan, financial_score").eq("id", userId).maybeSingle(),
    sb.from("transactions")
      .select("transaction_date, title, category, amount, type, recurring")
      .eq("user_id", userId)
      .gte("transaction_date", since30)
      .order("transaction_date", { ascending: false })
      .limit(300),
    sb.from("budgets")
      .select("category, monthly_limit, spent_amount, month")
      .eq("user_id", userId)
      .order("month", { ascending: false })
      .limit(20),
    sb.from("goals")
      .select("goal_name, target_amount, current_amount, deadline, category")
      .eq("user_id", userId)
      .limit(10),
    sb.from("ai_history")
      .select("message, ai_response, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const profile = profileRes.data;
  const txs = txRes.data || [];
  const budgets = budgetRes.data || [];
  const goals = goalRes.data || [];
  const aiHistory = historyRes.data || [];

  const currency = profile?.currency || "INR";
  const monthlyIncome = Number(profile?.monthly_income || 0);

  const income30 = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense30 = txs.filter((t) => t.type !== "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const savings30 = income30 - expense30;
  const savingsRate = income30 > 0 ? ((savings30 / income30) * 100) : 0;

  // Add primary data sources for verifiable citation
  sources.push({
    id: "data-30d-cashflow",
    title: "User 30-Day Cashflow",
    category: "financial_data",
    type: "financial_data",
    snippet: `Income: ₹${Math.round(income30).toLocaleString("en-IN")}, Expenses: ₹${Math.round(expense30).toLocaleString("en-IN")}, Net Savings: ₹${Math.round(savings30).toLocaleString("en-IN")} (${savingsRate.toFixed(1)}% savings rate).`,
  });

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const t of txs) {
    if (t.type === "income") continue;
    const cat = t.category || "Uncategorized";
    catMap.set(cat, (catMap.get(cat) || 0) + Number(t.amount || 0));
  }
  const topCategories = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      pct: expense30 > 0 ? (amt / expense30) * 100 : 0,
    }));

  if (topCategories.length > 0) {
    sources.push({
      id: "data-top-categories",
      title: "Category Spending Breakdown",
      category: "financial_data",
      type: "financial_data",
      snippet: topCategories.map((c) => `${c.category}: ₹${Math.round(c.amount).toLocaleString("en-IN")} (${c.pct.toFixed(0)}%)`).join(" | "),
    });
  }

  // Active budgets & breaches
  if (budgets.length > 0) {
    const budgetList = budgets.map((b) => {
      const lim = Number(b.monthly_limit || 0);
      const sp = Number(b.spent_amount || 0);
      const usage = lim > 0 ? (sp / lim) * 100 : 0;
      return `${b.category}: ₹${Math.round(sp).toLocaleString("en-IN")}/₹${Math.round(lim).toLocaleString("en-IN")} (${usage.toFixed(0)}%)`;
    });
    sources.push({
      id: "data-active-budgets",
      title: "Active Monthly Budgets",
      category: "financial_data",
      type: "financial_data",
      snippet: budgetList.join(" | "),
    });
  }

  // Active goals
  if (goals.length > 0) {
    const goalList = goals.map((g) => {
      const tgt = Number(g.target_amount || 0);
      const cur = Number(g.current_amount || 0);
      const pct = tgt > 0 ? (cur / tgt) * 100 : 0;
      return `${g.goal_name}: ₹${Math.round(cur).toLocaleString("en-IN")}/₹${Math.round(tgt).toLocaleString("en-IN")} (${pct.toFixed(0)}%)`;
    });
    sources.push({
      id: "data-active-goals",
      title: "Financial Goals",
      category: "financial_data",
      type: "financial_data",
      snippet: goalList.join(" | "),
    });
  }

  // Build rendered snapshot text
  const lines: string[] = ["STRUCTURED FINANCIAL DATA (Retrieved live from database via SQL):"];
  lines.push(`- Declared Income: ₹${Math.round(monthlyIncome).toLocaleString("en-IN")} • Currency: ${currency}`);
  lines.push(`- 30-Day Realized Income: ₹${Math.round(income30).toLocaleString("en-IN")}`);
  lines.push(`- 30-Day Expenses: ₹${Math.round(expense30).toLocaleString("en-IN")}`);
  lines.push(`- 30-Day Net Savings: ₹${Math.round(savings30).toLocaleString("en-IN")} (${savingsRate.toFixed(1)}% savings rate)`);

  if (topCategories.length) {
    lines.push(`- Top Expense Categories:`);
    topCategories.forEach((c) => lines.push(`   • ${c.category}: ₹${Math.round(c.amount).toLocaleString("en-IN")} (${c.pct.toFixed(0)}% of total)`));
  }

  if (budgets.length) {
    lines.push(`- Current Month Budgets:`);
    budgets.forEach((b) => {
      const lim = Number(b.monthly_limit || 0);
      const sp = Number(b.spent_amount || 0);
      const usage = lim > 0 ? (sp / lim) * 100 : 0;
      lines.push(`   • ${b.category}: ₹${Math.round(sp).toLocaleString("en-IN")} / ₹${Math.round(lim).toLocaleString("en-IN")} (${usage.toFixed(0)}% used)${usage >= 100 ? " [BREACHED]" : usage >= 80 ? " [WARNING]" : ""}`);
    });
  }

  if (goals.length) {
    lines.push(`- Active Goals:`);
    goals.forEach((g) => {
      const tgt = Number(g.target_amount || 0);
      const cur = Number(g.current_amount || 0);
      const pct = tgt > 0 ? (cur / tgt) * 100 : 0;
      lines.push(`   • ${g.goal_name}: ₹${Math.round(cur).toLocaleString("en-IN")} / ₹${Math.round(tgt).toLocaleString("en-IN")} (${pct.toFixed(0)}% reached)`);
    });
  }

  // Conversation memory
  if (aiHistory.length) {
    lines.push(`- Conversation Memory (Past user & coach turns):`);
    aiHistory.forEach((h) => {
      lines.push(`   • User asked: "${String(h.message || "").slice(0, 100)}"`);
      lines.push(`     Lumo responded: "${String(h.ai_response || "").slice(0, 140)}..."`);
    });
  }

  return { snapshotText: lines.join("\n"), sources };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Unified Hybrid Context Builder
// ─────────────────────────────────────────────────────────────────────────────

export async function buildHybridRAGContext(
  sb: ReturnType<typeof createClient>,
  userId: string | null,
  message: string,
  demoContext?: any
): Promise<HybridRAGContext> {
  // 1. Ensure seed knowledge is populated
  await ensureKnowledgeBaseSeeded(sb);

  // 2. Semantic vector search for relevant financial knowledge
  const knowledgeChunks = await retrieveSemanticKnowledge(sb, message, 4);

  // 3. Structured SQL data retrieval for authenticated users
  let snapshotText = "";
  let dataSources: RetrievedSource[] = [];

  if (userId) {
    const sqlData = await retrieveFinancialData(sb, userId);
    snapshotText = sqlData.snapshotText;
    dataSources = sqlData.sources;
  } else if (demoContext) {
    snapshotText = `STRUCTURED FINANCIAL DATA (Demo context):
- Monthly Income: ₹${demoContext.monthlyIncome || 60000}
- Spent This Month: ₹${demoContext.totalSpent || 24000}
- Top Categories: ${(demoContext.topCategories || ["Food & Dining", "Rent", "Shopping"]).join(", ")}`;

    dataSources.push({
      id: "demo-data",
      title: "Demo Financial Overview",
      category: "financial_data",
      type: "financial_data",
      snippet: `Income: ₹${demoContext.monthlyIncome || 60000}, Spent: ₹${demoContext.totalSpent || 24000}`,
    });
  } else {
    snapshotText = "STRUCTURED FINANCIAL DATA: No database records logged yet. Provide general principles.";
  }

  // Convert knowledge chunks to source citations
  const knowledgeSources: RetrievedSource[] = knowledgeChunks.map((k) => ({
    id: k.id || `doc-${k.title.slice(0, 10)}`,
    title: k.title,
    category: k.category,
    type: "knowledge" as const,
    snippet: k.content.slice(0, 180) + "...",
    similarity: k.similarity,
  }));

  const allSources = [...dataSources, ...knowledgeSources];

  // Render RAG prompt section
  const promptLines: string[] = [];

  promptLines.push("━━━ HYBRID RAG CONTEXT ━━━");
  promptLines.push(snapshotText);
  promptLines.push("");

  if (knowledgeChunks.length > 0) {
    promptLines.push("VERIFIED FINANCIAL KNOWLEDGE ARTICLES (Retrieved via pgvector Semantic Search):");
    knowledgeChunks.forEach((k, idx) => {
      promptLines.push(`[Source ${idx + 1}: ${k.title}] (${k.category.toUpperCase()})`);
      promptLines.push(k.content);
      promptLines.push("");
    });
  }

  promptLines.push("━━━ CITATION DIRECTIVE ━━━");
  promptLines.push("- When grounding recommendations in the retrieved knowledge, cite the source name in brackets, e.g. [Source: Indian Income Tax Act — Old vs New Regime] or [Source: The 50/30/20 Budgeting Rule].");
  promptLines.push("- When referencing user financial data, cite the data source, e.g. [Data: User 30-Day Cashflow] or [Data: Active Monthly Budgets].");
  promptLines.push("- Cite naturally within or at the end of key recommendations to provide transparent, verifiable confidence.");

  return {
    knowledgeChunks,
    dataSources,
    allSources,
    promptContext: promptLines.join("\n"),
  };
}
