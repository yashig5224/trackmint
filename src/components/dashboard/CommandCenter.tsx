// Phase 3 — Dashboard Command Center
// All widgets are derived from live Supabase data passed in via props.
// No placeholders, no hardcoded financial values.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Receipt, Target, Flame,
  AlertTriangle, Sparkles, Brain, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { getCategoryIcon } from "@/assets/icons";
import HealthScoreWidget from "./HealthScoreWidget";
import ForecastWidget from "./ForecastWidget";

export interface Tx {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string | null;
  recurring?: boolean | null;
  transaction_date: string;
}

export interface Goal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
  created_at?: string;
}

export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  spent_amount: number;
  month: string;
}

interface Props {
  transactions: Tx[];
  goals: Goal[];
  budgets: Budget[];
  currency?: string;
  monthlyIncome?: number;
}

const fmt = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Math.round(n));

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Shopping: "#ec4899", Travel: "#3b82f6", Bills: "#8b5cf6",
  Entertainment: "#06b6d4", Health: "#10b981", Education: "#6366f1",
  Salary: "#22c55e", Investment: "#0ea5e9", Other: "#94a3b8",
};
const colorFor = (name: string) => CATEGORY_COLORS[name] || `hsl(${(name.length * 47) % 360}, 70%, 55%)`;

const SectionCard: React.FC<React.PropsWithChildren<{ title: string; subtitle?: string; right?: React.ReactNode; className?: string }>> = ({
  title, subtitle, right, children, className = "",
}) => (
  <div className={`bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}>
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h3 className="font-display text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

// ─── CashFlow Center ────────────────────────────────────────────────────────
type Range = "week" | "month" | "quarter" | "year";

function CashflowCenter({ transactions, currency }: { transactions: Tx[]; currency: string }) {
  const [range, setRange] = useState<Range>("month");

  const series = useMemo(() => {
    const now = new Date();
    let buckets: { key: string; label: string; start: Date; end: Date }[] = [];

    if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en", { weekday: "short" }), start: d, end });
      }
    } else if (range === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        buckets.push({ key: d.toISOString().slice(0, 10), label: d.getDate().toString(), start: d, end });
      }
    } else if (range === "quarter") {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i * 7 - start.getDay());
        const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
        buckets.push({ key: `W${start.toISOString().slice(0,10)}`, label: `W${Math.ceil((start.getDate())/7)}`, start, end });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        buckets.push({ key: `${start.getFullYear()}-${start.getMonth()}`, label: start.toLocaleDateString("en", { month: "short" }), start, end });
      }
    }

    return buckets.map(b => {
      let income = 0, expense = 0;
      for (const t of transactions) {
        const d = new Date(t.transaction_date);
        if (d >= b.start && d <= b.end) {
          if (t.type === "income") income += Number(t.amount);
          else expense += Number(t.amount);
        }
      }
      return { name: b.label, income, expense, net: income - expense };
    });
  }, [transactions, range]);

  const totals = useMemo(() => series.reduce(
    (a, b) => ({ income: a.income + b.income, expense: a.expense + b.expense, net: a.net + b.net }),
    { income: 0, expense: 0, net: 0 },
  ), [series]);

  const ranges: { id: Range; label: string }[] = [
    { id: "week", label: "Weekly" }, { id: "month", label: "Monthly" },
    { id: "quarter", label: "Quarterly" }, { id: "year", label: "Yearly" },
  ];

  return (
    <SectionCard
      title="Cashflow Center"
      subtitle="Real-time flow across your accounts"
      right={
        <div className="flex bg-gray-50 rounded-full p-0.5 border border-gray-100">
          {ranges.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all ${
                range === r.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >{r.label}</button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100/70 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Income</p>
          <p className="font-display text-lg font-bold text-gray-900 mt-0.5">{fmt(totals.income, currency)}</p>
        </div>
        <div className="rounded-2xl bg-rose-50/50 border border-rose-100/70 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700">Expenses</p>
          <p className="font-display text-lg font-bold text-gray-900 mt-0.5">{fmt(totals.expense, currency)}</p>
        </div>
        <div className={`rounded-2xl p-3 border ${totals.net >= 0 ? "bg-blue-50/50 border-blue-100/70" : "bg-amber-50/50 border-amber-100/70"}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold ${totals.net >= 0 ? "text-blue-700" : "text-amber-700"}`}>Net</p>
          <p className="font-display text-lg font-bold text-gray-900 mt-0.5">{fmt(totals.net, currency)}</p>
        </div>
      </div>

      <div className="h-60">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="cf-inc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
              <linearGradient id="cf-exp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }} formatter={(v: any) => fmt(Number(v), currency)} />
            <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#cf-inc)" strokeWidth={2} />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#cf-exp)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// ─── Recent Transactions ────────────────────────────────────────────────────
function RecentTransactions({ transactions, currency }: { transactions: Tx[]; currency: string }) {
  const recent = transactions.slice(0, 6);
  return (
    <SectionCard title="Recent Transactions" subtitle={`Last ${recent.length} entries`}>
      {recent.length === 0 ? (
        <div className="text-center py-8">
          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map(t => (
            <motion.div
              key={t.id}
              layout
              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={getCategoryIcon(t.category)} alt="" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{t.title}</p>
                <p className="text-[11px] text-gray-400">{t.category || "Uncategorized"} • {new Date(t.transaction_date).toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
              </div>
              <p className={`font-display font-bold text-sm ${t.type === "income" ? "text-emerald-600" : "text-gray-900"}`}>
                {t.type === "income" ? "+" : "-"}{fmt(Number(t.amount), currency)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Goals Dashboard ────────────────────────────────────────────────────────
function GoalsDashboard({ goals, transactions, currency }: { goals: Goal[]; transactions: Tx[]; currency: string }) {
  // Estimate monthly net savings to predict goal completion
  const monthlyNet = useMemo(() => {
    const now = Date.now();
    const since = now - 30 * 86400_000;
    let inc = 0, exp = 0;
    for (const t of transactions) {
      const ts = new Date(t.transaction_date).getTime();
      if (ts >= since) {
        if (t.type === "income") inc += Number(t.amount);
        else exp += Number(t.amount);
      }
    }
    return Math.max(0, inc - exp);
  }, [transactions]);

  return (
    <SectionCard
      title="Goals Dashboard"
      subtitle={`${goals.length} active goal${goals.length === 1 ? "" : "s"}`}
    >
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No goals yet. Set one to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.slice(0, 4).map(g => {
            const target = Number(g.target_amount);
            const current = Number(g.current_amount);
            const remaining = Math.max(0, target - current);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            // Predict completion based on monthly net savings (proportional share)
            const monthlyShare = goals.length > 0 ? monthlyNet / goals.length : 0;
            const monthsLeft = monthlyShare > 0 ? remaining / monthlyShare : Infinity;
            const prediction =
              remaining === 0 ? "Completed 🎉" :
              !isFinite(monthsLeft) ? "Add savings to forecast" :
              monthsLeft <= 1 ? "On track to finish this month" :
              `~${Math.ceil(monthsLeft)} months at current pace`;

            return (
              <div key={g.id}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="font-semibold text-sm text-gray-900">{g.goal_name}</p>
                  <p className="text-xs text-gray-400">{pct}%</p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">{fmt(current, currency)} / {fmt(target, currency)} · {fmt(remaining, currency)} to go</span>
                  <span className="text-blue-600 font-semibold">{prediction}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Category Analytics (Pie + Bar) ─────────────────────────────────────────
function CategoryAnalytics({ transactions, currency }: { transactions: Tx[]; currency: string }) {
  const [view, setView] = useState<"pie" | "bar">("pie");

  const { current, prior } = useMemo(() => {
    const cur: Record<string, number> = {};
    const prv: Record<string, number> = {};
    const now = Date.now();
    const thirty = now - 30 * 86400_000;
    const sixty = now - 60 * 86400_000;
    for (const t of transactions) {
      if (t.type === "income") continue;
      const ts = new Date(t.transaction_date).getTime();
      const cat = t.category || "Other";
      if (ts >= thirty) cur[cat] = (cur[cat] || 0) + Number(t.amount);
      else if (ts >= sixty) prv[cat] = (prv[cat] || 0) + Number(t.amount);
    }
    return { current: cur, prior: prv };
  }, [transactions]);

  const data = useMemo(() => Object.entries(current)
    .map(([name, value]) => ({
      name, value,
      prev: prior[name] || 0,
      growth: prior[name] ? Math.round(((value - prior[name]) / prior[name]) * 100) : null,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6), [current, prior]);

  return (
    <SectionCard
      title="Category Analytics"
      subtitle="Top categories · 30-day trend"
      right={
        <div className="flex bg-gray-50 rounded-full p-0.5 border border-gray-100">
          {(["pie", "bar"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all capitalize ${
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>{v}</button>
          ))}
        </div>
      }
    >
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Add expenses to unlock analytics.</p>
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer>
              {view === "pie" ? (
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {data.map((c, i) => <Cell key={i} fill={colorFor(c.name)} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }} formatter={(v: any) => fmt(Number(v), currency)} />
                </PieChart>
              ) : (
                <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }} formatter={(v: any) => fmt(Number(v), currency)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.map((c, i) => <Cell key={i} fill={colorFor(c.name)} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-1.5">
            {data.slice(0, 4).map(c => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorFor(c.name) }} />
                  <span className="font-semibold text-gray-700">{c.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{fmt(c.value, currency)}</span>
                  {c.growth !== null && (
                    <span className={`flex items-center gap-0.5 font-semibold ${c.growth > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                      {c.growth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(c.growth)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ─── Spending Heatmap ───────────────────────────────────────────────────────
function SpendingHeatmap({ transactions, currency }: { transactions: Tx[]; currency: string }) {
  const [days, setDays] = useState<30 | 90 | 365>(90);

  const cells = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "income") continue;
      map[t.transaction_date] = (map[t.transaction_date] || 0) + Number(t.amount);
    }
    const out: { date: string; amount: number }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, amount: map[key] || 0 });
    }
    return out;
  }, [transactions, days]);

  const max = Math.max(...cells.map(c => c.amount), 1);
  const intensity = (a: number) => {
    if (!a) return "bg-gray-100";
    const r = a / max;
    if (r > 0.75) return "bg-rose-500";
    if (r > 0.5) return "bg-orange-400";
    if (r > 0.25) return "bg-amber-300";
    return "bg-emerald-300";
  };

  // grid columns by weeks; rows are weekdays
  const cols = Math.ceil(cells.length / 7);

  return (
    <SectionCard
      title="Spending Heatmap"
      subtitle="Daily expense intensity"
      right={
        <div className="flex bg-gray-50 rounded-full p-0.5 border border-gray-100">
          {([30, 90, 365] as const).map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all ${
                days === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>{d === 365 ? "1Y" : `${d}D`}</button>
          ))}
        </div>
      }
    >
      <div
        className="grid gap-1 overflow-x-auto"
        style={{ gridTemplateRows: "repeat(7, 1fr)", gridAutoFlow: "column", gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cells.map(c => (
          <div
            key={c.date}
            title={`${c.date} · ${fmt(c.amount, currency)}`}
            className={`rounded-[3px] aspect-square min-w-[8px] ${intensity(c.amount)} transition-transform hover:scale-125`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 text-[10px] text-gray-400">
        <span>Low</span>
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-100" />
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300" />
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
        </div>
        <span>High</span>
      </div>
    </SectionCard>
  );
}

// ─── AI Intelligence Panel ──────────────────────────────────────────────────
interface Insight {
  type: "alert" | "warning" | "tip" | "prediction";
  title: string;
  body: string;
}

function buildInsights({ transactions, goals, budgets, monthlyIncome, currency }: {
  transactions: Tx[]; goals: Goal[]; budgets: Budget[]; monthlyIncome: number; currency: string;
}): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();
  const since30 = now - 30 * 86400_000;
  const since60 = now - 60 * 86400_000;

  const cur: Record<string, number> = {};
  const prv: Record<string, number> = {};
  let inc30 = 0, exp30 = 0;
  for (const t of transactions) {
    const ts = new Date(t.transaction_date).getTime();
    const amt = Number(t.amount);
    if (t.type !== "income") {
      const cat = t.category || "Other";
      if (ts >= since30) { cur[cat] = (cur[cat] || 0) + amt; exp30 += amt; }
      else if (ts >= since60) prv[cat] = (prv[cat] || 0) + amt;
    } else if (ts >= since30) inc30 += amt;
  }

  // 1. Overspending alerts (category 30d vs prior 30d)
  for (const [cat, val] of Object.entries(cur)) {
    const prev = prv[cat] || 0;
    if (prev > 0 && val > prev * 1.5 && val > 1000) {
      const overshoot = val - prev;
      insights.push({
        type: "alert",
        title: `Overspending in ${cat}`,
        body: `You spent ${fmt(val, currency)} on ${cat} — ${Math.round(((val - prev) / prev) * 100)}% above last month. Trim ${fmt(overshoot * 0.4, currency)} to rebalance.`,
      });
    }
  }

  // 2. Budget warnings
  for (const b of budgets) {
    const limit = Number(b.monthly_limit);
    const spent = Number(b.spent_amount);
    if (limit > 0) {
      const usage = (spent / limit) * 100;
      if (usage >= 100) insights.push({ type: "alert", title: `${b.category} budget exceeded`, body: `${fmt(spent, currency)} of ${fmt(limit, currency)} used (${Math.round(usage)}%). Consider pausing discretionary ${b.category} for the rest of this month.` });
      else if (usage >= 80) insights.push({ type: "warning", title: `${b.category} budget at ${Math.round(usage)}%`, body: `Only ${fmt(limit - spent, currency)} left in your ${b.category} budget.` });
    }
  }

  // 3. Saving opportunities (subscriptions)
  const recurring = transactions.filter(t => t.recurring && t.type !== "income");
  if (recurring.length > 0) {
    const monthly = recurring.reduce((s, t) => s + Number(t.amount), 0);
    insights.push({
      type: "tip",
      title: `Subscription radar`,
      body: `You have ${recurring.length} recurring expenses totaling ${fmt(monthly, currency)}/mo. Auditing 1-2 unused ones could save ${fmt(monthly * 0.25, currency)}/mo.`,
    });
  }

  // 4. Goal recommendations + predictions
  const netMonthly = Math.max(0, inc30 - exp30);
  for (const g of goals.slice(0, 2)) {
    const target = Number(g.target_amount), current = Number(g.current_amount);
    const remaining = target - current;
    if (remaining <= 0) continue;
    const monthlyShare = goals.length > 0 ? netMonthly / goals.length : 0;
    if (monthlyShare > 0) {
      const monthsLeft = Math.ceil(remaining / monthlyShare);
      // If deadline exists, compare to predicted
      if (g.deadline) {
        const dl = new Date(g.deadline).getTime();
        const monthsUntilDeadline = Math.max(0, (dl - now) / (30 * 86400_000));
        const diff = Math.round(monthsUntilDeadline - monthsLeft);
        if (diff > 1) {
          insights.push({ type: "prediction", title: `${g.goal_name} ahead of schedule`, body: `At ${fmt(monthlyShare, currency)}/mo you'll finish ~${diff * 30} days earlier than your deadline.` });
        } else if (diff < -1) {
          insights.push({ type: "warning", title: `${g.goal_name} behind schedule`, body: `Push ${fmt(remaining / Math.max(1, monthsUntilDeadline) - monthlyShare, currency)}/mo more to hit the deadline.` });
        }
      } else {
        insights.push({ type: "prediction", title: `${g.goal_name} forecast`, body: `Hit ${fmt(target, currency)} in ~${monthsLeft} month${monthsLeft === 1 ? "" : "s"} at your current savings pace.` });
      }
    }
  }

  // 5. Health / savings rate
  if (monthlyIncome > 0) {
    const rate = ((monthlyIncome - exp30) / monthlyIncome) * 100;
    if (rate < 10) insights.push({ type: "warning", title: "Savings rate low", body: `Only ${rate.toFixed(0)}% of income saved this month. Aim for 20%+ — try auto-saving ${fmt(monthlyIncome * 0.1, currency)}.` });
    else if (rate >= 30) insights.push({ type: "tip", title: `Saving ${rate.toFixed(0)}% — elite tier`, body: `You're saving ${fmt(monthlyIncome - exp30, currency)} this month. Consider deploying it into an index SIP.` });
  }

  // Fallback
  if (insights.length === 0) {
    insights.push({ type: "tip", title: "Add more data", body: "Log a few transactions and set a goal — I'll surface tailored insights here." });
  }

  return insights.slice(0, 6);
}

function AIIntelligencePanel(props: { transactions: Tx[]; goals: Goal[]; budgets: Budget[]; monthlyIncome: number; currency: string }) {
  const insights = useMemo(() => buildInsights(props), [props]);

  const styleFor = (t: Insight["type"]) => {
    switch (t) {
      case "alert":      return { ring: "ring-rose-200", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50/60" };
      case "warning":    return { ring: "ring-amber-200", icon: Flame, color: "text-amber-600", bg: "bg-amber-50/60" };
      case "prediction": return { ring: "ring-blue-200", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50/60" };
      default:           return { ring: "ring-emerald-200", icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-50/60" };
    }
  };

  return (
    <SectionCard
      title="AI Intelligence"
      subtitle="Predictions, alerts & opportunities"
      right={<div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 text-[10px] font-bold text-blue-700"><Brain className="w-3 h-3" /> LIVE</div>}
      className="bg-gradient-to-br from-white via-white to-blue-50/30"
    >
      <div className="space-y-2.5">
        {insights.map((ins, i) => {
          const s = styleFor(ins.type);
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex gap-3 p-3 rounded-2xl ring-1 ${s.ring} ${s.bg}`}
            >
              <div className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{ins.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{ins.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Composed Command Center ────────────────────────────────────────────────
const CommandCenter: React.FC<Props> = ({ transactions, goals, budgets, currency = "INR", monthlyIncome = 0 }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CashflowCenter transactions={transactions} currency={currency} />
        </div>
        <RecentTransactions transactions={transactions} currency={currency} />
      </div>

      {/* Phase 4 + Phase 5 — Health Score & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HealthScoreWidget transactions={transactions} goals={goals} budgets={budgets} />
        <ForecastWidget transactions={transactions} goals={goals} currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryAnalytics transactions={transactions} currency={currency} />
        <GoalsDashboard goals={goals} transactions={transactions} currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SpendingHeatmap transactions={transactions} currency={currency} />
        </div>
        <AIIntelligencePanel
          transactions={transactions} goals={goals} budgets={budgets}
          monthlyIncome={monthlyIncome} currency={currency}
        />
      </div>
    </div>
  );
};

export default CommandCenter;
