import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Wallet, Bot, BarChart3, Target, FileBarChart, UserCog,
  Bell, Tags, Brain, Trophy, ArrowRight,
} from "lucide-react";

const features = [
  { icon: Wallet, title: "Smart Budgeting", desc: "AI-built budgets that adapt to your life.", tint: "220,95%,60%" },
  { icon: Bot, title: "Lumo AI Coach", desc: "Conversational answers to every money question.", tint: "280,80%,62%" },
  { icon: BarChart3, title: "Spending Analytics", desc: "See where every rupee goes, beautifully.", tint: "200,90%,55%" },
  { icon: Target, title: "Goal Quests", desc: "Gamified missions for every dream.", tint: "150,75%,45%" },
  { icon: FileBarChart, title: "Weekly Stories", desc: "Monthly recaps that actually read like a story.", tint: "25,90%,55%" },
  { icon: UserCog, title: "Persona Mode", desc: "Per-persona intelligence, your way.", tint: "330,80%,60%" },
  { icon: Bell, title: "Live Alerts", desc: "Catch overspending before it hurts.", tint: "0,80%,65%" },
  { icon: Tags, title: "Auto Categorize", desc: "Every transaction tagged in real-time.", tint: "190,80%,50%" },
  { icon: Brain, title: "AI Predictions", desc: "Forecast spending & savings ahead.", tint: "260,75%,60%" },
  { icon: Trophy, title: "XP & Streaks", desc: "Level up your money habits.", tint: "45,95%,55%" },
];

/* Left: animated workflow pipeline showing data flow into Lumo */
const FlowPipeline = () => {
  const nodes = [
    { label: "Bank sync", x: 12, y: 12, color: "220,90%,60%" },
    { label: "Receipts", x: 78, y: 18, color: "200,90%,55%" },
    { label: "Subs scan", x: 8, y: 52, color: "330,80%,60%" },
    { label: "Goals", x: 80, y: 60, color: "150,75%,45%" },
  ];
  return (
    <div className="relative w-full aspect-square max-w-[520px] mx-auto">
      {/* outer glow */}
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute inset-0 rounded-[40px] blur-3xl bg-gradient-to-br from-[hsl(220,90%,80%,0.35)] via-[hsl(260,80%,82%,0.35)] to-[hsl(150,70%,80%,0.3)]"
      />
      {/* canvas */}
      <div className="relative w-full h-full rounded-[36px] bg-white/70 backdrop-blur-2xl border border-white shadow-[0_30px_80px_-30px_rgba(120,90,220,0.35)] overflow-hidden">
        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#0f172a 1px,transparent 1px),linear-gradient(to bottom,#0f172a 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* SVG connector lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(220,90%,65%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(280,80%,68%)" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {nodes.map((n, i) => (
            <motion.path
              key={i}
              d={`M ${n.x + 6} ${n.y + 6} Q 50 50 50 50`}
              stroke="url(#flowGrad)"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="2 2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0.5] }}
              transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </svg>

        {/* traveling pulses */}
        {nodes.map((n, i) => (
          <motion.div
            key={`p-${i}`}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `hsl(${n.color})`,
              boxShadow: `0 0 14px hsl(${n.color})`,
              left: `${n.x + 6}%`,
              top: `${n.y + 6}%`,
            }}
            animate={{
              left: [`${n.x + 6}%`, "50%"],
              top: [`${n.y + 6}%`, "50%"],
              opacity: [0, 1, 0],
              scale: [0.6, 1.2, 0.4],
            }}
            transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* nodes */}
        {nodes.map((n) => (
          <div
            key={n.label}
            className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 border border-white shadow-md text-[10px] font-semibold text-slate-700"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${n.color})` }} />
            {n.label}
          </div>
        ))}

        {/* Lumo core */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[hsl(220,95%,65%)] via-[hsl(260,85%,68%)] to-[hsl(290,80%,70%)] shadow-[0_20px_60px_-10px_rgba(120,90,220,0.6)] flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-white/60"
            />
            <Bot className="w-10 h-10 text-white" />
          </motion.div>
          <div className="mt-3 text-center text-xs font-bold text-slate-700">Lumo AI Core</div>
        </div>

        {/* output ticker */}
        <div className="absolute left-4 right-4 bottom-4 rounded-2xl bg-white/90 border border-white shadow-sm px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Live output</div>
          <motion.div
            key="t1"
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-[11px] text-slate-700"
          >
            ✦ Cancelled Netflix duplicate · +₹799/mo
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const AbilitiesSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section id="features" ref={ref} className="relative py-24 md:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(220,100%,99%)] to-white" />
      <motion.div style={{ y }} className="absolute top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[hsl(220,100%,90%,0.35)] blur-[120px]" />
      <motion.div style={{ y }} className="absolute bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-[hsl(280,80%,92%,0.35)] blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-semibold">
            ✦ How Lumo Works
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            One brain.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              Ten superpowers.
            </span>
          </h2>
          <p className="mt-4 text-foreground/65 max-w-xl mx-auto">
            Your data flows in. Lumo turns it into clarity, foresight, and action — in real-time.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          {/* LEFT — animated workflow */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <FlowPipeline />
          </motion.div>

          {/* RIGHT — feature cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.04, duration: 0.45 }}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-2xl p-4 bg-white/85 backdrop-blur-xl border border-white shadow-[0_8px_24px_-12px_rgba(120,90,220,0.18)] hover:shadow-[0_18px_45px_-15px_rgba(120,90,220,0.3)] transition-all duration-300 overflow-hidden"
                >
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 5 + i * 0.3, repeat: Infinity }}
                    className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl"
                    style={{ background: `hsl(${f.tint},0.3)` }}
                  />
                  <div
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                    style={{ background: `linear-gradient(135deg, hsl(${f.tint},0.2), hsl(${f.tint},0.06))` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: `hsl(${f.tint})` }} />
                  </div>
                  <h3 className="relative font-display text-sm font-bold text-foreground leading-tight">{f.title}</h3>
                  <p className="relative text-[11px] text-foreground/65 mt-1 leading-snug">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AbilitiesSection;
