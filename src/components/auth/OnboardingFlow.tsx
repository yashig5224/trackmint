import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, User, Briefcase, Target, CreditCard, ChevronLeft } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const QUESTIONS = [
  {
    id: "name",
    title: "What should we call you?",
    subtitle: "Let's make this personal.",
    icon: User,
    type: "text",
    placeholder: "Your preferred name",
  },
  {
    id: "profession",
    title: "What's your primary profession?",
    subtitle: "This helps us tailor your income strategies.",
    icon: Briefcase,
    type: "options",
    options: ["Student", "Employed", "Self-Employed / Business", "Freelancer", "Other"],
  },
  {
    id: "income",
    title: "What's your monthly income range?",
    subtitle: "Your data is bank-grade encrypted.",
    icon: Wallet, // we'll map below
    type: "options",
    options: ["Under $2,000", "$2,000 - $5,000", "$5,000 - $10,000", "$10,000+"],
  },
  {
    id: "habit",
    title: "What's your biggest spending habit?",
    subtitle: "Be honest, your AI coach won't judge.",
    icon: CreditCard,
    type: "options",
    options: ["Food Delivery & Dining", "Shopping & Fashion", "Tech & Gadgets", "Travel & Experiences", "Subscriptions"],
  },
  {
    id: "goal",
    title: "What's your top financial goal right now?",
    subtitle: "We'll build a roadmap to get you there.",
    icon: Target,
    type: "options",
    options: ["Build an Emergency Fund", "Invest for Wealth", "Pay Off Debt", "Save for a Big Purchase", "Just Better Tracking"],
  }
];

// Reusing Wallet icon via component mapping to avoid import issues
import { Wallet } from "lucide-react";

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentQ = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const handleNext = (val: string) => {
    setAnswers({ ...answers, [currentQ.id]: val });
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setInputValue("");
    } else {
      setIsAnalyzing(true);
      setTimeout(() => {
        onComplete();
      }, 3500); // 3.5s cinematic analysis
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Soft immersive blobs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/30 rounded-full blur-[100px] animate-pulse"
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30 relative"
          >
            <Sparkles className="w-10 h-10 text-white" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-3xl border-2 border-white/20 border-t-white/80"
            />
          </motion.div>

          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-display font-bold text-gray-900 mb-4"
          >
            Synthesizing your financial DNA...
          </motion.h2>
          
          <div className="space-y-3 w-full">
            {[
              "Analyzing spending patterns",
              "Aligning goals with wealth strategies",
              "Initializing your AI persona"
            ].map((text, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + (i * 0.8) }}
                className="flex items-center gap-3 text-gray-500 bg-white/50 glass-card px-4 py-3 rounded-xl"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-medium">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-50/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-8 flex items-center justify-between relative z-10 max-w-4xl w-full mx-auto">
        <button
          onClick={handleBack}
          className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-400" />
        </button>

        {/* Progress bar */}
        <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gray-900"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-20 relative z-10 max-w-2xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
                <currentQ.icon className="w-8 h-8 text-gray-900" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-4 tracking-tight">
                {currentQ.title}
              </h1>
              <p className="text-lg text-gray-500">{currentQ.subtitle}</p>
            </div>

            {currentQ.type === "text" && (
              <form 
                onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) handleNext(inputValue); }}
                className="space-y-4"
              >
                <input
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentQ.placeholder}
                  className="w-full text-center text-2xl px-6 py-6 rounded-[24px] bg-white border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all placeholder:text-gray-300"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-medium text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:hover:bg-gray-900"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}

            {currentQ.type === "options" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options?.map((opt, i) => (
                  <motion.button
                    key={opt}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleNext(opt)}
                    className="p-6 text-left rounded-[24px] bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group flex flex-col gap-2"
                  >
                    <span className="font-medium text-gray-900 group-hover:text-black">{opt}</span>
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
