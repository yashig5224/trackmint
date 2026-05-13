import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Wallet, ChevronRight, User } from "lucide-react";
import OnboardingFlow from "@/components/auth/OnboardingFlow";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [phase, setPhase] = useState<"auth" | "onboarding">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      setPhase("onboarding");
    } else {
      // Direct login skips onboarding
      navigate("/dashboard");
    }
  };

  const handleOnboardingComplete = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex overflow-hidden selection:bg-primary/10">
      <AnimatePresence mode="wait">
        {phase === "auth" ? (
          <motion.div
            key="auth-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full h-screen"
          >
            {/* Left Side - Cinematic Visuals (Desktop) */}
            <div className="hidden lg:flex w-1/2 relative bg-white/50 border-r border-border/40 overflow-hidden items-center justify-center p-12">
              {/* Background effects */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-100/20 to-transparent" />
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow" />

              <div className="relative z-10 w-full max-w-lg space-y-12">
                <Link to="/" className="inline-flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display text-2xl font-bold tracking-tight">FinTrack AI</span>
                </Link>

                <div className="space-y-6">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-5xl font-display font-bold leading-[1.1] tracking-tight text-gray-900"
                  >
                    Your premium <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400">
                      financial operating system.
                    </span>
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-lg text-gray-500 leading-relaxed max-w-md"
                  >
                    Experience the future of personal finance with emotionally intelligent AI that adapts to your unique lifestyle and goals.
                  </motion.p>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="glass-card p-5 rounded-[24px] bg-white/60">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Smart Growth</h3>
                    <p className="text-sm text-gray-500 mt-1">AI-driven insights</p>
                  </div>
                  <div className="glass-card p-5 rounded-[24px] bg-white/60">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Bank Grade</h3>
                    <p className="text-sm text-gray-500 mt-1">Enterprise security</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
              {/* Mobile background blob */}
              <div className="absolute lg:hidden top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50 to-transparent" />
              
              <div className="w-full max-w-md relative z-10">
                <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-12">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display text-xl font-bold tracking-tight">FinTrack AI</span>
                </Link>

                <motion.div 
                  layout
                  className="glass-card bg-white/80 p-8 sm:p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-white"
                >
                  <motion.div layout className="mb-8">
                    <motion.h2 layout className="text-3xl font-display font-bold text-gray-900 mb-2">
                      {isSignUp ? "Begin your journey" : "Welcome back"}
                    </motion.h2>
                    <motion.p layout className="text-gray-500">
                      {isSignUp ? "Enter your details to create an account." : "Enter your credentials to access your dashboard."}
                    </motion.p>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence mode="popLayout">
                      {isSignUp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                          animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
                          exit={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <label className="text-sm font-medium text-gray-700 block mb-2">Full Name</label>
                          <div className="relative">
                            <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all placeholder:text-gray-400"
                              placeholder="John Doe"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div layout>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Email Address</label>
                      <div className="relative">
                        <Wallet className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all placeholder:text-gray-400"
                          placeholder="hello@example.com"
                        />
                      </div>
                    </motion.div>

                    <motion.div layout>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Password</label>
                      <div className="relative">
                        <ShieldCheck className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all placeholder:text-gray-400"
                          placeholder="••••••••"
                        />
                      </div>
                    </motion.div>

                    <motion.button
                      layout
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      className="w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors mt-6 shadow-lg shadow-gray-900/20"
                    >
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </form>

                  <motion.div layout className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                      {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="font-medium text-gray-900 hover:underline inline-flex items-center gap-1"
                      >
                        {isSignUp ? "Sign in" : "Sign up"}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="onboarding-phase"
            initial={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full min-h-screen"
          >
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
