// Phase 5 — Forecast widget
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Wallet, Target } from "lucide-react";
import { computeForecast } from "@/lib/forecastEngine";
import type { Tx, Goal } from "@/components/dashboard/CommandCenter";

interface Props {
  transactions: Tx[];
  goals: Goal[];
  currency?: string;
}

const fmt = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Math.round(n));

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums text-gray-500">{pct}%</span>
    </div>
  );
};

const TrendIcon: React.FC<{ t: "up" | "down" | "flat" }> = ({ t }) => {
  if (t === "up") return <TrendingUp size={12} className="text-red-500" />;
  if (t === "down") return <TrendingDown size={12} className="text-emerald-500" />;
  return <Minus size={12} className="text-gray-400" />;
};

const ForecastWidget: React.FC<Props> = ({ transactions, goals, currency = "INR" }) => {
  const forecast = useMemo(() => computeForecast({ transactions, goals }), [transactions, goals]);

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500" />
            <h3 className="font-display text-lg font-bold text-gray-900">30-Day Forecast</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Predicted from your transaction history</p>
        </div>
      </div>

      {/* Headline forecasts */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <ForecastCard
          icon={<TrendingDown size={14} />}
          label="Spending"
          value={fmt(forecast.nextMonthSpending.value, currency)}
          confidence={forecast.nextMonthSpending.confidence}
          color="#ef4444"
        />
        <ForecastCard
          icon={<TrendingUp size={14} />}
          label="Savings"
          value={fmt(forecast.nextMonthSavings.value, currency)}
          confidence={forecast.nextMonthSavings.confidence}
          color={forecast.nextMonthSavings.value >= 0 ? "#10b981" : "#ef4444"}
        />
        <ForecastCard
          icon={<Wallet size={14} />}
          label="Cash"
          value={fmt(forecast.expectedCashBalance.value, currency)}
          confidence={forecast.expectedCashBalance.confidence}
          color="#6366f1"
        />
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed mb-5 italic">
        {forecast.nextMonthSpending.explanation}
      </p>

      {/* Categories */}
      {!!forecast.categorySpending.length && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Category outlook</h4>
          <div className="space-y-1.5">
            {forecast.categorySpending.slice(0, 5).map((c) => (
              <div key={c.category} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendIcon t={c.trend} />
                  <span className="text-gray-700 truncate">{c.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 tabular-nums">{fmt(c.value, currency)}</span>
                  <ConfidenceBar value={c.confidence} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal completions */}
      {!!forecast.goalCompletions.length && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Target size={11} /> Goal projections
          </h4>
          <div className="space-y-1.5">
            {forecast.goalCompletions.slice(0, 4).map((g, i) => {
              const rc = g.risk === "low" ? "#10b981" : g.risk === "medium" ? "#f59e0b" : "#ef4444";
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 truncate flex-1">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {g.etaMonths === null ? "—" : g.etaMonths === 0 ? "Done" : `${g.etaMonths}mo`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold" style={{ background: `${rc}15`, color: rc }}>
                      {g.risk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subscription burn */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 mb-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Subscription burn</p>
          <p className="font-semibold text-gray-900">{fmt(forecast.subscriptionCost.value, currency)} <span className="text-xs font-normal text-gray-400">/mo</span></p>
        </div>
        <ConfidenceBar value={forecast.subscriptionCost.confidence} />
      </div>

      {/* Risks */}
      {!!forecast.risks.length && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-2 text-amber-700 text-xs font-semibold">
            <AlertTriangle size={12} /> Risk indicators
          </div>
          <ul className="space-y-1">
            {forecast.risks.slice(0, 3).map((r, i) => (
              <li key={i} className="text-xs text-amber-900 flex gap-1.5">
                <span>•</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const ForecastCard: React.FC<{ icon: React.ReactNode; label: string; value: string; confidence: number; color: string }> = ({
  icon, label, value, confidence, color,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="p-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50"
  >
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color }}>
      {icon}{label}
    </div>
    <div className="font-display font-bold text-gray-900 tabular-nums text-base leading-tight mb-1.5">{value}</div>
    <ConfidenceBar value={confidence} />
  </motion.div>
);

export default ForecastWidget;
