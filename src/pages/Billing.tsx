import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Crown, Calendar, CreditCard, ExternalLink, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { Link, Navigate } from "react-router-dom";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { toast } from "sonner";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

const PLAN_NAMES: Record<string, { name: string; tier: "pro" | "elite" }> = {
  pro_monthly: { name: "FinTrack AI Pro (Monthly)", tier: "pro" },
  pro_yearly: { name: "FinTrack AI Pro (Yearly)", tier: "pro" },
  elite_monthly: { name: "FinTrack AI Elite (Monthly)", tier: "elite" },
  elite_yearly: { name: "FinTrack AI Elite (Yearly)", tier: "elite" },
};

export default function Billing() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, tier, loading } = useSubscription();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setPayments((data as Payment[]) || []));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login?redirect=/billing" replace />;

  const planMeta = subscription?.price_id ? PLAN_NAMES[subscription.price_id] : null;
  const isElite = planMeta?.tier === "elite";

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/billing`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Failed");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <PaymentTestModeBanner />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
          Manage Subscription
        </h1>
        <p className="text-slate-500 mt-2">Plan, billing & payment history.</p>

        {/* Current plan */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-3xl bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/30 border border-slate-200 p-8 shadow-xl shadow-slate-900/5 relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-indigo-300/20 to-violet-300/20 rounded-full blur-3xl" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                    isElite
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                      : tier === "pro"
                      ? "bg-gradient-to-br from-indigo-500 to-blue-500"
                      : "bg-gradient-to-br from-slate-700 to-slate-900"
                  }`}
                >
                  {isElite ? (
                    <Crown className="w-5 h-5 text-white" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                    Current Plan
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {planMeta?.name || (loading ? "Loading…" : "Starter (Free)")}
                  </h2>
                </div>
              </div>
              {subscription && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>
                      {subscription.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                      <strong className="text-slate-900">
                        {subscription.current_period_end
                          ? new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : subscription.status === "past_due"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {subscription.status}
                    </span>
                    {subscription.cancel_at_period_end && (
                      <span className="text-xs text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Cancellation scheduled
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {subscription ? (
                <Button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                >
                  {portalLoading ? "Opening…" : "Manage Billing"}
                  <ExternalLink className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Link to="/pricing">
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/30">
                    Upgrade Plan
                  </Button>
                </Link>
              )}
              <Link to="/pricing">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  {subscription ? "Change Plan" : "See Plans"}
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Payment history */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" /> Payment history
          </h3>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {payments.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">
                No payments yet. Your transactions will appear here.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Amount</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-700">
                        {new Date(p.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {p.currency.toUpperCase() === "INR" ? "₹" : "$"}
                        {Number(p.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.payment_status === "succeeded"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
