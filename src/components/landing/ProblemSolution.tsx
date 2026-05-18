import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "framer-motion";
import { useRef, useState, useMemo } from "react";
import { AlertTriangle, Search, Sparkles, TrendingDown, TrendingUp, Coffee, Tv, ShoppingBag, CreditCard } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Animated counter that interpolates with scroll progress
   ───────────────────────────────────────────────────────────── */
const ScrollNumber = ({
  progress,
  from,
  to,
  prefix = "",
}: {
  progress: any;
  from: number;
  to: number;
  prefix?: string;
}) => {
  const [val, setVal] = useState(from);
  const v = useTransform(progress, [0, 1], [from, to]);
  useMotionValueEvent(v, "change", (latest) => setVal(latest as number));
  return (
    <span>
      {prefix}
      {Math.round(val).toLocaleString("en-IN")}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────
   Animated "leak" droplets falling out of a wallet card
   ───────────────────────────────────────────────────────────── */
const ExpenseLeaks = () => {
  const leaks = useMemo(
    () =>
      [
        { icon: Coffee, label: "Starbucks", amt: "-₹420", delay: 0 },
        { icon: Tv, label: "Netflix x2", amt: "-₹799", delay: 0.6 },
        { icon: ShoppingBag, label: "Impulse buy", amt: "-₹1,250", delay: 1.2 },
        { icon: CreditCard, label: "Late fee", amt: "-₹350", delay: 1.8 },
      ],
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none">
      {leaks.map((l, i) => {
        const Icon = l.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, 60, 120, 200] }}
            transition={{ duration: 4, delay: l.delay, repeat: Infinity, ease: "easeIn" }}
            className="absolute left-1/2 -translate-x-1/2 top-12 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-rose-100 shadow-[0_8px_20px_-8px_rgba(244,63,94,0.35)]"
            style={{ marginLeft: i % 2 === 0 ? -60 : 60 }}
          >
            <Icon className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[11px] font-medium text-slate-700">{l.label}</span>
            <span className="text-[11px] font-bold text-rose-500">{l.amt}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

/* Rising savings particles for the AFTER side */
const SavingsRise = () => {
  const wins = useMemo(
    () =>
      [
        { label: "Subs cancelled", amt: "+₹799" },
        { label: "Budget kept", amt: "+₹1,200" },
        { label: "Smart swap", amt: "+₹420" },
        { label: "Goal funded", amt: "+₹2,000" },
      ],
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none">
      {wins.map((w, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: [0, 1, 1, 0], y: [60, 0, -60, -140] }}
          transition={{ duration: 4.5, delay: i * 0.9, repeat: Infinity, ease: "easeOut" }}
          className="absolute left-1/2 -translate-x-1/2 bottom-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-emerald-100 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.35)]"
          style={{ marginLeft: i % 2 === 0 ? -70 : 70 }}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-medium text-slate-700">{w.label}</span>
          <span className="text-[11px] font-bold text-emerald-600">{w.amt}</span>
        </motion.div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Wallet / Vault visual that morphs from leaking → sealed
   ───────────────────────────────────────────────────────────── */
const WalletCard = ({
  variant,
  fillProgress,
}: {
  variant: "leak" | "vault";
  fillProgress: any;
}) => {
  const fillH = useTransform(fillProgress, [0, 1], ["18%", "88%"]);
  const isVault = variant === "vault";
  return (
    <div className="relative w-full aspect-[4/5] max-w-[320px] mx-auto">
      {/* glow */}
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`absolute -inset-6 rounded-[40px] blur-2xl ${
          isVault
            ? "bg-gradient-to-br from-emerald-200/70 via-sky-200/60 to-violet-200/60"
            : "bg-gradient-to-br from-rose-200/70 via-amber-200/50 to-rose-100/40"
        }`}
      />
      {/* card */}
      <div className="relative w-full h-full rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] overflow-hidden">
        {/* header */}
        <div className="px-5 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isVault
                  ? "bg-gradient-to-br from-emerald-400 to-sky-500 text-white"
                  : "bg-gradient-to-br from-rose-400 to-amber-400 text-white"
              }`}
            >
              {isVault ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {isVault ? "Your Vault" : "Your Wallet"}
              </div>
              <div className="text-sm font-bold text-slate-900">
                {isVault ? "Lumo protected" : "Leaking money"}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
              isVault
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {isVault ? "ON TRACK" : "−24%"}
          </span>
        </div>

        {/* fill meter */}
        <div className="absolute inset-x-0 bottom-0 h-[78%] mx-5 mb-5 rounded-2xl overflow-hidden border border-slate-200/70 bg-slate-50/60">
          <motion.div
            style={{ height: fillH }}
            className={`absolute inset-x-0 bottom-0 ${
              isVault
                ? "bg-gradient-to-t from-emerald-500 via-teal-400 to-indigo-400"
                : "bg-gradient-to-t from-rose-500 via-pink-400 to-amber-300"
            }`}
          >
            {/* shimmer wave */}
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          </motion.div>
          {/* label */}
          <div className="absolute inset-x-0 top-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              {isVault ? "Saved this month" : "Lost this month"}
            </div>
          </div>
        </div>

        {/* leak / rise overlay */}
        {isVault ? <SavingsRise /> : <ExpenseLeaks />}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Section
   ───────────────────────────────────────────────────────────── */
const items = [
  {
    problem: "Silent overspending",
    solution: "Smart alerts catch you before you cross the line.",
    icon: AlertTriangle,
    tint: "from-rose-500 to-amber-500",
  },
  {
    problem: "Ghost subscriptions",
    solution: "Lumo auto-detects recurring drains and cancels what you don't use.",
    icon: Search,
    tint: "from-violet-500 to-fuchsia-500",
  },
  {
    problem: "Zero clarity",
    solution: "AI turns raw transactions into clear, beautiful weekly stories.",
    icon: Sparkles,
    tint: "from-sky-500 to-indigo-500",
  },
];

const ProblemSolution = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // smooth progress
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 });

  // parallax bands
  const bgY = useTransform(p, [0, 1], [40, -160]);
  const titleY = useTransform(p, [0, 0.6], [60, -20]);

  // Before → After morph happens between 0.25 → 0.65 of the section
  // Keep BOTH cards fully visible and crisp — only the fill meters and a soft highlight diverge.
  const morph = useTransform(p, [0.25, 0.65], [0, 1]);
  const leakScale = useTransform(morph, [0, 1], [1.02, 0.97]);
  const vaultScale = useTransform(morph, [0, 1], [0.97, 1.02]);
  const leakHighlight = useTransform(morph, [0, 1], [1, 0.55]);
  const vaultHighlight = useTransform(morph, [0, 1], [0.55, 1]);

  // counters
  const lostNum = useTransform(morph, [0, 1], [2819, 2819]); // displayed on "before"
  const savedNum = morph; // 0 → 1 maps to 0 → 4200

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 md:py-32"
      style={{ minHeight: "180vh" }}
    >
      {/* Parallax mesh backdrop */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,100%,98%)] via-white to-[hsl(160,100%,98%)]" />
        <div className="absolute top-[10%] left-[8%] w-72 h-72 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="absolute top-[45%] right-[8%] w-80 h-80 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute bottom-[10%] left-1/3 w-72 h-72 rounded-full bg-sky-100/50 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </motion.div>

      {/* Heading */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6">
        <motion.div style={{ y: titleY }} className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] uppercase text-foreground/55 mb-3 font-semibold">
            ✦ The Story
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] leading-[1.02]">
            From <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-amber-500">leaking money</span>
            <br />
            to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500">
              quietly building wealth.
            </span>
          </h2>
          <p className="mt-5 text-foreground/65 max-w-xl mx-auto text-base md:text-lg">
            Scroll to watch your wallet transform. Same income, same life — radically different
            outcome with Lumo.
          </p>
        </motion.div>

        {/* Sticky stage with before / after morph */}
        <div className="relative h-[120vh]">
          <div className="sticky top-24 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* BEFORE */}
            <motion.div style={{ opacity: leakHighlight, scale: leakScale }} className="relative">
              <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-bold tracking-wider uppercase">
                  Before · Without Lumo
                </span>
              </div>
              <WalletCard variant="leak" fillProgress={useTransform(morph, [0, 1], [1, 0])} />
              <div className="mt-6 text-center md:text-left">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Lost in 30 days
                </div>
                <div className="font-display text-4xl font-bold text-rose-500">
                  −₹<ScrollNumber progress={lostNum} from={0} to={2819} />
                </div>
                <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto md:mx-0">
                  Forgotten subs, late fees, impulse buys — small leaks adding up silently.
                </p>
              </div>
            </motion.div>

            {/* AFTER */}
            <motion.div style={{ opacity: vaultHighlight, scale: vaultScale }} className="relative">
              <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold tracking-wider uppercase">
                  After · With Lumo
                </span>
              </div>
              <WalletCard variant="vault" fillProgress={morph} />
              <div className="mt-6 text-center md:text-left">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Saved in 30 days
                </div>
                <div className="font-display text-4xl font-bold text-emerald-600">
                  +₹<ScrollNumber progress={savedNum} from={0} to={4200} />
                </div>
                <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto md:mx-0">
                  Plugged leaks, automatic budgets, AI nudges — money quietly compounding for you.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Story cards revealed as user keeps scrolling */}
        <div className="relative mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.problem}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="relative rounded-3xl p-6 bg-white/80 backdrop-blur-xl border border-white shadow-[0_20px_60px_-25px_rgba(79,70,229,0.25)] overflow-hidden group"
              >
                <div
                  className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${it.tint} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity`}
                />
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${it.tint} text-white flex items-center justify-center shadow-lg mb-4`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-display text-lg font-semibold text-slate-400 line-through mb-2">
                  {it.problem}
                </p>
                <p className="text-foreground/80 leading-relaxed text-sm">{it.solution}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <Sparkles className="w-3.5 h-3.5" /> Solved by Lumo
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
