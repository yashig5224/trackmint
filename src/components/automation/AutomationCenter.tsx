import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Crown,
  AlertTriangle,
  Bell,
  FileText,
  Sparkles,
  Activity,
  LayoutGrid,
  Wand2,
  ListChecks,
  PlayCircle,
  Plus,
  Trash2,
  ToggleRight,
  ToggleLeft,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  PREBUILTS,
  CONDITIONS,
  ACTIONS,
  runAutomationEngine,
  type AutomationRule,
  type AutomationLog,
  type ConditionType,
  type ActionType,
  type EngineContext,
} from "@/lib/automationEngine";

interface Props {
  transactions: Array<{
    id: string;
    title: string;
    amount: number;
    type: string;
    category: string | null;
    transaction_date: string;
    recurring?: boolean | null;
  }>;
  income: number;
  expenses: number;
  currency: string;
  tier: "free" | "pro" | "elite";
  onUpgrade: () => void;
  onCreateGoal?: (name: string, amount: number) => void;
}

type SubTab = "dashboard" | "prebuilt" | "studio" | "activity";

const fmt = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

export const AutomationCenter = ({ transactions, income, expenses, currency, tier, onUpgrade }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<SubTab>("dashboard");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const [r, l] = await Promise.all([
      supabase.from("automation_rules").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("automation_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (r.data) setRules(r.data as AutomationRule[]);
    if (l.data) setLogs(l.data as AutomationLog[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Auto-run engine on mount when data is ready
  useEffect(() => {
    if (!user || loading || rules.length === 0 || tier === "free") return;
    let cancelled = false;
    (async () => {
      const ctx: EngineContext = { userId: user.id, transactions, goals: [], budgets: [], monthlyIncome: income };
      try {
        const fresh = await runAutomationEngine(rules, ctx);
        if (!cancelled && fresh.length) {
          setLogs((prev) => [...fresh, ...prev]);
          await reload();
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, rules.length]);

  const runEngine = async () => {
    if (!user || tier === "free") {
      onUpgrade();
      return;
    }
    setRunning(true);
    try {
      const ctx: EngineContext = { userId: user.id, transactions, goals: [], budgets: [], monthlyIncome: income };
      const fresh = await runAutomationEngine(rules, ctx);
      if (fresh.length) toast.success(`${fresh.length} automation${fresh.length > 1 ? "s" : ""} fired`);
      else toast.message("No new triggers — all clear.");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  // Dashboard metrics
  const metrics = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const monthKey = todayKey.slice(0, 7);
    const today = logs.filter((l) => l.created_at.startsWith(todayKey)).length;
    const month = logs.filter((l) => l.created_at.startsWith(monthKey)).length;
    const saved = logs.reduce((s, l) => s + Number(l.amount_saved || 0), 0);
    const alerts = logs.filter((l) => l.severity === "warn" || l.severity === "critical").length;
    const active = rules.filter((r) => r.enabled).length;
    const success = logs.length
      ? Math.round((logs.filter((l) => l.result === "success").length / logs.length) * 100)
      : 100;
    return { active, today, month, saved, alerts, success };
  }, [rules, logs]);

  if (tier === "free") {
    return <UpgradePrompt onUpgrade={onUpgrade} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" /> AI Automation Studio
          </h2>
        </div>
        <button
          onClick={runEngine}
          disabled={running}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 disabled:opacity-60"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          {running ? "Scanning…" : "Run Engine Now"}
        </button>
      </header>

      <nav className="flex flex-wrap gap-1.5 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm w-fit">
        {(
          [
            { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
            { id: "prebuilt", label: "Prebuilt", icon: ListChecks },
            { id: "studio", label: "Studio", icon: Wand2 },
            { id: "activity", label: "Activity", icon: Activity },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${tab === id ? "bg-gray-900 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "dashboard" && <DashboardPanel metrics={metrics} logs={logs} currency={currency} />}
          {tab === "prebuilt" && <PrebuiltPanel installed={rules} tier={tier} onUpgrade={onUpgrade} reload={reload} />}
          {tab === "studio" && <StudioPanel rules={rules} reload={reload} />}
          {tab === "activity" && <ActivityPanel logs={logs} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ============== Dashboard ============== */
const DashboardPanel = ({
  metrics,
  logs,
  currency,
}: {
  metrics: ReturnType<typeof Object> extends never
    ? never
    : { active: number; today: number; month: number; saved: number; alerts: number; success: number };
  logs: AutomationLog[];
  currency: string;
}) => {
  const cards = [
    { label: "Active Automations", value: metrics.active, icon: Zap, tone: "from-indigo-500 to-violet-500" },
    { label: "Triggered Today", value: metrics.today, icon: PlayCircle, tone: "from-emerald-500 to-teal-500" },
    { label: "Triggered This Month", value: metrics.month, icon: TrendingUp, tone: "from-amber-500 to-orange-500" },
    {
      label: "Money Saved",
      value: fmt(metrics.saved, currency),
      icon: CheckCircle2,
      tone: "from-fuchsia-500 to-pink-500",
    },
    { label: "Alerts Sent", value: metrics.alerts, icon: Bell, tone: "from-rose-500 to-red-500" },
    { label: "Success Rate", value: `${metrics.success}%`, icon: Sparkles, tone: "from-violet-500 to-blue-500" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="relative rounded-3xl p-5 bg-white border border-gray-100 shadow-sm overflow-hidden"
            >
              <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.tone} opacity-10 blur-2xl`}
              />
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${c.tone} flex items-center justify-center text-white shadow-md`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900 mt-3">{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
        <h3 className="font-display text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-500" /> Recent Activity
        </h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            No automations have fired yet. Install a prebuilt or build your own.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 5).map((l) => (
              <LogRow key={l.id} log={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============== Prebuilt ============== */
const PrebuiltPanel = ({
  installed,
  tier,
  onUpgrade,
  reload,
}: {
  installed: AutomationRule[];
  tier: "free" | "pro" | "elite";
  onUpgrade: () => void;
  reload: () => Promise<void>;
}) => {
  const { user } = useAuth();
  const installedKeys = new Set(
    installed.filter((r) => r.is_prebuilt && r.prebuilt_key).map((r) => r.prebuilt_key as string),
  );
  const install = async (p: (typeof PREBUILTS)[number]) => {
    if (!user) return;
    if (p.tier === "elite" && tier !== "elite") {
      onUpgrade();
      return;
    }
    const { error } = await supabase.from("automation_rules").insert({
      user_id: user.id,
      name: p.name,
      description: p.description,
      is_prebuilt: true,
      prebuilt_key: p.key,
      condition_type: p.condition_type,
      condition_config: p.condition_config as never,
      action_type: p.action_type,
      action_config: p.action_config as never,
      tier: p.tier,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${p.name} installed`);
    await reload();
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PREBUILTS.map((p) => {
        const installed = installedKeys.has(p.key);
        const locked = p.tier === "elite" && tier !== "elite";
        return (
          <motion.div
            key={p.key}
            whileHover={{ y: -2 }}
            className="relative rounded-3xl p-5 bg-white border border-gray-100 shadow-sm overflow-hidden"
          >
            <div
              className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl ${installed ? "bg-gradient-to-br from-emerald-400 to-teal-400 opacity-20" : "bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-10"}`}
            />
            <div className="flex items-start justify-between relative">
              <div className="text-3xl">{p.emoji}</div>
              {locked ? (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> ELITE
                </span>
              ) : installed ? (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> INSTALLED
                </span>
              ) : null}
            </div>
            <h3 className="font-display text-base font-bold text-gray-900 mt-3">{p.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{p.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-gray-100">IF {p.condition_type.replace(/_/g, " ")}</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100">THEN {p.action_type.replace(/_/g, " ")}</span>
            </div>
            {!installed && (
              <button
                onClick={() => install(p)}
                disabled={locked}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Install
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

/* ============== Studio (IF/THEN Builder) ============== */
const StudioPanel = ({ rules, reload }: { rules: AutomationRule[]; reload: () => Promise<void> }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const customRules = rules.filter((r) => !r.is_prebuilt);

  const toggle = async (r: AutomationRule) => {
    await supabase.from("automation_rules").update({ enabled: !r.enabled }).eq("id", r.id);
    await reload();
  };
  const remove = async (r: AutomationRule) => {
    await supabase.from("automation_rules").delete().eq("id", r.id);
    toast.success("Automation deleted");
    await reload();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen(true)}
        className="w-full p-5 rounded-3xl border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50/50 transition flex items-center justify-center gap-2 text-violet-700 font-semibold"
      >
        <Plus className="w-4 h-4" /> Build Custom Automation
      </button>

      {rules.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          No automations yet. Install a prebuilt or build your own.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate flex items-center gap-2">
                  {r.name}
                  {r.is_prebuilt && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                      PREBUILT
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                  IF {r.condition_type} → THEN {r.action_type} · fired {r.trigger_count}×
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggle(r)} className={r.enabled ? "text-emerald-600" : "text-gray-300"}>
                  {r.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                </button>
                {!r.is_prebuilt && (
                  <button
                    onClick={() => remove(r)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && user && <BuilderModal onClose={() => setOpen(false)} onCreated={reload} userId={user.id} />}
      </AnimatePresence>
    </div>
  );
};

const BuilderModal = ({
  onClose,
  onCreated,
  userId,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  userId: string;
}) => {
  const [name, setName] = useState("My Automation");
  const [conditionType, setConditionType] = useState<ConditionType>("category_spend");
  const [actionType, setActionType] = useState<ActionType>("send_notification");
  const [amount, setAmount] = useState(5000);
  const [category, setCategory] = useState("Food");
  const [percent, setPercent] = useState(80);
  const [operator, setOperator] = useState<">" | ">=" | "<" | "<=">(">");
  const [saving, setSaving] = useState(false);

  const condCfg = (): Record<string, unknown> => {
    switch (conditionType) {
      case "category_spend":
        return { category, operator, amount, period: "month" };
      case "merchant_spend":
        return { merchant: category, operator, amount, period: "month" };
      case "income_received":
        return { min_amount: amount, period: "month" };
      case "goal_progress":
        return { percent };
      case "savings_rate":
        return { operator, percent };
      case "budget_usage":
        return { category, operator, percent };
      case "cash_balance":
        return { operator, amount };
      case "transaction_amount":
        return { operator, amount };
      case "date_time":
        return { day_of_week: 0 };
      default:
        return {};
    }
  };

  const create = async () => {
    setSaving(true);
    const { error } = await supabase.from("automation_rules").insert({
      user_id: userId,
      name,
      description: `Custom: ${conditionType} → ${actionType}`,
      condition_type: conditionType,
      condition_config: condCfg() as never,
      action_type: actionType,
      action_config: { message: name },
      tier: "pro",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Automation created");
    await onCreated();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h3 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-violet-500" /> New Automation
        </h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
            />
          </div>
          <div className="rounded-2xl p-3 bg-indigo-50/60 border border-indigo-100">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-2">IF Condition</p>
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value as ConditionType)}
              className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white"
            >
              {CONDITIONS.map((c) => (
                <option key={c.type} value={c.type}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(conditionType === "category_spend" ||
                conditionType === "budget_usage" ||
                conditionType === "merchant_spend") && (
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={conditionType === "merchant_spend" ? "Merchant" : "Category"}
                  className="px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white"
                />
              )}
              {conditionType === "savings_rate" ||
              conditionType === "budget_usage" ||
              conditionType === "goal_progress" ? (
                <input
                  type="number"
                  value={percent}
                  onChange={(e) => setPercent(+e.target.value)}
                  placeholder="Percent"
                  className="px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white"
                />
              ) : (
                conditionType !== "date_time" &&
                conditionType !== "subscription_charge" && (
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(+e.target.value)}
                    placeholder="Amount"
                    className="px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white"
                  />
                )
              )}
              {conditionType !== "date_time" &&
                conditionType !== "income_received" &&
                conditionType !== "subscription_charge" && (
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as ">" | ">=" | "<" | "<=")}
                    className="px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white"
                  >
                    <option value=">">&gt;</option>
                    <option value=">=">≥</option>
                    <option value="<">&lt;</option>
                    <option value="<=">≤</option>
                  </select>
                )}
            </div>
          </div>
          <div className="rounded-2xl p-3 bg-violet-50/60 border border-violet-100">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 mb-2">THEN Action</p>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm bg-white"
            >
              {ACTIONS.map((a) => (
                <option key={a.type} value={a.type}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Automation"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============== Activity ============== */
const ActivityPanel = ({ logs }: { logs: AutomationLog[] }) => (
  <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
    <h3 className="font-display text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
      <Activity className="w-4 h-4 text-violet-500" /> Automation History
    </h3>
    {logs.length === 0 ? (
      <p className="text-sm text-gray-400 py-12 text-center">
        No activity yet. Hit “Run Engine Now” after installing automations.
      </p>
    ) : (
      <div className="space-y-2">
        {logs.map((l) => (
          <LogRow key={l.id} log={l} />
        ))}
      </div>
    )}
  </div>
);

const LogRow = ({ log }: { log: AutomationLog }) => {
  const sevColor =
    log.severity === "critical"
      ? "bg-rose-50 border-rose-100 text-rose-700"
      : log.severity === "warn"
        ? "bg-amber-50 border-amber-100 text-amber-700"
        : log.severity === "success"
          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
          : "bg-indigo-50 border-indigo-100 text-indigo-700";
  const date = new Date(log.created_at);
  const when = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : date.toLocaleDateString();
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-gray-100 hover:border-violet-200 transition">
      <div className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${sevColor}`}>
        {log.severity}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{log.rule_name}</p>
        <p className="text-xs text-gray-600 mt-0.5">{log.trigger_reason}</p>
        <p className="text-[11px] text-gray-400 mt-1">→ {log.action_taken}</p>
      </div>
      <p className="text-[10px] text-gray-400 shrink-0">
        {when}
        <br />
        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
};

const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
};

/* ============== Upgrade prompt for free users ============== */
const UpgradePrompt = ({ onUpgrade }: { onUpgrade: () => void }) => (
  <div className="space-y-6">
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-500" /> AI Automation Studio
      </h2>
      <p className="text-sm text-gray-500">Let Lumo run your finances on autopilot.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        { i: Zap, t: "Real IF/THEN engine" },
        { i: AlertTriangle, t: "Spike & spike alerts" },
        { i: FileText, t: "Auto monthly reports" },
      ].map(({ i: I, t }, idx) => (
        <div key={idx} className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center">
            <I className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{t}</p>
        </div>
      ))}
    </div>
    <button
      onClick={onUpgrade}
      className="w-full p-5 rounded-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-500/30 text-left"
    >
      <p className="font-display text-lg font-bold flex items-center gap-2">
        <Crown className="w-5 h-5" /> Unlock AI Automations
      </p>
      <p className="text-sm text-white/80 mt-1">
        Auto budgets, spike detection, subscription radar, custom IF/THEN rules and full activity logs on Pro. AI goal
        suggestions and monthly reports on Elite.
      </p>
    </button>
  </div>
);
