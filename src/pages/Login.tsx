import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  ChevronRight,
  User,
  Mail,
  Loader2,
  TrendingUp,
  LineChart,
  Lock,
  Eye,
  EyeOff,
  Check,
  CircleDollarSign,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────── */
/*  Subtle enterprise backdrop — soft mesh + dotted grid          */
/* ────────────────────────────────────────────────────────────── */
const Backdrop = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Top-left wash */}
    <div className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-gradient-to-br from-indigo-100/70 via-sky-100/40 to-transparent blur-3xl" />
    {/* Bottom-right wash */}
    <div className="absolute -bottom-40 -right-40 w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-emerald-100/60 via-cyan-100/30 to-transparent blur-3xl" />
    {/* Dotted grid */}
    <div
      className="absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.07) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    />
  </div>
);

/* ────────────────────────────────────────────────────────────── */
/*  Floating finance glyphs — calm, slow, decorative              */
/* ────────────────────────────────────────────────────────────── */
const FloatingGlyphs = () => {
  const glyphs = useMemo(
    () => [
      { Icon: TrendingUp, top: "12%", left: "8%", delay: 0, tint: "text-emerald-400/60" },
      { Icon: BarChart3, top: "70%", left: "14%", delay: 1.2, tint: "text-sky-400/60" },
      { Icon: CircleDollarSign, top: "22%", left: "78%", delay: 0.6, tint: "text-indigo-400/60" },
      { Icon: LineChart, top: "62%", left: "82%", delay: 1.8, tint: "text-violet-400/60" },
    ],
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {glyphs.map(({ Icon, top, left, delay, tint }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.8, delay },
            y: { duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay },
          }}
          style={{ top, left }}
          className={`absolute ${tint}`}
        >
          <Icon className="w-10 h-10" strokeWidth={1.2} />
        </motion.div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/*  Clean input with floating label                               */
/* ────────────────────────────────────────────────────────────── */
const Field = ({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  showToggle,
  toggled,
  onToggle,
}: {
  icon: any;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  showToggle?: boolean;
  toggled?: boolean;
  onToggle?: () => void;
}) => {
  const [focus, setFocus] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative">
      <Icon
        className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
          focus ? "text-slate-900" : "text-slate-400"
        }`}
        strokeWidth={1.8}
      />
      <input
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="peer w-full pl-10 pr-10 pt-5 pb-2 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 outline-none transition-all text-slate-900 text-sm"
      />
      <label
        className={`pointer-events-none absolute left-10 transition-all ${
          focus || filled
            ? "top-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
        }`}
      >
        {label}
      </label>
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          {toggled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
      {!showToggle && filled && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center"
        >
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </motion.div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/*  Login / Signup / Reset                                        */
/* ────────────────────────────────────────────────────────────── */
type Mode = "in" | "up" | "reset";

const Login = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && profile) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }
      navigate(profile.onboarding_completed ? "/app" : "/onboarding", { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success(
          `Welcome${fullName ? ", " + fullName.split(" ")[0] : ""}! Check your email to confirm.`
        );
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your inbox.");
        setMode("in");
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

  const strength =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = [
    "bg-slate-200",
    "bg-rose-400",
    "bg-amber-400",
    "bg-sky-500",
    "bg-emerald-500",
  ][strength];

  const heading =
    mode === "in" ? "Welcome back" : mode === "up" ? "Create your account" : "Reset password";
  const sub =
    mode === "in"
      ? "Sign in to your FinTrack workspace."
      : mode === "up"
      ? "Start your AI-powered financial workspace."
      : "We'll email you a secure reset link.";
  const cta =
    mode === "in"
      ? "Sign in"
      : mode === "up"
      ? "Create account"
      : "Send reset link";

  return (
    <div className="min-h-screen relative bg-[#fafafa] flex">
      <Backdrop />
      <FloatingGlyphs />

      {/* ─────────── LEFT — brand & trust panel (desktop) ─────────── */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 xl:p-16">
        <Link to="/" className="relative inline-flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-slate-900">
            FinTrack AI
          </span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl xl:text-5xl font-display font-semibold leading-[1.1] tracking-tight text-slate-900">
            The financial OS for modern operators.
          </h1>
          <p className="mt-5 text-base text-slate-500 leading-relaxed">
            Connect accounts, automate categorisation, and let your AI coach
            uncover savings — all in one calm, fast workspace.
          </p>

          {/* Trust card */}
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-20px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Bank-grade security
                </div>
                <div className="text-sm font-medium text-slate-900">
                  256-bit encryption · SOC 2 ready
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { k: "Users", v: "24k+" },
                { k: "Saved", v: "₹3.2Cr" },
                { k: "Uptime", v: "99.99%" },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border border-slate-100 bg-white py-2">
                  <div className="text-sm font-semibold text-slate-900">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    {s.k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative text-xs text-slate-400 flex items-center gap-4">
          <span>© FinTrack AI</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <Link to="/" className="hover:text-slate-700 transition-colors">
            Back to site
          </Link>
        </div>
      </div>

      {/* ─────────── RIGHT — auth panel ─────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 relative">
        <Link
          to="/"
          className="lg:hidden absolute top-5 left-5 inline-flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            FinTrack AI
          </span>
        </Link>

        <div className="w-full max-w-md relative">
          {/* Card */}
          <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_-30px_rgba(15,23,42,0.25)]">
            {/* Mode tabs (only for in/up) */}
            {mode !== "reset" && (
              <div className="relative mb-7 p-1 rounded-lg bg-slate-100 grid grid-cols-2 text-sm font-medium">
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-sm"
                  style={{ left: mode === "up" ? "calc(50% + 0.125rem)" : "0.25rem" }}
                />
                <button
                  type="button"
                  onClick={() => setMode("in")}
                  className={`relative z-10 py-2 rounded-md transition-colors ${
                    mode === "in" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("up")}
                  className={`relative z-10 py-2 rounded-md transition-colors ${
                    mode === "up" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-2xl sm:text-[28px] font-display font-semibold tracking-tight text-slate-900">
                  {heading}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">{sub}</p>
              </motion.div>
            </AnimatePresence>

            {mode !== "reset" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="w-full mt-6 mb-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                    or
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className={mode === "reset" ? "mt-6 space-y-3.5" : "space-y-3.5"}>
              <AnimatePresence initial={false}>
                {mode === "up" && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Field
                      icon={User}
                      label="Full name"
                      value={fullName}
                      onChange={setFullName}
                      required
                      autoComplete="name"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                icon={Mail}
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                required
                autoComplete="email"
              />

              {mode !== "reset" && (
                <Field
                  icon={Lock}
                  label="Password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  showToggle
                  toggled={showPwd}
                  onToggle={() => setShowPwd((v) => !v)}
                />
              )}

              {/* Password strength */}
              <AnimatePresence>
                {mode === "up" && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 px-0.5"
                  >
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < strength ? strengthColor : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Password strength</span>
                      <span className="font-medium text-slate-600">{strengthLabel}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === "in" && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mt-2 transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {cta}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {mode === "reset" && (
                <button
                  type="button"
                  onClick={() => setMode("in")}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-900 transition-colors pt-1"
                >
                  ← Back to sign in
                </button>
              )}
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" /> Continue as demo guest
                <ChevronRight className="w-3 h-3" />
              </Link>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                By continuing you agree to our Terms and acknowledge our Privacy
                Policy. Bank-grade encryption · Your data stays yours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
