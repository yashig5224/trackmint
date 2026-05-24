import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PLANS, BillingCycle } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { setPendingCheckout } from "@/lib/pendingCheckout";

export default function PricingPreview() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelect = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId)!;
    if (plan.id === "free") {
      navigate(user ? "/app" : "/login");
      return;
    }
    const priceId = cycle === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceId) return;
    setPendingCheckout({ priceId, planName: plan.name, cycle });
    navigate(user ? "/pricing?checkout=1" : "/login?redirect=/pricing?checkout=1");
  };

  return (
    <section id="pricing" className="relative px-6 py-24 md:py-32">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-br from-indigo-200/30 via-violet-200/20 to-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto text-center mb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-slate-200 text-xs font-medium text-slate-600 shadow-sm mb-5"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Pricing
        </motion.div>
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900">
          Choose Your{" "}
          <span className="bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
            Financial Intelligence
          </span>
        </h2>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          From everyday tracking to elite AI wealth forecasting. Cancel anytime.
        </p>

        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-white/80 backdrop-blur border border-slate-200 shadow-sm">
          {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`relative px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                cycle === c ? "text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cycle === c && (
                <motion.div
                  layoutId="pricing-preview-pill"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-md shadow-indigo-500/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative capitalize">{c}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const amount = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
              whileHover={{ y: -6 }}
              className={`relative rounded-3xl bg-gradient-to-br ${plan.gradient} ${plan.ring} p-7 shadow-xl shadow-slate-900/5 ${
                plan.highlight ? "md:scale-[1.03] md:-translate-y-2" : ""
              } transition-shadow hover:shadow-2xl hover:shadow-indigo-500/10`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/40">
                  {plan.badge}
                </div>
              )}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${
                    plan.id === "elite"
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                      : plan.id === "pro"
                      ? "bg-gradient-to-br from-indigo-500 to-blue-500"
                      : "bg-gradient-to-br from-slate-700 to-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.tagline}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-slate-900">
                  ₹{amount.toLocaleString("en-IN")}
                </span>
                {amount > 0 && (
                  <span className="text-sm text-slate-500 ml-1">
                    /{cycle === "yearly" ? "year" : "month"}
                  </span>
                )}
              </div>

              <Button
                onClick={() => handleSelect(plan.id)}
                className={`mt-5 w-full rounded-xl py-5 font-semibold shadow-lg transition-all ${
                  plan.id === "elite"
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-violet-500/30"
                    : plan.id === "pro"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/30"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20"
                } hover:scale-[1.02]`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              <ul className="mt-6 space-y-2.5">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-10">
        <button
          onClick={() => navigate("/pricing")}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
        >
          See full comparison →
        </button>
      </div>
    </section>
  );
}
