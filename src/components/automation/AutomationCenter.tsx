import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Crown, AlertTriangle, Repeat, Bell, Target, FileText, Brain, Check, Sparkles } from "lucide-react";
import {
  AUTOMATIONS, loadAutomation, saveAutomation, suggestBudgets,
  detectSpikes, detectSubscriptions, generateAlerts, suggestGoals, type AutomationKey,
} from "@/lib/automation";

interface Props {
  transactions: Array<{ title: string; amount: number; type: string; category: string | null; transaction_date: string; recurring?: boolean | null }>;
  income: number;
  expenses: number;
  currency: string;
  tier: "free" | "pro" | "elite";
  onUpgrade: () => void;
  onCreateGoal?: (name: string, amount: number) => void;
}

const fmt = (n: number, c = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const ICONS: Record<AutomationKey, typeof Zap> = {
  auto_budget: Zap, auto_categorize: Brain, spike_detection: AlertTriangle,
  subscription_detect: Repeat, smart_alerts: Bell,
  goal_suggestions: Target, monthly_report: FileText,
};

export const AutomationCenter = ({ transactions, income, expenses, currency, tier, onUpgrade, onCreateGoal }: Props) => {
  const [state, setState] = useState(() => loadAutomation());
  useEffect(() => { saveAutomation(state); }, [state]);

  const budgets = useMemo(() => suggestBudgets(transactions, income), [transactions, income]);
  const spikes = useMemo(() => detectSpikes(transactions), [transactions]);
  const subs = useMemo(() => detectSubscriptions(transactions), [transactions]);
  const alerts = useMemo(() => generateAlerts(transactions, income), [transactions, income]);
  const goalIdeas = useMemo(() => suggestGoals(income, expenses), [income, expenses]);

  const toggle = (k: AutomationKey, meta: typeof AUTOMATIONS[number]) => {
    if (meta.tier === "pro" && tier === "free") { onUpgrade(); return; }
    if (meta.tier === "elite" && tier !== "elite") { onUpgrade(); return; }
    setState((s) => ({ ...s, [k]: !s[k] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" /> AI Automation Center
          </h2>
          <p className="text-sm text-gray-500">Let Lumo run your finances on autopilot.</p>
        </div>
      </div>

      {/* Toggle cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTOMATIONS.map((a) => {
          const Icon = ICONS[a.key];
          const enabled = state[a.key];
          const locked = (a.tier === "pro" && tier === "free") || (a.tier === "elite" && tier !== "elite");
          return (
            <motion.div key={a.key} whileHover={{ y: -2 }} className="relative rounded-3xl p-5 bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl ${enabled && !locked ? "bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-25" : "bg-gray-200 opacity-30"}`} />
              <div className="flex items-start justify-between relative">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${enabled && !locked ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <button
                  onClick={() => toggle(a.key, a)}
                  className={`relative w-12 h-6 rounded-full transition ${enabled && !locked ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500" : "bg-gray-200"}`}
                >
                  <motion.span layout className={`absolute top-0.5 ${enabled && !locked ? "right-0.5" : "left-0.5"} w-5 h-5 bg-white rounded-full shadow`} />
                </button>
              </div>
              <h3 className="font-display text-base font-bold text-gray-900 mt-4 flex items-center gap-2">
                {a.title}
                {locked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {a.tier === "elite" ? "ELITE" : "PRO"}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{a.description}</p>
              {enabled && !locked && (
                <div className="text-[10px] font-semibold text-emerald-600 mt-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Live insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budgets */}
        {state.auto_budget && tier !== "free" && (
          <Panel title="Auto-Generated Budgets" icon={<Zap className="w-4 h-4" />}>
            {budgets.length === 0 ? <Empty>No spending yet to budget.</Empty> : (
              <div className="space-y-3">
                {budgets.slice(0, 5).map((b) => {
                  const used = Math.min(100, Math.round((b.spent / Math.max(1, b.suggested)) * 100));
                  return (
                    <div key={b.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{b.category}</span>
                        <span className="text-gray-500">{fmt(b.spent, currency)} / {fmt(b.suggested, currency)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${used > 90 ? "bg-rose-500" : used > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${used}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* Spikes */}
        {state.spike_detection && tier !== "free" && (
          <Panel title="Spending Spike Detection" icon={<AlertTriangle className="w-4 h-4" />}>
            {spikes.length === 0 ? <Empty>No unusual spending detected. Nice control.</Empty> : (
              <div className="space-y-2">
                {spikes.map((s) => (
                  <div key={s.category} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.category}</p>
                      <p className="text-xs text-gray-500">This week: {fmt(s.weekAmount, currency)}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-white px-2 py-1 rounded-full border border-rose-200">
                      {s.multiplier === Infinity ? "NEW" : `${s.multiplier.toFixed(1)}×`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Subscriptions */}
        {state.subscription_detect && tier !== "free" && (
          <Panel title="Subscription Radar" icon={<Repeat className="w-4 h-4" />}>
            {subs.length === 0 ? <Empty>No recurring charges detected.</Empty> : (
              <div className="space-y-2">
                {subs.map((s) => (
                  <div key={s.title} className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-500">Seen {s.occurrences}× · ~{fmt(s.amount, currency)}</p>
                    </div>
                    <Check className="w-4 h-4 text-indigo-500" />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Alerts */}
        {state.smart_alerts && tier !== "free" && (
          <Panel title="Smart Alerts" icon={<Bell className="w-4 h-4" />}>
            {alerts.length === 0 ? <Empty>All quiet — no alerts right now.</Empty> : (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm border ${a.kind === "warn" ? "bg-amber-50 border-amber-100 text-amber-900" : a.kind === "good" ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-blue-50 border-blue-100 text-blue-900"}`}>
                    {a.message}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Goal suggestions — Elite */}
        {state.goal_suggestions && tier === "elite" && (
          <Panel title="AI Goal Suggestions" icon={<Target className="w-4 h-4" />} elite>
            <div className="space-y-2">
              {goalIdeas.map((g) => (
                <div key={g.name} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.name} — {fmt(g.amount, currency)}</p>
                    <p className="text-xs text-gray-500">{g.rationale}</p>
                  </div>
                  {onCreateGoal && (
                    <button onClick={() => onCreateGoal(g.name, g.amount)} className="text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 rounded-full">
                      Create
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {tier === "free" && (
        <button onClick={onUpgrade} className="w-full p-5 rounded-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-500/30 text-left">
          <p className="font-display text-lg font-bold flex items-center gap-2"><Crown className="w-5 h-5" /> Unlock AI Automations</p>
          <p className="text-sm text-white/80 mt-1">Auto budgets, spike detection, subscription radar & smart alerts on Pro. Goal AI & monthly reports on Elite.</p>
        </button>
      )}
    </div>
  );
};

const Panel = ({ title, icon, children, elite }: { title: string; icon: React.ReactNode; children: React.ReactNode; elite?: boolean }) => (
  <div className={`rounded-3xl p-5 bg-white border shadow-sm ${elite ? "border-violet-200" : "border-gray-100"}`}>
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${elite ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" : "bg-gray-900 text-white"}`}>{icon}</div>
      <h3 className="font-display text-base font-bold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-400 py-4 text-center">{children}</p>
);
