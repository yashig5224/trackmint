// Phase 10 — AI Insight Feed + Timeline
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, TrendingUp, Wallet, Target, Activity, Repeat, Calendar } from "lucide-react";
import { generateInsights, type Insight, type InsightTimeframe } from "@/lib/insightEngine";
import type { Tx, Goal } from "@/components/dashboard/CommandCenter";

interface Budget { id: string; category: string; monthly_limit: number; spent_amount: number; month: string; }

interface Props {
  transactions: Tx[];
  goals: Goal[];
  budgets: Budget[];
  monthlyIncome?: number;
}

const categoryIcon: Record<string, any> = {
  anomaly: AlertTriangle, budget: Wallet, savings: TrendingUp,
  subscription: Repeat, goal: Target, health: Activity, cashflow: Wallet,
};

const severityStyle: Record<Insight["severity"], { dot: string; bg: string; border: string; text: string }> = {
  critical: { dot: "#ef4444", bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  warning:  { dot: "#f59e0b", bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  info:     { dot: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3" },
  positive: { dot: "#10b981", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
};

const InsightFeed: React.FC<Props> = ({ transactions, goals, budgets, monthlyIncome }) => {
  const [filter, setFilter] = useState<InsightTimeframe | "all">("all");

  const insights = useMemo(
    () => generateInsights({ transactions, goals, budgets, monthlyIncome }),
    [transactions, goals, budgets, monthlyIncome]
  );

  const filtered = filter === "all" ? insights : insights.filter(i => i.timeframe === filter);

  const counts = useMemo(() => ({
    all: insights.length,
    daily: insights.filter(i => i.timeframe === "daily").length,
    weekly: insights.filter(i => i.timeframe === "weekly").length,
    monthly: insights.filter(i => i.timeframe === "monthly").length,
  }), [insights]);

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500" />
            <h3 className="font-display text-lg font-bold text-gray-900">AI Insight Feed</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Daily, weekly and monthly intelligence generated from your finances</p>
        </div>
      </div>

      {/* Timeframe filter */}
      <div className="flex items-center gap-1.5 mb-4 p-1 bg-gray-50 rounded-xl w-fit">
        {(["all", "daily", "weekly", "monthly"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
              filter === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t} {counts[t] > 0 && <span className="ml-1 opacity-60 tabular-nums">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No insights for this period — add more transactions to unlock intelligence.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((ins, idx) => {
              const Icon = categoryIcon[ins.category] || Sparkles;
              const style = severityStyle[ins.severity];
              return (
                <motion.div
                  key={ins.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex gap-3 p-3 rounded-2xl border transition-colors"
                  style={{ background: style.bg, borderColor: style.border }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${style.dot}25`, color: style.dot }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight" style={{ color: style.text }}>{ins.title}</p>
                      {ins.metric && (
                        <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ background: style.dot, color: "white" }}>
                          {ins.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90" style={{ color: style.text }}>{ins.body}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold opacity-60" style={{ color: style.text }}>
                        <Calendar size={9} className="inline mr-0.5" />{ins.timeframe}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-bold opacity-60" style={{ color: style.text }}>
                        {ins.category}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default InsightFeed;
