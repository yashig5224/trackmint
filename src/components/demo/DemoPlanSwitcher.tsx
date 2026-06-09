import { motion } from "framer-motion";
import { Crown, Sparkles, Zap } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import type { PlanTier } from "@/hooks/useSubscription";

const PLANS: Array<{ tier: PlanTier; label: string; icon: any; gradient: string }> = [
  { tier: "free",  label: "Basic", icon: Zap,      gradient: "from-slate-500 to-slate-700" },
  { tier: "pro",   label: "Pro",   icon: Sparkles, gradient: "from-indigo-500 to-blue-500" },
  { tier: "elite", label: "Elite", icon: Crown,    gradient: "from-violet-500 to-fuchsia-500" },
];

export default function DemoPlanSwitcher({ compact = false }: { compact?: boolean }) {
  const { tier, setTier } = useDemoMode();
  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-2xl bg-white border border-gray-200 shadow-sm ${compact ? "" : ""}`}>
      {PLANS.map((p) => {
        const active = tier === p.tier;
        const Icon = p.icon;
        return (
          <button
            key={p.tier}
            onClick={() => setTier(p.tier)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              active ? "text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {active && (
              <motion.div
                layoutId="demo-plan-pill"
                className={`absolute inset-0 rounded-xl bg-gradient-to-r ${p.gradient} shadow-md`}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
