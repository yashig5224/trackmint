import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import {
  AlertTriangle, Search, Sparkles, TrendingDown, TrendingUp,
  Coffee, Tv, ShoppingBag, CreditCard, Heart,
} from "lucide-react";

/* Wallet visual — clean, NO blur, side-by-side */
const Wallet = ({
  mode,
  fill,
}: {
  mode: "leak" | "vault";
  fill: number; // 0..1
}) => {
  const isVault = mode === "vault";
  const items =
    mode === "leak"
      ? [
          { icon: Coffee, label: "Starbucks daily", amt: "−₹420" },
          { icon: Tv, label: "Netflix x2", amt: "−₹799" },
          { icon: ShoppingBag, label: "Impulse buy", amt: "−₹1,250" },
          { icon: CreditCard, label: "Late fee", amt: "−₹350" },
        ]
      : [
          { icon: Sparkles, label: "Duplicate sub cancelled", amt: "+₹799" },
          { icon: TrendingUp, label: "Budget kept this week", amt: "+₹1,200" },
          { icon: Heart, label: "Smart swap suggested", amt: "+₹420" },
          { icon: Sparkles, label: "Auto-funded goal", amt: "+₹2,000" },
        ];

  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      <motion.div
        animate={{ opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 4, repeat: Infinity }}
        className={`absolute -inset-6 rounded-[40px] blur-2xl ${
          isVault
            ? "bg-gradient-to-br from-emerald-200/70 via-sky-200/60 to-violet-200/50"
            : "bg-gradient-to-br from-rose-200/70 via-amber-200/50 to-rose-100/40"
        }`}
      />
      <div className="relative rounded-[28px] bg-white border border-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
        {/* header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                isVault
                  ? "bg-gradient-to-br from-emerald-400 to-sky-500"
                  : "bg-gradient-to-br from-rose-400 to-amber-400"
              }`}
            >
              {isVault ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {isVault ? "Your Vault" : "Your Wallet"}
              </div>
              <div className="text-sm font-bold text-slate-900">
                {isVault ? "Lumo protected" : "Quietly leaking"}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              isVault ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {isVault ? "+18%" : "−24%"}
          </span>
        </div>

        {/* meter */}
        <div className="px-5 pt-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {isVault ? "Saved this month" : "Lost this month"}
            </span>
            <span
              className={`font-display text-xl font-bold ${isVault ? "text-emerald-600" : "text-rose-500"}`}
            >
              {isVault ? "+₹4,219" : "−₹2,819"}
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.round(fill * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className={`absolute inset-y-0 left-0 ${
                isVault
                  ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-500"
                  : "bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400"
              }`}
            />
          </div>
        </div>

        {/* item list */}
        <ul className="px-3 py-4 space-y-1.5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.li
                key={it.label}
                initial={{ opacity: 0, x: isVault ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: 0.15 * i, duration: 0.5 }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  isVault ? "bg-emerald-50/60" : "bg-rose-50/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isVault ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{it.label}</span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    isVault ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {it.amt}
                </span>
              </motion.li>
            );
          })}
        </ul>

        {/* footer mood */}
        <div
          className={`px-5 py-3 text-[11px] font-medium border-t ${
            isVault
              ? "border-emerald-100 bg-emerald-50/40 text-emerald-700"
              : "border-rose-100 bg-rose-50/40 text-rose-700"
          }`}
        >
          {isVault ? "🌱 Calm. In control. Compounding." : "😮‍💨 Stressed. Confused. Bleeding."}
        </div>
      </div>
    </div>
  );
};

const stories = [
  {
    problem: "Silent overspending",
    solution: "Real-time alerts catch you before the swipe.",
    icon: AlertTriangle,
    tint: "from-rose-500 to-amber-500",
  },
  {
    problem: "Ghost subscriptions",
    solution: "Lumo auto-detects recurring drains — and cancels them.",
    icon: Search,
    tint: "from-violet-500 to-fuchsia-500",
  },
  {
    problem: "Zero clarity",
    solution: "Raw transactions become beautiful weekly stories.",
    icon: Sparkles,
    tint: "from-sky-500 to-indigo-500",
  },
];

const ProblemSolution = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const bgY = useTransform(p, [0, 1], [40, -120]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-32">
      {/* backdrop */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,100%,98%)] via-white to-[hsl(160,100%,98%)]" />
        <div className="absolute top-[10%] left-[8%] w-72 h-72 rounded-full bg-rose-100/60 blur-3xl" />
        <div className="absolute top-[45%] right-[8%] w-80 h-80 rounded-full bg-emerald-100/60 blur-3xl" />
      </motion.div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6">
        {/* heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 md:mb-20"
        >
          <p className="text-[11px] tracking-[0.3em] uppercase text-foreground/55 mb-3 font-semibold">
            ✦ The Story
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] leading-[1.02]">
            From{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-amber-500">
              leaking money
            </span>
            <br />
            to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500">
              quietly building wealth.
            </span>
          </h2>
          <p className="mt-5 text-foreground/65 max-w-xl mx-auto text-base md:text-lg">
            Same income. Same life. Radically different outcome — once Lumo plugs the leaks.
          </p>
        </motion.div>

        {/* before / after — crisp, no blur, with a glowing arrow between */}
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-6 items-center">
          {/* BEFORE */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-2 mb-4 justify-center">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-bold tracking-wider uppercase">
                Before · Without Lumo
              </span>
            </div>
            <Wallet mode="leak" fill={0.85} />
          </motion.div>

          {/* arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden md:flex flex-col items-center gap-3"
          >
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(220,90%,60%)] via-[hsl(260,85%,65%)] to-[hsl(150,70%,55%)] shadow-[0_15px_40px_-10px_rgba(120,90,220,0.5)] flex items-center justify-center">
              <motion.span
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-white/70"
              />
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-600">
              Lumo
            </div>
          </motion.div>

          {/* AFTER */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4 justify-center">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold tracking-wider uppercase">
                After · With Lumo
              </span>
            </div>
            <Wallet mode="vault" fill={0.7} />
          </motion.div>
        </div>

        {/* story cards */}
        <div className="relative mt-20 grid grid-cols-1 md:grid-cols-3 gap-5">
          {stories.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.problem}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                whileHover={{ y: -6 }}
                className="relative rounded-3xl p-6 bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_60px_-25px_rgba(79,70,229,0.25)] overflow-hidden group"
              >
                <div
                  className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${it.tint} opacity-25 blur-3xl group-hover:opacity-50 transition-opacity`}
                />
                <div
                  className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${it.tint} text-white flex items-center justify-center shadow-lg mb-4`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="relative font-display text-lg font-semibold text-slate-400 line-through mb-2">
                  {it.problem}
                </p>
                <p className="relative text-foreground/80 leading-relaxed text-sm">{it.solution}</p>
                <div className="relative mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
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
