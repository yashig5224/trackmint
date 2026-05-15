import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, User, Briefcase, Target, CreditCard, ChevronLeft, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PERSONAS = [
  { id: "student", name: "Student Saver", emoji: "🎒" },
  { id: "salary", name: "Salary Warrior", emoji: "💼" },
  { id: "investor", name: "Smart Investor", emoji: "📈" },
  { id: "hustler", name: "Side Hustler", emoji: "🚀" },
  { id: "minimalist", name: "Minimalist", emoji: "🪴" },
  { id: "family", name: "Family Guardian", emoji: "🏡" },
  { id: "luxury", name: "Luxury Dreamer", emoji: "✨" },
  { id: "crypto", name: "Crypto Explorer", emoji: "🪙" },
];

const QUESTIONS: Array<{
  id: string; title: string; subtitle: string; icon: any; type: "text" | "options" | "number" | "personas"; placeholder?: string; options?: string[];
}> = [
  { id: "name", title: "What should we call you?", subtitle: "Let's make this personal.", icon: User, type: "text", placeholder: "Your preferred name" },
  { id: "profession", title: "What's your primary profession?", subtitle: "Helps us tailor income strategies.", icon: Briefcase, type: "options", options: ["Student", "Employed", "Self-Employed", "Freelancer", "Other"] },
  { id: "monthly_income", title: "What's your monthly income?", subtitle: "Bank-grade encrypted. Used to personalize budgets.", icon: Wallet, type: "number", placeholder: "e.g. 50000" },
  { id: "habit", title: "What's your biggest spending habit?", subtitle: "Be honest — your AI coach won't judge.", icon: CreditCard, type: "options", options: ["Food & Dining", "Shopping", "Tech & Gadgets", "Travel", "Subscriptions"] },
  { id: "primary_goal", title: "What's your top financial goal?", subtitle: "We'll build a roadmap.", icon: Target, type: "options", options: ["Emergency Fund", "Invest for Wealth", "Pay Off Debt", "Big Purchase", "Better Tracking"] },
  { id: "persona", title: "Choose your AI persona", subtitle: "Your Lumo AI will adapt to this archetype.", icon: Sparkles, type: "personas" },
];

export default function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const currentQ = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const finish = async (final: Record<string, string>) => {
    if (!user) { toast.error("Please sign in first"); navigate("/login"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: final.name || null,
      monthly_income: final.monthly_income ? Number(final.monthly_income) : 0,
      selected_persona: final.persona || "salary",
      primary_goal: final.primary_goal || null,
      onboarding_data: final,
      onboarding_completed: true,
    }).eq("id", user.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await refreshProfile();
    toast.success("Welcome aboard!");
    if (onComplete) onComplete(); else navigate("/app", { replace: true });
  };

  const handleNext = (val: string) => {
    const next = { ...answers, [currentQ.id]: val };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setInputValue("");
    } else {
      finish(next);
    }
  };

  const handleBack = () => { if (step > 0) setStep(step - 1); };

  if (saving) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/30 rounded-full blur-[100px] animate-pulse" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Synthesizing your financial DNA…</h2>
          <p className="text-gray-500">Setting up your personalized OS</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-50/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <header className="px-6 py-8 flex items-center justify-between relative z-10 max-w-4xl w-full mx-auto">
        <button onClick={handleBack} className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${step === 0 ? 'opacity-0 pointer-events-none' : ''}`}>
          <ChevronLeft className="w-6 h-6 text-gray-400" />
        </button>
        <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gray-900" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-20 relative z-10 max-w-2xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="w-full">
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
                <currentQ.icon className="w-8 h-8 text-gray-900" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-4 tracking-tight">{currentQ.title}</h1>
              <p className="text-lg text-gray-500">{currentQ.subtitle}</p>
            </div>

            {(currentQ.type === "text" || currentQ.type === "number") && (
              <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) handleNext(inputValue); }} className="space-y-4">
                <input type={currentQ.type === "number" ? "number" : "text"} autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={currentQ.placeholder} className="w-full text-center text-2xl px-6 py-6 rounded-[24px] bg-white border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300" />
                <button type="submit" disabled={!inputValue.trim()} className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-medium text-lg flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50">
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}

            {currentQ.type === "options" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options?.map((opt, i) => (
                  <motion.button key={opt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => handleNext(opt)} className="p-6 text-left rounded-[24px] bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
                    <span className="font-medium text-gray-900">{opt}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {currentQ.type === "personas" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PERSONAS.map((p, i) => (
                  <motion.button key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => handleNext(p.id)} className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-gray-300 transition-all text-center">
                    <div className="text-3xl mb-2">{p.emoji}</div>
                    <div className="text-xs font-semibold text-gray-900 leading-tight">{p.name}</div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
