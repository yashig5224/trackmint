// Phase 10 — Advanced AI Insight Engine
// Continuously analyzes transactions, budgets, goals, subscriptions to
// surface daily/weekly/monthly insights, anomalies, drift and opportunities.

import type { Tx, Goal } from "@/components/dashboard/CommandCenter";
import { computeHealthScore } from "@/lib/financialHealth";
import { computeGoalIntelligence } from "@/lib/goalIntelligence";

export type InsightTimeframe = "daily" | "weekly" | "monthly";
export type InsightCategory =
  | "anomaly" | "budget" | "savings" | "subscription" | "goal" | "health" | "cashflow";
export type InsightSeverity = "info" | "positive" | "warning" | "critical";

export interface Insight {
  id: string;
  timeframe: InsightTimeframe;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  body: string;
  metric?: string;
  createdAt: string;
}

interface Budget { id: string; category: string; monthly_limit: number; spent_amount: number; month: string; }

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const fmtINR = (n: number) => `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
let _id = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${++_id}`;

function rangeTotals(txs: Tx[], days: number) {
  const cutoff = isoDaysAgo(days);
  const slice = txs.filter(t => t.transaction_date >= cutoff);
  const income = sum(slice.filter(t => t.type === "income").map(t => Number(t.amount || 0)));
  const expenses = sum(slice.filter(t => t.type !== "income").map(t => Number(t.amount || 0)));
  return { income, expenses, net: income - expenses, count: slice.length };
}

function topCategoryDelta(txs: Tx[], days: number) {
  const cur = isoDaysAgo(days);
  const prev = isoDaysAgo(days * 2);
  const totalsAt = (start: string, end?: string) => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type === "income") continue;
      if (t.transaction_date < start) continue;
      if (end && t.transaction_date >= end) continue;
      const c = t.category || "Other";
      map.set(c, (map.get(c) || 0) + Number(t.amount || 0));
    }
    return map;
  };
  const a = totalsAt(cur);
  const b = totalsAt(prev, cur);
  const merged: { cat: string; current: number; previous: number; delta: number; pct: number }[] = [];
  for (const c of new Set([...a.keys(), ...b.keys()])) {
    const ca = a.get(c) || 0;
    const pa = b.get(c) || 0;
    const pct = pa === 0 ? (ca > 0 ? 999 : 0) : ((ca - pa) / pa) * 100;
    merged.push({ cat: c, current: ca, previous: pa, delta: ca - pa, pct });
  }
  return merged.sort((x, y) => y.delta - x.delta);
}

function detectSubscriptions(txs: Tx[]) {
  const buckets = new Map<string, Tx[]>();
  for (const t of txs) {
    if (t.type === "income") continue;
    if (!t.recurring && (t.title || "").length < 3) continue;
    const key = (t.title || "").toLowerCase().trim();
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }
  const out: { name: string; monthly: number; lastSeen: string; count: number }[] = [];
  buckets.forEach((arr, name) => {
    if (arr.length < 2 && !arr[0]?.recurring) return;
    const monthly = sum(arr.map(a => Number(a.amount || 0))) / Math.max(1, arr.length) ;
    const lastSeen = arr.map(a => a.transaction_date).sort().slice(-1)[0];
    out.push({ name, monthly, lastSeen, count: arr.length });
  });
  return out;
}

export function generateInsights(opts: {
  transactions: Tx[];
  goals: Goal[];
  budgets: Budget[];
  monthlyIncome?: number;
}): Insight[] {
  const { transactions, goals, budgets, monthlyIncome = 0 } = opts;
  const out: Insight[] = [];

  // ===== DAILY =====
  const last1 = rangeTotals(transactions, 1);
  const prior7avg = rangeTotals(transactions, 7).expenses / 7;
  if (last1.expenses > 0) {
    if (prior7avg > 0 && last1.expenses > prior7avg * 1.8) {
      out.push({
        id: newId("d"), timeframe: "daily", category: "anomaly", severity: "warning",
        title: "Spending spike detected today",
        body: `Today's spend (${fmtINR(last1.expenses)}) is ${Math.round((last1.expenses / prior7avg - 1) * 100)}% above your 7-day average of ${fmtINR(prior7avg)}.`,
        metric: fmtINR(last1.expenses),
        createdAt: new Date().toISOString(),
      });
    } else if (last1.expenses < prior7avg * 0.4) {
      out.push({
        id: newId("d"), timeframe: "daily", category: "savings", severity: "positive",
        title: "Low spending day",
        body: `You spent only ${fmtINR(last1.expenses)} today — well below your typical ${fmtINR(prior7avg)} daily average.`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ===== WEEKLY =====
  const last7 = rangeTotals(transactions, 7);
  const prev7 = (() => {
    const s = isoDaysAgo(14), e = isoDaysAgo(7);
    const slice = transactions.filter(t => t.transaction_date >= s && t.transaction_date < e);
    return sum(slice.filter(t => t.type !== "income").map(t => Number(t.amount || 0)));
  })();
  if (last7.expenses > 0) {
    const diff = prev7 > 0 ? ((last7.expenses - prev7) / prev7) * 100 : 0;
    if (Math.abs(diff) > 15) {
      out.push({
        id: newId("w"), timeframe: "weekly", category: "cashflow",
        severity: diff > 0 ? "warning" : "positive",
        title: diff > 0 ? "Weekly spend is climbing" : "Weekly spend dropped",
        body: `This week: ${fmtINR(last7.expenses)} vs last week: ${fmtINR(prev7)} (${diff > 0 ? "+" : ""}${Math.round(diff)}%).`,
        metric: `${diff > 0 ? "+" : ""}${Math.round(diff)}%`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  const catShifts = topCategoryDelta(transactions, 7);
  const surged = catShifts.find(c => c.pct >= 50 && c.current >= 500);
  if (surged) {
    out.push({
      id: newId("w"), timeframe: "weekly", category: "anomaly", severity: "warning",
      title: `${surged.cat} surged ${Math.round(surged.pct)}%`,
      body: `${surged.cat} jumped from ${fmtINR(surged.previous)} to ${fmtINR(surged.current)} in the last 7 days. Watch for budget drift.`,
      createdAt: new Date().toISOString(),
    });
  }

  // ===== MONTHLY =====
  const last30 = rangeTotals(transactions, 30);
  const monthRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - last30.expenses) / monthlyIncome) * 100 : 0;
  if (monthlyIncome > 0) {
    if (monthRate >= 30) {
      out.push({
        id: newId("m"), timeframe: "monthly", category: "savings", severity: "positive",
        title: `Strong ${Math.round(monthRate)}% savings rate`,
        body: `You're saving ${fmtINR(monthlyIncome - last30.expenses)} this month — well above the 20% target.`,
        metric: `${Math.round(monthRate)}%`,
        createdAt: new Date().toISOString(),
      });
    } else if (monthRate < 10) {
      out.push({
        id: newId("m"), timeframe: "monthly", category: "savings", severity: "warning",
        title: `Savings rate slipped to ${Math.round(monthRate)}%`,
        body: `Expenses (${fmtINR(last30.expenses)}) are consuming most of your ${fmtINR(monthlyIncome)} income. Aim for 20%+.`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Budget drift
  for (const b of budgets) {
    const ratio = Number(b.monthly_limit || 0) > 0 ? Number(b.spent_amount || 0) / Number(b.monthly_limit || 1) : 0;
    if (ratio >= 1) {
      out.push({
        id: newId("b"), timeframe: "monthly", category: "budget", severity: "critical",
        title: `${b.category} budget breached`,
        body: `You're at ${Math.round(ratio * 100)}% of your ${fmtINR(b.monthly_limit)} ${b.category} budget. Pause discretionary spend in this category.`,
        createdAt: new Date().toISOString(),
      });
    } else if (ratio >= 0.85) {
      out.push({
        id: newId("b"), timeframe: "weekly", category: "budget", severity: "warning",
        title: `${b.category} budget near limit`,
        body: `Spent ${fmtINR(b.spent_amount)} of ${fmtINR(b.monthly_limit)} (${Math.round(ratio * 100)}%) for ${b.category}.`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Subscriptions
  const subs = detectSubscriptions(transactions.filter(t => t.transaction_date >= isoDaysAgo(90)));
  const subTotal = sum(subs.map(s => s.monthly));
  if (subs.length >= 4 || subTotal > 2000) {
    out.push({
      id: newId("s"), timeframe: "monthly", category: "subscription", severity: "info",
      title: `${subs.length} recurring charges (~${fmtINR(subTotal)}/mo)`,
      body: `Audit your subscriptions — top: ${subs.slice(0, 3).map(s => s.name).join(", ") || "—"}. Cancelling one unused service saves ${fmtINR(subTotal / Math.max(1, subs.length))}/mo.`,
      createdAt: new Date().toISOString(),
    });
  }
  const stale = subs.filter(s => s.lastSeen < isoDaysAgo(45));
  if (stale.length) {
    out.push({
      id: newId("s"), timeframe: "monthly", category: "subscription", severity: "warning",
      title: `${stale.length} possibly unused subscription${stale.length > 1 ? "s" : ""}`,
      body: `${stale.slice(0, 3).map(s => s.name).join(", ")} hasn't charged in 45+ days — confirm whether it's still active.`,
      createdAt: new Date().toISOString(),
    });
  }

  // Goal risks
  const goalIntel = computeGoalIntelligence({ transactions, goals });
  for (const gi of goalIntel) {
    if (gi.status === "off_track" || gi.status === "stalled") {
      out.push({
        id: newId("g"), timeframe: "monthly", category: "goal", severity: "critical",
        title: `Goal "${gi.name}" is ${gi.status === "stalled" ? "stalled" : "off track"}`,
        body: gi.warnings[0] || `Risk score ${gi.riskScore}/100 with ${Math.round(gi.successProbability * 100)}% success probability.`,
        createdAt: new Date().toISOString(),
      });
    } else if (gi.status === "at_risk") {
      out.push({
        id: newId("g"), timeframe: "weekly", category: "goal", severity: "warning",
        title: `"${gi.name}" needs attention`,
        body: gi.accelerations[0] || `Boost contributions to lower risk score from ${gi.riskScore}.`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Health
  try {
    const hs = computeFinancialHealth({ transactions, goals, budgets, monthlyIncome });
    if (hs && hs.score < 50) {
      out.push({
        id: newId("h"), timeframe: "monthly", category: "health", severity: "warning",
        title: `Financial health at ${hs.score}/100 (Grade ${hs.grade})`,
        body: `Focus on the weakest pillar to lift your score. Top opportunity: ${hs.recommendations?.[0] || "increase savings rate"}.`,
        createdAt: new Date().toISOString(),
      });
    } else if (hs && hs.score >= 80) {
      out.push({
        id: newId("h"), timeframe: "monthly", category: "health", severity: "positive",
        title: `Excellent financial health (${hs.score}/100)`,
        body: `You're in the top tier — keep automating savings and reviewing subscriptions monthly.`,
        createdAt: new Date().toISOString(),
      });
    }
  } catch { /* health module optional */ }

  // Sort: critical → warning → info → positive within timeframe
  const sevRank: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  const tfRank: Record<InsightTimeframe, number> = { daily: 0, weekly: 1, monthly: 2 };
  return out.sort((a, b) =>
    tfRank[a.timeframe] - tfRank[b.timeframe] || sevRank[a.severity] - sevRank[b.severity]
  );
}
