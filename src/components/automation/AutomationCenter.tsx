// AI Financial Operations Center
// FinTrack AI auto-monitors and optimizes the user's finances.
// All modules are derived from real Supabase data — no IF/THEN builder.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Activity, Wallet, Target, Repeat, CalendarDays, ShieldAlert,
  FileText, HeartPulse, Bot, Loader2, CheckCircle2, X, TrendingUp,
  TrendingDown, AlertTriangle, ArrowRight, PlayCircle, Crown, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeHealthScore, type HealthScore } from "@/lib/financialHealth";
import { computeForecast, type Forecast } from "@/lib/forecastEngine";
import { exportReport } from "@/lib/pdfExport";
import { createNotification } from "@/lib/notifications";

/* ───────────────────── types ───────────────────── */
interface Tx {
  id: string; title: string; amount: number; type: string;
  category: string | null; transaction_date: string; recurring?: boolean | null;
  payment_method?: string | null;
}
interface Goal { id: string; goal_name: string; target_amount: number; current_amount: number; deadline: string | null; category: string | null }
interface Budget { id: string; category: string; monthly_limit: number; spent_amount: number; month: string }

interface Props {
  transactions: Tx[];
  goals: Goal[];
  budgets: Budget[];
  income: number;
  expenses: number;
  monthlyIncome: number;
  currency: string;
  userName: string;
  tier: "free" | "pro" | "elite";
  onUpgrade: () => void;
  onCreateGoal?: (name: string, amount: number) => void;
  onGoalContribute?: (id: string, amount: number) => Promise<void> | void;
}

type ActionRecord = {
  id: string; user_id: string; rule_name: string; trigger_reason: string;
  action_taken: string; result: string; severity: string;
  amount_saved: number | null; metadata: Record<string, unknown>; created_at: string;
};

type Module =
  | "copilot" | "budget" | "goals" | "subscriptions"
  | "bills" | "guard" | "reviews" | "health" | "feed";

const fmt = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const txIn = (txs: Tx[], days: number) => txs.filter(t => t.transaction_date >= isoDaysAgo(days));

/* ───────────────────── main shell ───────────────────── */
export const AutomationCenter = ({
  transactions, goals, budgets, income, expenses, monthlyIncome,
  currency, userName, tier, onUpgrade, onCreateGoal, onGoalContribute,
}: Props) => {
  const { user } = useAuth();
  const [mod, setMod] = useState<Module>("copilot");
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const health: HealthScore = useMemo(
    () => computeHealthScore({ transactions, goals, budgets }),
    [transactions, goals, budgets]
  );
  const forecast: Forecast = useMemo(
    () => computeForecast({ transactions, goals }),
    [transactions, goals]
  );

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("automation_logs").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(100);
    if (data) setActions(data as ActionRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  if (tier === "free") return <UpgradePrompt onUpgrade={onUpgrade} />;

  /* ───── Copilot recommendations (derived) ───── */
  const recs = useMemo(
    () => buildRecommendations({ transactions, goals, budgets, monthlyIncome, currency, health, forecast }),
    [transactions, goals, budgets, monthlyIncome, currency, health, forecast]
  );

  const logAction = async (rec: Recommendation, result: "accepted" | "dismissed" | "info" = "info") => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      rule_id: null,
      rule_name: rec.title,
      trigger_reason: rec.reason,
      action_taken: rec.action,
      result,
      severity: rec.severity,
      amount_saved: rec.impact ?? 0,
      metadata: { module: rec.module, key: rec.key } as never,
    };
    const { data } = await supabase.from("automation_logs").insert(payload).select().single();
    if (data) setActions(prev => [data as ActionRecord, ...prev]);
  };

  const runCopilotScan = async () => {
    if (!user) return;
    setRunning(true);
    try {
      let n = 0;
      for (const r of recs.filter(x => x.severity === "critical" || x.severity === "warn")) {
        const dedupeKey = `copilot-${r.key}`;
        const created = await createNotification({
          userId: user.id, type: "ai_insight",
          title: r.title, message: r.reason,
          severity: r.severity === "critical" ? "critical" : "warning",
          dedupeKey, metadata: { module: r.module, impact: r.impact },
        });
        if (created) n++;
      }
      await reload();
      toast.success(n ? `${n} insight${n > 1 ? "s" : ""} pushed to notifications` : "All clear — no new alerts");
    } catch (e) { toast.error((e as Error).message); }
    finally { setRunning(false); }
  };

  const acceptBudget = async (category: string, suggested: number) => {
    if (!user) return;
    const existing = budgets.find(b => b.category === category);
    const monthKey = new Date().toISOString().slice(0, 10).replace(/-\d{2}$/, "-01");
    if (existing) {
      await supabase.from("budgets").update({ monthly_limit: suggested }).eq("id", existing.id);
    } else {
      await supabase.from("budgets").insert({
        user_id: user.id, category, monthly_limit: suggested, spent_amount: 0, month: monthKey,
      });
    }
    toast.success(`Budget for ${category} set to ${fmt(suggested, currency)}`);
  };

  const acceptGoalTransfer = async (goalId: string, amount: number) => {
    if (!onGoalContribute) return;
    await onGoalContribute(goalId, amount);
    toast.success(`Allocated ${fmt(amount, currency)} toward goal`);
  };

  const generateWeeklyReview = async () => {
    if (!user) return;
    setRunning(true);
    try {
      const week = txIn(transactions, 7);
      const wIncome = week.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const wExp = week.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const top = topCategory(week);
      const note = `Weekly review: income ${fmt(wIncome, currency)}, expenses ${fmt(wExp, currency)}, top category ${top?.name || "—"} ${top ? fmt(top.value, currency) : ""}. Health ${health.score}/100 (${health.grade}).`;
      await supabase.from("ai_history").insert({
        user_id: user.id, persona: "weekly_review", message: "Generate weekly review", ai_response: note,
      });
      await createNotification({
        userId: user.id, type: "ai_insight", title: "Weekly AI Review ready",
        message: note, severity: "info", dedupeKey: `weekly-${isoDaysAgo(0)}`,
      });
      toast.success("Weekly review generated");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setRunning(false); }
  };

  const generateMonthlyClose = async () => {
    if (!user) return;
    setRunning(true);
    try {
      const stats = { income, expenses, balance: income - expenses, savings: monthlyIncome - expenses, savingsRate: monthlyIncome > 0 ? Math.round(((monthlyIncome - expenses) / monthlyIncome) * 100) : 0 };
      const categoryData = Object.entries(transactions.filter(t => t.type === "expense").reduce<Record<string, number>>((m, t) => { const c = t.category || "Other"; m[c] = (m[c] || 0) + Number(t.amount); return m; }, {})).map(([name, value]) => ({ name, value }));
      const trendData = (() => {
        const days: { name: string; income: number; expense: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const k = d.toISOString().slice(0, 10);
          const day = transactions.filter(t => t.transaction_date === k);
          days.push({ name: d.toLocaleDateString("en", { weekday: "short" }),
            income: day.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
            expense: day.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) });
        }
        return days;
      })();
      await exportReport({
        kind: "monthly", userName, userId: user.id, currency, monthlyIncome,
        transactions, goals, budgets, stats, categoryData, trendData, tier,
      });
      toast.success("Monthly Financial Close PDF generated");
    } catch (e) { toast.error((e as Error).message); }
    finally { setRunning(false); }
  };

  /* ───── render ───── */
  const modules: { id: Module; label: string; icon: typeof Bot; tone: string }[] = [
    { id: "copilot", label: "AI Copilot", icon: Bot, tone: "from-violet-500 to-fuchsia-500" },
    { id: "budget", label: "Budget Optimizer", icon: Wallet, tone: "from-emerald-500 to-teal-500" },
    { id: "goals", label: "Goal Accelerator", icon: Target, tone: "from-amber-500 to-orange-500" },
    { id: "subscriptions", label: "Subscriptions", icon: Repeat, tone: "from-pink-500 to-rose-500" },
    { id: "bills", label: "Bill Predictor", icon: CalendarDays, tone: "from-sky-500 to-blue-500" },
    { id: "guard", label: "Spending Guard", icon: ShieldAlert, tone: "from-rose-500 to-red-500" },
    { id: "health", label: "Health Monitor", icon: HeartPulse, tone: "from-indigo-500 to-violet-500" },
    { id: "reviews", label: "Reviews & Close", icon: FileText, tone: "from-cyan-500 to-blue-500" },
    { id: "feed", label: "AI Actions Feed", icon: Activity, tone: "from-gray-700 to-gray-900" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Financial Operations Center
          </h2>
          <p className="text-xs text-gray-500 mt-1">Lumo monitors and optimizes your finances 24/7.</p>
        </div>
        <button
          onClick={runCopilotScan}
          disabled={running}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 disabled:opacity-60"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          {running ? "Scanning…" : "Run Copilot Scan"}
        </button>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Health Score" value={`${health.score}`} sub={health.grade} tone="from-indigo-500 to-violet-500" icon={HeartPulse} />
        <KpiCard label="AI Insights" value={recs.length.toString()} sub={`${recs.filter(r => r.severity !== "info").length} need attention`} tone="from-violet-500 to-fuchsia-500" icon={Sparkles} />
        <KpiCard label="Projected Save (30d)" value={fmt(totalImpact(recs), currency)} sub="if all accepted" tone="from-emerald-500 to-teal-500" icon={TrendingUp} />
        <KpiCard label="Subs Burn / mo" value={fmt(forecast.subscriptionCost.value, currency)} sub={`${forecast.subscriptionCost.count} active`} tone="from-pink-500 to-rose-500" icon={Repeat} />
      </div>

      {/* Module nav */}
      <nav className="flex flex-wrap gap-1.5 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
        {modules.map(({ id, label, icon: Icon }) => (
          <button
            key={id} onClick={() => setMod(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
              mod === id ? "bg-gray-900 text-white shadow" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={mod} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {mod === "copilot" && (
            <CopilotPanel recs={recs} currency={currency} onAccept={async (r) => {
              if (r.type === "budget" && r.budgetCategory && r.budgetSuggested) {
                await acceptBudget(r.budgetCategory, r.budgetSuggested);
              } else if (r.type === "goal_transfer" && r.goalId && r.impact) {
                await acceptGoalTransfer(r.goalId, r.impact);
              } else if (r.type === "create_goal" && onCreateGoal && r.goalName && r.goalTarget) {
                onCreateGoal(r.goalName, r.goalTarget);
              }
              await logAction(r, "accepted");
              toast.success("Action accepted");
            }} onDismiss={(r) => logAction(r, "dismissed")} />
          )}
          {mod === "budget" && <BudgetOptimizer recs={recs.filter(r => r.module === "budget")} currency={currency} onAccept={async (r) => { if (r.budgetCategory && r.budgetSuggested) { await acceptBudget(r.budgetCategory, r.budgetSuggested); await logAction(r, "accepted"); } }} />}
          {mod === "goals" && <GoalAccelerator recs={recs.filter(r => r.module === "goals")} currency={currency} onAccept={async (r) => { if (r.goalId && r.impact) { await acceptGoalTransfer(r.goalId, r.impact); await logAction(r, "accepted"); } }} forecast={forecast} />}
          {mod === "subscriptions" && <SubscriptionsPanel transactions={transactions} currency={currency} onCancel={async (title, amount) => { await logAction({ key: `cancel-${title}`, module: "subscriptions", title: `Cancel ${title}`, reason: `Unused or low-value recurring charge`, action: `Marked ${title} for cancellation`, severity: "info", type: "info", impact: amount * 12 }, "accepted"); toast.success("Marked for cancellation"); }} />}
          {mod === "bills" && <BillPredictor transactions={transactions} currency={currency} />}
          {mod === "guard" && <SpendingGuard transactions={transactions} budgets={budgets} currency={currency} />}
          {mod === "reviews" && <ReviewsPanel onWeekly={generateWeeklyReview} onMonthly={generateMonthlyClose} running={running} actions={actions} currency={currency} />}
          {mod === "health" && <HealthMonitorPanel health={health} />}
          {mod === "feed" && <ActionsFeed actions={actions} loading={loading} currency={currency} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ───────────────────── Upgrade prompt ───────────────────── */
const UpgradePrompt = ({ onUpgrade }: { onUpgrade: () => void }) => (
  <div className="rounded-3xl p-8 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 border border-violet-100 text-center">
    <Crown className="w-10 h-10 mx-auto text-violet-500" />
    <h2 className="font-display text-xl font-bold text-gray-900 mt-3">AI Operations Center is Pro</h2>
    <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">Upgrade to let Lumo continuously monitor and optimize your finances.</p>
    <button onClick={onUpgrade} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow-lg">
      <Zap className="w-4 h-4" /> Upgrade to Pro
    </button>
  </div>
);

/* ───────────────────── small UI ───────────────────── */
const KpiCard = ({ label, value, sub, tone, icon: Icon }: { label: string; value: string; sub: string; tone: string; icon: typeof Bot }) => (
  <div className="relative rounded-2xl p-4 bg-white border border-gray-100 shadow-sm overflow-hidden">
    <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${tone} opacity-10 blur-2xl`} />
    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center text-white`}><Icon className="w-4 h-4" /></div>
    <p className="text-xl font-display font-bold text-gray-900 mt-3">{value}</p>
    <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    <p className="text-[10px] text-gray-400">{sub}</p>
  </div>
);

const SeverityBadge = ({ s }: { s: string }) => {
  const tone = s === "critical" ? "bg-rose-50 text-rose-700 border-rose-100"
    : s === "warn" || s === "warning" ? "bg-amber-50 text-amber-700 border-amber-100"
    : s === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-gray-50 text-gray-700 border-gray-100";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tone}`}>{s.toUpperCase()}</span>;
};

/* ───────────────────── Copilot Panel ───────────────────── */
const CopilotPanel = ({ recs, currency, onAccept, onDismiss }: {
  recs: Recommendation[]; currency: string;
  onAccept: (r: Recommendation) => void; onDismiss: (r: Recommendation) => void;
}) => {
  if (recs.length === 0) return <EmptyState icon={Bot} title="All clear" subtitle="Lumo found no actionable insights from your latest activity." />;
  return (
    <div className="space-y-3">
      {recs.map(r => (
        <div key={r.key} className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <SeverityBadge s={r.severity} />
              <span className="text-[10px] font-semibold text-gray-400 uppercase">{r.module}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
            <p className="text-xs text-gray-600 mt-1">{r.reason}</p>
            <p className="text-[11px] text-gray-500 mt-1.5"><span className="font-semibold text-violet-600">Suggested:</span> {r.action}</p>
            {r.impact ? <p className="text-[11px] text-emerald-700 font-semibold mt-1">Impact: {fmt(r.impact, currency)} {r.impactNote || ""}</p> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onDismiss(r)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Dismiss</button>
            <button onClick={() => onAccept(r)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ───────────────────── Budget Optimizer ───────────────────── */
const BudgetOptimizer = ({ recs, currency, onAccept }: { recs: Recommendation[]; currency: string; onAccept: (r: Recommendation) => void }) => {
  if (recs.length === 0) return <EmptyState icon={Wallet} title="Budgets look right-sized" subtitle="No category needs an adjustment based on the last 90 days." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {recs.map(r => (
        <div key={r.key} className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Budget · {r.budgetCategory}</p>
          <p className="font-semibold text-gray-900 mt-1">{r.title}</p>
          <p className="text-xs text-gray-600 mt-1">{r.reason}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-display font-bold text-gray-900">{fmt(r.budgetSuggested || 0, currency)}</p>
            <p className="text-xs text-gray-400">recommended / mo</p>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onAccept(r)} className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600">Accept</button>
            <button className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100">Customize</button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ───────────────────── Goal Accelerator ───────────────────── */
const GoalAccelerator = ({ recs, currency, onAccept, forecast }: { recs: Recommendation[]; currency: string; onAccept: (r: Recommendation) => void; forecast: Forecast }) => (
  <div className="space-y-3">
    {forecast.goalCompletions.length === 0 && recs.length === 0 && <EmptyState icon={Target} title="No active goals" subtitle="Create a goal to let Lumo accelerate it." />}
    {forecast.goalCompletions.length > 0 && (
      <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
        <p className="font-semibold text-gray-900 text-sm mb-3">Goal completion forecast</p>
        <div className="space-y-2">
          {forecast.goalCompletions.map(g => (
            <div key={g.name} className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 truncate">{g.name}</span>
              <span className={`font-semibold ${g.risk === "high" ? "text-rose-600" : g.risk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
                {g.etaDate ? `~${g.etaDate}` : "no surplus to allocate"} · {(g.confidence * 100).toFixed(0)}% conf
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    {recs.map(r => (
      <div key={r.key} className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
          <p className="text-xs text-gray-600 mt-1">{r.reason}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">Allocate {fmt(r.impact || 0, currency)} · {r.impactNote}</p>
        </div>
        <button onClick={() => onAccept(r)} className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500">Allocate</button>
      </div>
    ))}
  </div>
);

/* ───────────────────── Subscriptions ───────────────────── */
const SubscriptionsPanel = ({ transactions, currency, onCancel }: { transactions: Tx[]; currency: string; onCancel: (title: string, amount: number) => void }) => {
  const subs = useMemo(() => detectSubscriptions(transactions), [transactions]);
  const monthly = subs.reduce((s, x) => s + x.monthly, 0);
  if (subs.length === 0) return <EmptyState icon={Repeat} title="No recurring charges detected" subtitle="Mark transactions as recurring or wait for repeating charges to appear." />;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Active Subs" value={subs.length.toString()} sub="detected" tone="from-pink-500 to-rose-500" icon={Repeat} />
        <KpiCard label="Monthly Cost" value={fmt(monthly, currency)} sub="estimated" tone="from-violet-500 to-fuchsia-500" icon={Wallet} />
        <KpiCard label="Annual Cost" value={fmt(monthly * 12, currency)} sub="projected" tone="from-amber-500 to-orange-500" icon={TrendingUp} />
      </div>
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y">
        {subs.map(s => (
          <div key={s.title} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{s.title}</p>
              <p className="text-[11px] text-gray-500">{s.count} charges · last {s.lastDate} {s.unused && <span className="ml-1 text-rose-600 font-semibold">· likely unused</span>}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-gray-900">{fmt(s.monthly, currency)}/mo</p>
              <button onClick={() => onCancel(s.title, s.monthly)} className="text-[11px] mt-0.5 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold">Recommend cancel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ───────────────────── Bill Predictor ───────────────────── */
const BillPredictor = ({ transactions, currency }: { transactions: Tx[]; currency: string }) => {
  const bills = useMemo(() => predictBills(transactions), [transactions]);
  const total = bills.reduce((s, b) => s + b.amount, 0);
  if (bills.length === 0) return <EmptyState icon={CalendarDays} title="No upcoming bills predicted" subtitle="Lumo learns from your recurring charges to forecast bills." />;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
        <p className="text-xs text-gray-600">Predicted bills in next 30 days</p>
        <p className="font-display text-2xl font-bold text-gray-900 mt-1">{fmt(total, currency)}</p>
      </div>
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y">
        {bills.map(b => (
          <div key={`${b.title}-${b.date}`} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">{b.title}</p>
              <p className="text-[11px] text-gray-500">Expected {b.date} · confidence {(b.confidence * 100).toFixed(0)}%</p>
            </div>
            <p className="font-display font-bold text-gray-900">{fmt(b.amount, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ───────────────────── Spending Guard ───────────────────── */
const SpendingGuard = ({ transactions, budgets, currency }: { transactions: Tx[]; budgets: Budget[]; currency: string }) => {
  const spikes = useMemo(() => detectSpikes(transactions), [transactions]);
  const overspend = budgets.filter(b => Number(b.spent_amount) > Number(b.monthly_limit) * 0.85);
  if (spikes.length === 0 && overspend.length === 0) return <EmptyState icon={ShieldAlert} title="No spending anomalies" subtitle="Spending patterns look stable across categories." />;
  return (
    <div className="space-y-3">
      {spikes.map(s => (
        <div key={s.category} className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /><p className="font-semibold text-sm">{s.category} spike detected</p></div>
            <p className="text-[11px] text-gray-500 mt-1">7-day spend {fmt(s.recent, currency)} vs prior 7-day {fmt(s.prior, currency)} ({s.pct > 0 ? "+" : ""}{s.pct.toFixed(0)}%)</p>
          </div>
          <TrendingUp className="w-5 h-5 text-rose-500" />
        </div>
      ))}
      {overspend.map(b => {
        const pct = (Number(b.spent_amount) / Number(b.monthly_limit)) * 100;
        return (
          <div key={b.id} className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{b.category} budget at {pct.toFixed(0)}%</p>
              <SeverityBadge s={pct >= 100 ? "critical" : "warn"} />
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full ${pct >= 100 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">{fmt(Number(b.spent_amount), currency)} of {fmt(Number(b.monthly_limit), currency)}</p>
          </div>
        );
      })}
    </div>
  );
};

/* ───────────────────── Reviews & Close ───────────────────── */
const ReviewsPanel = ({ onWeekly, onMonthly, running, actions, currency }: { onWeekly: () => void; onMonthly: () => void; running: boolean; actions: ActionRecord[]; currency: string }) => {
  const reviews = actions.filter(a => a.metadata && (a.metadata as Record<string, unknown>).module === "review");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <p className="font-semibold text-gray-900">Weekly AI Review</p>
          <p className="text-xs text-gray-500 mt-1">Auto-generated summary of last 7 days.</p>
          <button onClick={onWeekly} disabled={running} className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold">Generate now</button>
        </div>
        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <p className="font-semibold text-gray-900">Monthly Financial Close</p>
          <p className="text-xs text-gray-500 mt-1">Investor-grade PDF with health score and forecasts.</p>
          <button onClick={onMonthly} disabled={running} className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold">Generate PDF</button>
        </div>
      </div>
      {reviews.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y">
          {reviews.slice(0, 5).map(r => (
            <div key={r.id} className="p-3 text-xs">
              <p className="font-semibold">{r.rule_name}</p>
              <p className="text-gray-500 mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ───────────────────── Health Monitor ───────────────────── */
const HealthMonitorPanel = ({ health }: { health: HealthScore }) => (
  <div className="space-y-4">
    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm flex items-center gap-6">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="10" fill="none" />
          <circle cx="50" cy="50" r="42" stroke="url(#hg)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${(health.score / 100) * 263.9} 263.9`} />
          <defs><linearGradient id="hg"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#d946ef" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-3xl font-bold">{health.score}</p>
          <p className="text-[10px] text-gray-500 uppercase">{health.grade}</p>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">30-day change</p>
        <p className={`text-lg font-bold flex items-center gap-1 ${health.monthlyChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {health.monthlyChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {health.monthlyChange >= 0 ? "+" : ""}{health.monthlyChange.toFixed(1)} pts
        </p>
        <div className="mt-3 flex items-end gap-1 h-12">
          {health.trend.map((p, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-indigo-200 to-violet-400" style={{ height: `${p.score}%` }} title={`${p.date}: ${p.score}`} />
          ))}
        </div>
      </div>
    </div>
    <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
      <p className="font-semibold text-sm mb-3">Score components</p>
      <div className="space-y-3">
        {health.factors.map(f => (
          <div key={f.key}>
            <div className="flex justify-between text-xs"><span className="font-medium text-gray-700">{f.label}</span><span className="font-semibold text-gray-900">{f.score.toFixed(0)}/100</span></div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
              <div className={`h-full ${f.status === "good" ? "bg-emerald-500" : f.status === "warn" ? "bg-amber-500" : f.status === "bad" ? "bg-rose-500" : "bg-gray-400"}`} style={{ width: `${f.score}%` }} />
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
    {health.recommendations.length > 0 && (
      <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100">
        <p className="font-semibold text-sm mb-2">AI recommendations</p>
        <ul className="space-y-1 text-xs text-gray-700">{health.recommendations.map((r, i) => <li key={i} className="flex gap-1.5"><ArrowRight className="w-3 h-3 mt-0.5 text-violet-500 shrink-0" />{r}</li>)}</ul>
      </div>
    )}
  </div>
);

/* ───────────────────── Actions Feed ───────────────────── */
const ActionsFeed = ({ actions, loading, currency }: { actions: ActionRecord[]; loading: boolean; currency: string }) => {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  if (actions.length === 0) return <EmptyState icon={Activity} title="No AI actions yet" subtitle="Approve a recommendation or run a scan to populate the feed." />;
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y">
      {actions.map(a => (
        <div key={a.id} className="p-4 flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${a.severity === "critical" ? "bg-rose-50 text-rose-600" : a.severity === "warn" ? "bg-amber-50 text-amber-600" : a.severity === "success" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{a.rule_name}</p>
              <SeverityBadge s={a.severity} />
              <span className="text-[10px] text-gray-400 ml-auto">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5"><span className="font-semibold">Trigger:</span> {a.trigger_reason}</p>
            <p className="text-xs text-gray-600"><span className="font-semibold">Action:</span> {a.action_taken}</p>
            {Number(a.amount_saved) > 0 && <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Impact: {fmt(Number(a.amount_saved), currency)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ───────────────────── Empty ───────────────────── */
const EmptyState = ({ icon: Icon, title, subtitle }: { icon: typeof Bot; title: string; subtitle: string }) => (
  <div className="rounded-2xl p-10 bg-white border border-dashed border-gray-200 text-center">
    <Icon className="w-8 h-8 mx-auto text-gray-300" />
    <p className="font-semibold text-gray-900 mt-3">{title}</p>
    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
  </div>
);

/* ═════════════════════════════════════════════════
   ANALYSIS HELPERS — all derived from real data
   ═════════════════════════════════════════════════ */

interface Recommendation {
  key: string;
  module: Module;
  type: "info" | "budget" | "goal_transfer" | "create_goal" | "subscription" | "spike" | "bill" | "health";
  title: string;
  reason: string;
  action: string;
  severity: "info" | "warn" | "critical" | "success";
  impact?: number;
  impactNote?: string;
  budgetCategory?: string;
  budgetSuggested?: number;
  goalId?: string;
  goalName?: string;
  goalTarget?: number;
}

function topCategory(txs: Tx[]) {
  const map: Record<string, number> = {};
  for (const t of txs) if (t.type === "expense") { const c = t.category || "Other"; map[c] = (map[c] || 0) + Number(t.amount); }
  const arr = Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return arr[0];
}

function detectSubscriptions(transactions: Tx[]) {
  const map = new Map<string, { count: number; total: number; lastDate: string; titles: Set<string> }>();
  const recent = transactions.filter(t => t.type === "expense" && t.transaction_date >= isoDaysAgo(90));
  for (const t of recent) {
    const key = (t.title || "").toLowerCase().trim();
    if (!key) continue;
    const isRecurring = t.recurring;
    const entry = map.get(key) || { count: 0, total: 0, lastDate: t.transaction_date, titles: new Set<string>() };
    entry.count++; entry.total += Number(t.amount);
    entry.titles.add(t.title);
    if (t.transaction_date > entry.lastDate) entry.lastDate = t.transaction_date;
    if (isRecurring || entry.count >= 2) map.set(key, entry);
  }
  return [...map.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([k, v]) => ({
      title: [...v.titles][0] || k,
      count: v.count,
      monthly: v.total / Math.max(1, v.count) * (v.count >= 3 ? 1 : 1),
      lastDate: v.lastDate,
      unused: (Date.now() - new Date(v.lastDate).getTime()) > 45 * 86400000,
    }))
    .sort((a, b) => b.monthly - a.monthly);
}

function predictBills(transactions: Tx[]) {
  const subs = detectSubscriptions(transactions);
  const today = new Date();
  return subs.map(s => {
    const last = new Date(s.lastDate);
    const next = new Date(last); next.setMonth(next.getMonth() + 1);
    if (next.getTime() < today.getTime()) next.setMonth(today.getMonth() + (today.getDate() > last.getDate() ? 1 : 0));
    return {
      title: s.title,
      amount: s.monthly,
      date: next.toISOString().slice(0, 10),
      confidence: Math.min(0.95, 0.5 + s.count * 0.1),
    };
  });
}

function detectSpikes(transactions: Tx[]) {
  const cats = new Map<string, { recent: number; prior: number }>();
  const now = Date.now();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const c = t.category || "Other";
    const age = (now - new Date(t.transaction_date).getTime()) / 86400000;
    const entry = cats.get(c) || { recent: 0, prior: 0 };
    if (age <= 7) entry.recent += Number(t.amount);
    else if (age <= 14) entry.prior += Number(t.amount);
    cats.set(c, entry);
  }
  return [...cats.entries()]
    .filter(([, v]) => v.prior > 0 && v.recent / v.prior >= 1.3)
    .map(([category, v]) => ({ category, recent: v.recent, prior: v.prior, pct: (v.recent / v.prior - 1) * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

function buildRecommendations(opts: {
  transactions: Tx[]; goals: Goal[]; budgets: Budget[]; monthlyIncome: number; currency: string;
  health: HealthScore; forecast: Forecast;
}): Recommendation[] {
  const { transactions, goals, budgets, monthlyIncome, health, forecast } = opts;
  const out: Recommendation[] = [];

  // Budget recommendations from 90d category spend
  const last90 = transactions.filter(t => t.type === "expense" && t.transaction_date >= isoDaysAgo(90));
  const catTotals = new Map<string, number>();
  for (const t of last90) { const c = t.category || "Other"; catTotals.set(c, (catTotals.get(c) || 0) + Number(t.amount)); }
  for (const [cat, total] of catTotals) {
    const avgMonthly = total / 3;
    if (avgMonthly < 500) continue;
    const existing = budgets.find(b => b.category === cat);
    const suggested = Math.round((avgMonthly * 1.1) / 100) * 100;
    if (!existing) {
      out.push({
        key: `budget-new-${cat}`, module: "budget", type: "budget",
        severity: "info", title: `Set a ${cat} budget`,
        reason: `Avg ${cat} spend over 90 days is ${fmt(avgMonthly)}. No budget configured.`,
        action: `Create monthly budget of ${fmt(suggested)} for ${cat}`,
        budgetCategory: cat, budgetSuggested: suggested,
      });
    } else {
      const lim = Number(existing.monthly_limit);
      if (Math.abs(suggested - lim) / lim > 0.15) {
        const dir = suggested < lim ? "trim" : "raise";
        out.push({
          key: `budget-adj-${cat}`, module: "budget", type: "budget",
          severity: suggested < lim ? "info" : "warn",
          title: `${dir === "trim" ? "Trim" : "Raise"} ${cat} budget`,
          reason: `Average monthly spend ${fmt(avgMonthly)} vs current limit ${fmt(lim)}.`,
          action: `Adjust ${cat} budget to ${fmt(suggested)}`,
          budgetCategory: cat, budgetSuggested: suggested,
          impact: Math.abs(lim - suggested), impactNote: dir === "trim" ? "potential monthly savings" : "more accurate ceiling",
        });
      }
    }
  }

  // Goal accelerator from forecast surplus
  const surplus = Math.max(0, forecast.nextMonthSavings.value);
  const activeGoals = goals.filter(g => Number(g.current_amount) < Number(g.target_amount));
  if (surplus > 0 && activeGoals.length > 0) {
    const per = surplus / activeGoals.length;
    for (const g of activeGoals.slice(0, 3)) {
      const remaining = Number(g.target_amount) - Number(g.current_amount);
      const allocation = Math.min(remaining, Math.round(per));
      if (allocation < 100) continue;
      out.push({
        key: `goal-${g.id}`, module: "goals", type: "goal_transfer",
        severity: "info", title: `Accelerate "${g.goal_name}"`,
        reason: `Forecast shows ${fmt(surplus)} surplus next month. Allocating ${fmt(allocation)} brings completion ~${Math.ceil(allocation / Math.max(1, per) * 30)} days sooner.`,
        action: `Transfer ${fmt(allocation)} to ${g.goal_name}`,
        impact: allocation, impactNote: "toward this goal", goalId: g.id,
      });
    }
  }
  if (goals.length === 0 && monthlyIncome > 0) {
    out.push({
      key: "create-emergency", module: "goals", type: "create_goal",
      severity: "warn", title: "Start an Emergency Fund",
      reason: `No active goals. Recommended emergency fund: 3× monthly income (${fmt(monthlyIncome * 3)}).`,
      action: `Create goal "Emergency Fund" with target ${fmt(monthlyIncome * 3)}`,
      goalName: "Emergency Fund", goalTarget: Math.round(monthlyIncome * 3),
    });
  }

  // Spending spikes
  for (const s of detectSpikes(transactions).slice(0, 3)) {
    out.push({
      key: `spike-${s.category}`, module: "guard", type: "spike",
      severity: s.pct > 60 ? "critical" : "warn",
      title: `${s.category} spending spike`,
      reason: `Last 7 days: ${fmt(s.recent)} vs prior week ${fmt(s.prior)} (+${s.pct.toFixed(0)}%).`,
      action: `Review ${s.category} transactions and pause discretionary spend`,
      impact: Math.max(0, s.recent - s.prior), impactNote: "weekly overshoot",
    });
  }

  // Budget overspend
  for (const b of budgets) {
    if (Number(b.monthly_limit) <= 0) continue;
    const pct = (Number(b.spent_amount) / Number(b.monthly_limit)) * 100;
    if (pct >= 85) {
      out.push({
        key: `over-${b.id}`, module: "guard", type: "spike",
        severity: pct >= 100 ? "critical" : "warn",
        title: `${b.category} budget ${pct.toFixed(0)}% used`,
        reason: `${fmt(Number(b.spent_amount))} of ${fmt(Number(b.monthly_limit))} consumed this month.`,
        action: `Cap further ${b.category} spend for the rest of the month`,
      });
    }
  }

  // Subscriptions to cut
  for (const s of detectSubscriptions(transactions).slice(0, 5)) {
    if (s.unused) {
      out.push({
        key: `sub-${s.title}`, module: "subscriptions", type: "subscription",
        severity: "warn", title: `Unused subscription: ${s.title}`,
        reason: `Last charge ${s.lastDate}, no recent activity. Costs ~${fmt(s.monthly)}/month.`,
        action: `Cancel ${s.title} to save ${fmt(s.monthly * 12)}/year`,
        impact: s.monthly * 12, impactNote: "annual savings",
      });
    }
  }

  // Health-driven recs
  if (health.score < 60) {
    out.push({
      key: "health-low", module: "health", type: "health",
      severity: "warn", title: `Health score is ${health.score}/100 (${health.grade})`,
      reason: health.recommendations[0] || "Multiple factors are below target.",
      action: "Review Health Monitor for component-level fixes",
    });
  }

  // Forecast risks
  for (const r of forecast.risks.slice(0, 2)) {
    out.push({
      key: `risk-${r.slice(0, 30)}`, module: "copilot", type: "info",
      severity: "warn", title: "Forecast risk detected", reason: r,
      action: "Open the forecast widget to drill in",
    });
  }

  return out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: string) { return s === "critical" ? 3 : s === "warn" ? 2 : s === "success" ? 1 : 0; }

function totalImpact(recs: Recommendation[]) {
  return recs.reduce((s, r) => s + (r.impact || 0), 0);
}
