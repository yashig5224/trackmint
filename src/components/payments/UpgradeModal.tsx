import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feature?: string;
  tier?: "pro" | "elite";
}

const PERKS: Record<string, string[]> = {
  pro: [
    "Unlimited Lumo AI chats",
    "Advanced analytics & heatmap",
    "Goal forecasting & exports",
    "Smart AI recommendations",
  ],
  elite: [
    "Multi-AI (GPT + Gemini + Claude)",
    "Voice AI Coach",
    "Investment analysis & forecasting",
    "AI memory & priority processing",
  ],
};

export function UpgradeModal({ open, onOpenChange, feature, tier = "pro" }: Props) {
  const navigate = useNavigate();
  const Icon = tier === "elite" ? Crown : Sparkles;
  const accent = tier === "elite" ? "from-violet-500 to-fuchsia-500" : "from-indigo-500 to-blue-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl">
        <div className="relative p-8">
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-3xl`} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5`}
          >
            <Icon className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {feature ? `Unlock ${feature}` : `Upgrade to ${tier === "elite" ? "Elite AI+" : "Pro"}`}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            This is a premium feature. Upgrade to unlock the full Lumo experience.
          </p>
          <ul className="mt-5 space-y-2.5">
            {PERKS[tier].map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className={`mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center flex-shrink-0`}>
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              Maybe later
            </Button>
            <Button
              className={`flex-1 bg-gradient-to-r ${accent} hover:opacity-90 text-white shadow-lg shadow-indigo-500/30`}
              onClick={() => {
                onOpenChange(false);
                navigate("/pricing");
              }}
            >
              See Plans
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
