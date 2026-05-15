import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Wallet, ChevronRight, User, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Redirect.
  useEffect(() => {
    if (authLoading) return;
    if (user && profile) {
      navigate(profile.onboarding_completed ? "/app" : "/onboarding", { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex overflow-hidden">
      <div className="flex w-full min-h-screen">
        {/* Left visual */}
        <div className="hidden lg:flex w-1/2 relative bg-white/50 border-r border-border/40 overflow-hidden items-center justify-center p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-100/20 to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl animate-pulse" />
          <div className="relative z-10 w-full max-w-lg space-y-12">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight">FinTrack AI</span>
            </Link>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-display font-bold leading-[1.1] tracking-tight text-gray-900">
              Your premium <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400">financial operating system.</span>
            </motion.h1>
            <p className="text-lg text-gray-500 leading-relaxed max-w-md">Personalized AI coaching, real-time insights and gamified goals — all built around <em>your</em> money.</p>
          </div>
        </div>

        {/* Right form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
          <div className="absolute lg:hidden top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50 to-transparent" />
          <div className="w-full max-w-md relative z-10">
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-12">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">FinTrack AI</span>
            </Link>

            <motion.div layout className="glass-card bg-white/80 p-8 sm:p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-white">
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">{isSignUp ? "Create your account" : "Welcome back"}</h2>
                <p className="text-gray-500">{isSignUp ? "Begin your financial journey." : "Sign in to your dashboard."}</p>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full mb-5 py-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Full Name</label>
                      <div className="relative">
                        <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all" placeholder="Jane Doe" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none" placeholder="hello@example.com" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Password</label>
                  <div className="relative">
                    <ShieldCheck className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none" placeholder="••••••••" />
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors mt-2 shadow-lg shadow-gray-900/20 disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>{isSignUp ? "Create Account" : "Sign In"} <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-gray-900 hover:underline inline-flex items-center gap-1">
                    {isSignUp ? "Sign in" : "Sign up"} <ChevronRight className="w-3 h-3" />
                  </button>
                </p>
                <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <Wallet className="w-3 h-3" /> Continue as demo guest
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
