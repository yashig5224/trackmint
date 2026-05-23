import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ArrowRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500"
          initial={{
            x: `${50 + (Math.random() - 0.5) * 10}%`,
            y: "50%",
            opacity: 0,
            scale: 0,
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 120}%`,
            y: `${50 + (Math.random() - 0.5) * 120}%`,
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 1.5,
            delay: Math.random() * 0.6,
            repeat: Infinity,
            repeatDelay: 1.5,
          }}
        />
      ))}
    </div>
  );
}

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();
  const { refresh, isPro } = useSubscription();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Poll for subscription record (webhook may take a moment)
    const interval = setInterval(() => refresh(), 1500);
    const timeout = setTimeout(() => clearInterval(interval), 15000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refresh]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 1100),
      setTimeout(() => setStage(3), 1900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-slate-900">No session found</h1>
          <p className="text-slate-500 mt-2">We couldn't find a checkout session to confirm.</p>
          <Link to="/pricing">
            <Button className="mt-6">Back to Pricing</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/40 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-indigo-300/30 via-violet-300/20 to-fuchsia-300/20 rounded-full blur-3xl" />
      <Particles />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl shadow-indigo-500/20 p-10 text-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="success"
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ type: "spring", stiffness: 200, damping: 15, duration: 0.8 }}
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-6"
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </motion.div>
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: stage >= 1 ? 1 : 0, y: 0 }}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-700 mb-3">
            <Sparkles className="w-3 h-3" /> Premium Unlocked
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: stage >= 1 ? 1 : 0, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-3xl font-semibold tracking-tight text-slate-900"
        >
          Welcome to FinTrack AI {isPro ? "Pro" : ""} ✨
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          className="text-slate-500 mt-3"
        >
          Your premium features are unlocking now. Lumo is ready when you are.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: stage >= 3 ? 1 : 0, y: 0 }}
          className="mt-8 flex flex-col gap-2"
        >
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 py-6 rounded-xl"
          >
            Open My Dashboard
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Link to="/billing">
            <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900">
              View subscription details
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
