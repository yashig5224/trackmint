import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Wallet,
  ChevronRight,
  User,
  Mail,
  Loader2,
  TrendingUp,
  PiggyBank,
  Coins,
  LineChart,
  Bot,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import authBg from "@/assets/auth-bg.png";
import LumoMascotShared, { type LumoTrigger } from "@/components/lumo/LumoMascot";

/* ────────────────────────────────────────────────────────────── */
/*  Animated background — mesh gradient orbs + drifting rupees    */
/* ────────────────────────────────────────────────────────────── */
const AuroraBackdrop = ({ mode }: { mode: "in" | "up" }) => {
  const palette =
    mode === "in"
      ? ["from-sky-200/60", "from-violet-200/60", "from-emerald-200/50"]
      : ["from-emerald-200/60", "from-cyan-200/60", "from-amber-200/50"];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft animated mesh blobs */}
      <motion.div
        key={mode + "-a"}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full blur-3xl bg-gradient-to-br ${palette[0]} to-transparent`}
      />
      <motion.div
        key={mode + "-b"}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, x: [0, -50, 30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute top-1/3 -right-32 w-[560px] h-[560px] rounded-full blur-3xl bg-gradient-to-br ${palette[1]} to-transparent`}
      />
      <motion.div
        key={mode + "-c"}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, x: [0, 30, -40, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -bottom-40 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl bg-gradient-to-br ${palette[2]} to-transparent`}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
};

/* Drifting rupee/coin particles across the entire viewport */
const MoneyParticles = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: `${(i * 67) % 100}%`,
        delay: (i * 0.7) % 6,
        duration: 9 + (i % 5),
        size: 14 + ((i * 5) % 18),
        symbol: i % 3 === 0 ? "₹" : i % 3 === 1 ? "•" : "◇",
      })),
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "-20%", opacity: [0, 0.35, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ left: p.left, fontSize: p.size }}
          className="absolute font-display font-bold bg-gradient-to-b from-sky-500/70 via-violet-500/50 to-transparent bg-clip-text text-transparent"
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/*  Left panel — Lumo mascot + floating insight cards             */
/* ────────────────────────────────────────────────────────────── */
const InsightCard = ({
  delay,
  className,
  children,
}: {
  delay: number;
  className: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.92 }}
    animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
    transition={{
      opacity: { duration: 0.6, delay },
      scale: { duration: 0.6, delay },
      y: { duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay },
    }}
    className={`absolute backdrop-blur-2xl bg-white/70 border border-white/80 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] rounded-2xl px-4 py-3 ${className}`}
  >
    {children}
  </motion.div>
);

const LumoMascot = ({
  submitting,
  waving,
  errored,
}: {
  isSignUp: boolean;
  submitting: boolean;
  waving: boolean;
  errored?: boolean;
}) => {
  const trigger: LumoTrigger = errored
    ? "error"
    : waving
    ? "success"
    : submitting
    ? "loading"
    : "idle";
  return (
    <div className="relative">
      <LumoMascotShared trigger={trigger} size={220} />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/*  Animated input with floating label + focus glow               */
/* ────────────────────────────────────────────────────────────── */
const FancyInput = ({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  autoComplete,
}: {
  icon: any;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) => {
  const [focus, setFocus] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative">
      <motion.div
        animate={{
          boxShadow: focus
            ? "0 0 0 4px rgba(99,102,241,0.12), 0 8px 24px -8px rgba(99,102,241,0.35)"
            : "0 0 0 0px rgba(0,0,0,0)",
        }}
        className="relative rounded-2xl"
      >
        <Icon
          className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
            focus ? "text-indigo-500" : "text-slate-400"
          }`}
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
          className="peer w-full pl-12 pr-4 pt-5 pb-2 rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md focus:bg-white focus:border-indigo-400 outline-none transition-all text-slate-900"
        />
        <label
          className={`pointer-events-none absolute left-12 transition-all ${
            focus || filled
              ? "top-1.5 text-[10px] uppercase tracking-wider font-semibold text-indigo-500"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
          }`}
        >
          {label}
        </label>
        {filled && type !== "password" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"
          >
            <Check className="w-3 h-3" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/*  Money burst on submit — radial particle explosion             */
/* ────────────────────────────────────────────────────────────── */
const MoneyBurst = ({ show }: { show: boolean }) => {
  const items = useMemo(
    () => Array.from({ length: 18 }).map((_, i) => ({ id: i, a: (i / 18) * Math.PI * 2 })),
    []
  );
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          {items.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: Math.cos(p.a) * 380,
                y: Math.sin(p.a) * 380,
                opacity: 0,
                scale: 1.4,
                rotate: 360,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute font-display font-bold text-3xl bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-500 bg-clip-text text-transparent"
            >
              ₹
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

/* ────────────────────────────────────────────────────────────── */
/*  Main page                                                     */
/* ────────────────────────────────────────────────────────────── */
const Login = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [burst, setBurst] = useState(false);

  // Cursor parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const tiltX = useTransform(sy, [-1, 1], [6, -6]);
  const tiltY = useTransform(sx, [-1, 1], [-6, 6]);

  const onMouseMove = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

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
        setBurst(true);
        setTimeout(() => setBurst(false), 2600);
        toast.success(`Welcome to your AI financial universe${fullName ? ", " + fullName.split(" ")[0] : ""} ✨`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setBurst(true);
        setTimeout(() => setBurst(false), 2600);
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
    <div
      onMouseMove={onMouseMove}
      className="min-h-screen relative bg-gradient-to-br from-white via-sky-50/40 to-violet-50/40 overflow-hidden"
    >
      {/* Uploaded immersive scene background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={authBg}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/40 to-white/70" />
      </div>
      <AuroraBackdrop mode={isSignUp ? "up" : "in"} />
      <MoneyParticles />
      <MoneyBurst show={burst} />

      <div className="relative z-10 flex min-h-screen">
        {/* ─────────── LEFT — immersive visual ─────────── */}
        <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
          <motion.div
            style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 }}
            className="relative w-full max-w-xl"
          >
            <Link to="/" className="inline-flex items-center gap-2 mb-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
                FinTrack AI
              </span>
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl xl:text-6xl font-display font-bold leading-[1.05] tracking-tight text-slate-900"
            >
              Enter your <br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-500 bg-clip-text text-transparent">
                financial universe.
              </span>
            </motion.h1>
            <p className="mt-6 text-lg text-slate-500 max-w-md leading-relaxed">
              Personalized AI coaching, real-time insights and gamified goals — all built around{" "}
              <em>your</em> money.
            </p>

            {/* Mascot stage */}
            <div className="relative h-[360px] mt-10">
              <div className="absolute inset-0 flex items-center justify-center">
                <LumoMascot isSignUp={isSignUp} submitting={submitting} waving={burst} />
              </div>

              <InsightCard delay={0.2} className="top-2 left-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Saved this week
                    </div>
                    <div className="text-sm font-bold text-slate-900">+ ₹2,480</div>
                  </div>
                </div>
              </InsightCard>

              <InsightCard delay={0.5} className="top-10 right-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <LineChart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Budget health
                    </div>
                    <div className="text-sm font-bold text-slate-900">82 / 100 ↑</div>
                  </div>
                </div>
              </InsightCard>

              <InsightCard delay={0.8} className="bottom-6 left-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Lumo insight
                    </div>
                    <div className="text-sm font-bold text-slate-900">3 ways to save ₹1.2k</div>
                  </div>
                </div>
              </InsightCard>

              <InsightCard delay={1.1} className="bottom-0 right-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Goal: Macbook
                    </div>
                    <div className="text-sm font-bold text-slate-900">64% complete</div>
                  </div>
                </div>
              </InsightCard>
            </div>
          </motion.div>
        </div>

        {/* ─────────── RIGHT — auth panel ─────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
          <Link
            to="/"
            className="lg:hidden absolute top-6 left-6 inline-flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">FinTrack AI</span>
          </Link>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            style={{ rotateX: useTransform(sy, [-1, 1], [3, -3]), rotateY: useTransform(sx, [-1, 1], [-3, 3]), transformPerspective: 1200 }}
            className="w-full max-w-md relative"
          >
            {/* Animated gradient outline */}
            <div className="absolute -inset-px rounded-[34px] bg-gradient-to-br from-indigo-300/60 via-violet-300/60 to-sky-300/60 blur-md opacity-70" />
            <motion.div
              layout
              className="relative bg-white/80 backdrop-blur-2xl border border-white rounded-[32px] p-8 sm:p-10 shadow-[0_30px_80px_-30px_rgba(79,70,229,0.35)]"
            >
              {/* Mode toggle pill */}
              <div className="relative mb-8 p-1 rounded-full bg-slate-100/80 grid grid-cols-2 text-sm font-medium">
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute top-1 bottom-1 w-1/2 rounded-full bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.15)]"
                  style={{ left: isSignUp ? "50%" : "0.25rem", right: isSignUp ? "0.25rem" : "50%" }}
                />
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`relative z-10 py-2 rounded-full transition-colors ${
                    !isSignUp ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`relative z-10 py-2 rounded-full transition-colors ${
                    isSignUp ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isSignUp ? "up" : "in"}
                  initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.35 }}
                >
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">
                    {isSignUp ? "Start your journey" : "Welcome back"}
                  </h2>
                  <p className="text-slate-500 mb-8">
                    {isSignUp
                      ? "Your AI finance coach is waiting."
                      : "Sign in to enter your dashboard."}
                  </p>
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full mb-5 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm font-medium text-slate-700 disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-md"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                  or with email
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence initial={false}>
                  {isSignUp && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FancyInput
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

                <FancyInput
                  icon={Mail}
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />

                <FancyInput
                  icon={ShieldCheck}
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />

                {/* Password strength */}
                {isSignUp && password.length > 0 && (
                  <div className="flex gap-1.5 px-1">
                    {[0, 1, 2, 3].map((i) => {
                      const strength =
                        (password.length >= 6 ? 1 : 0) +
                        (/[A-Z]/.test(password) ? 1 : 0) +
                        (/[0-9]/.test(password) ? 1 : 0) +
                        (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
                      return (
                        <motion.div
                          key={i}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: i < strength ? 1 : 0.15 }}
                          className={`h-1 flex-1 rounded-full origin-left ${
                            i < strength
                              ? "bg-gradient-to-r from-indigo-500 to-emerald-500"
                              : "bg-slate-200"
                          }`}
                        />
                      );
                    })}
                  </div>
                )}

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="relative overflow-hidden w-full text-white py-4 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 mt-2 shadow-[0_15px_40px_-10px_rgba(79,70,229,0.6)] disabled:opacity-60 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500"
                >
                  {/* shine sweep */}
                  <motion.span
                    aria-hidden
                    initial={{ x: "-150%" }}
                    animate={{ x: "150%" }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                  />
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin relative" />
                  ) : (
                    <span className="relative inline-flex items-center gap-2">
                      {isSignUp ? "Start your financial journey" : "Continue to FinTrack AI"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <Wallet className="w-3 h-3" /> Continue as demo guest
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <Coins className="w-3 h-3" />
                <span>Bank-grade encryption · Your data stays yours</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
