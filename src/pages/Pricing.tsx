import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ArrowRight, Shield, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientLayer from "@/components/landing/AmbientLayer";
import { PLANS, COMPARISON_ROWS, FAQ_ITEMS, BillingCycle, Plan } from "@/lib/plans";
import { CheckoutDialog } from "@/components/payments/CheckoutDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

function PriceDisplay({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
  const amount = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const period = cycle === "yearly" ? "/year" : "/month";
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-5xl font-semibold tracking-tight text-slate-900">
        ₹{amount.toLocaleString("en-IN")}
      </span>
      {amount > 0 && <span className="text-sm text-slate-500 ml-1">{period}</span>}
    </div>
  );
}

function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-4xl md:text-5xl font-semibold tracking-tight bg-gradient-to-br from-slate-900 to-indigo-600 bg-clip-text text-transparent"
    >
      {prefix}
      {to.toLocaleString("en-IN")}
      {suffix}
    </motion.span>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscription();

  const handleSelect = (plan: Plan) => {
    if (plan.id === "free") {
      navigate(user ? "/dashboard" : "/login");
      return;
    }
    if (!user) {
      navigate("/login?redirect=/pricing");
      return;
    }
    const priceId = cycle === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceId) return;
    setCheckoutPriceId(priceId);
    setCheckoutPlan(plan.name);
  };

  const savings = useMemo(() => {
    const pro = PLANS.find((p) => p.id === "pro")!;
    const yearlyEq = pro.priceMonthly * 12;
    return Math.round(((yearlyEq - pro.priceYearly) / yearlyEq) * 100);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 relative">
      <AmbientLayer />
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-br from-indigo-200/40 via-violet-200/30 to-blue-200/30 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-slate-200 text-xs font-medium text-slate-600 shadow-sm mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Premium AI-powered finance
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-semibold tracking-tight text-slate-900 leading-[1.05]"
          >
            Choose Your{" "}
            <span className="bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
              Financial Intelligence
            </span>{" "}
            Level.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Unlock AI-powered budgeting, forecasting, spending analytics and a financial coach
            that actually understands your money.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Button
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 rounded-full px-6"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
            >
              Start Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6 bg-white/80 backdrop-blur border-slate-200"
              onClick={() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" })}
            >
              Compare Plans
            </Button>
          </motion.div>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 inline-flex items-center gap-1 p-1 rounded-full bg-white/80 backdrop-blur border border-slate-200 shadow-sm"
          >
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
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-md shadow-indigo-500/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative capitalize">{c}</span>
              </button>
            ))}
            <AnimatePresence>
              {cycle === "yearly" && (
                <motion.span
                  initial={{ opacity: 0, x: -10, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: "auto" }}
                  exit={{ opacity: 0, x: -10, width: 0 }}
                  className="ml-1 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"
                >
                  Save {savings}%
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrent = tier === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                whileHover={{ y: -6 }}
                className={`relative rounded-3xl bg-gradient-to-br ${plan.gradient} ${plan.ring} p-8 shadow-xl shadow-slate-900/5 ${
                  plan.highlight ? "md:scale-[1.03] md:-translate-y-2" : ""
                } transition-shadow hover:shadow-2xl hover:shadow-indigo-500/10`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/40">
                    {plan.badge}
                  </div>
                )}
                {plan.highlight && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-400/10 via-transparent to-violet-400/10" />
                )}

                <div className="relative">
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

                  <PriceDisplay plan={plan} cycle={cycle} />
                  {plan.id !== "free" && cycle === "yearly" && (
                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                      ≈ ₹{Math.round(plan.priceYearly / 12)}/mo billed yearly
                    </p>
                  )}

                  <Button
                    onClick={() => handleSelect(plan)}
                    disabled={isCurrent}
                    className={`mt-6 w-full rounded-xl py-6 font-semibold shadow-lg transition-all ${
                      plan.id === "elite"
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-violet-500/30"
                        : plan.id === "pro"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/30"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20"
                    } ${isCurrent ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                  >
                    {isCurrent ? "Current Plan" : plan.cta}
                    {!isCurrent && <ArrowRight className="w-4 h-4 ml-1.5" />}
                  </Button>

                  <ul className="mt-7 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ROI / Value */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/40 border border-slate-200/60 p-10 md:p-14 shadow-xl shadow-slate-900/5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              How much you save with FinTrack AI
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Real numbers from real users. AI coaching pays for itself in the first month.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-10">
            {[
              { icon: Wallet, label: "Avg monthly savings", value: <Counter to={4800} prefix="₹" /> },
              { icon: TrendingUp, label: "Better budgeting", value: <Counter to={2.3} suffix="x" /> },
              { icon: Shield, label: "Less overspending", value: <Counter to={18} suffix="%" /> },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl bg-white/80 backdrop-blur border border-slate-200/60 p-6 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-md">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {value}
                <p className="text-sm text-slate-500 mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-10">
            Compare every feature
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-indigo-50/50 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-4 font-medium text-slate-600">Feature</th>
                    {PLANS.map((p) => (
                      <th key={p.id} className="text-left px-6 py-4 font-semibold text-slate-900">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`border-t border-slate-100 transition-colors hover:bg-indigo-50/30 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-6 py-4 text-slate-700 font-medium">{row.label}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-6 py-4 text-slate-700">
                          {v === "✓" ? (
                            <Check className="w-4 h-4 text-indigo-600" strokeWidth={3} />
                          ) : v === "—" ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            v
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-32">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-10">
            Frequently asked
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-slate-200 rounded-2xl bg-white/70 backdrop-blur px-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <AccordionTrigger className="text-left font-medium text-slate-900 hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-4">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-center text-sm text-slate-500 mt-8">
            Already subscribed?{" "}
            <Link to="/billing" className="text-indigo-600 font-medium hover:underline">
              Manage your subscription →
            </Link>
          </p>
        </div>
      </section>

      <Footer />

      <CheckoutDialog
        open={!!checkoutPriceId}
        onOpenChange={(v) => !v && setCheckoutPriceId(null)}
        priceId={checkoutPriceId}
        planName={checkoutPlan}
      />
    </div>
  );
}
