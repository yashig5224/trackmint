import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { UserPlus, ListPlus, Target, Brain, Sparkles, TrendingUp } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Sign up", desc: "Pick your persona in 30 seconds.", tint: "220,90%,60%" },
  { icon: ListPlus, title: "Add transactions", desc: "Manual or auto — Lumo categorizes everything.", tint: "200,90%,55%" },
  { icon: Target, title: "Set goals", desc: "Dream big. Lumo breaks it into quests.", tint: "150,75%,45%" },
  { icon: Brain, title: "AI analyzes", desc: "Lumo finds patterns you'd never spot.", tint: "260,80%,62%" },
  { icon: Sparkles, title: "Smart insights", desc: "Daily nudges that compound silently.", tint: "330,80%,60%" },
  { icon: TrendingUp, title: "Financial growth", desc: "Level up your wealth, your way.", tint: "45,95%,55%" },
];

const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.85], ["0%", "100%"]);

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(260,80%,99%)] to-white" />
      <div className="absolute top-40 left-1/4 w-96 h-96 rounded-full bg-[hsl(220,100%,92%,0.4)] blur-3xl" />
      <div className="absolute bottom-40 right-1/4 w-96 h-96 rounded-full bg-[hsl(280,100%,94%,0.4)] blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-semibold">
            ✦ Your Journey
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            Six steps to a{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              wealthier you
            </span>.
          </h2>
        </motion.div>

        <div ref={ref} className="relative">
          {/* timeline rail */}
          <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-slate-200/70" />
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-8 md:left-1/2 md:-translate-x-1/2 top-0 w-px bg-gradient-to-b from-[hsl(220,90%,60%)] via-[hsl(260,85%,65%)] to-[hsl(150,70%,55%)] shadow-[0_0_20px_hsl(260,80%,70%)]"
          />

          <div className="space-y-12 md:space-y-20">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7 }}
                  className={`relative grid grid-cols-[64px_1fr] md:grid-cols-2 md:gap-12 items-center`}
                >
                  {/* node */}
                  <div className={`md:absolute md:left-1/2 md:-translate-x-1/2 z-10 ${left ? "md:order-1" : ""}`}>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="relative w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white border border-white shadow-[0_15px_40px_-12px_rgba(120,90,220,0.4)] flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, hsl(${s.tint},0.15), white)`,
                      }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.3 }}
                        className="absolute inset-0 rounded-3xl border-2"
                        style={{ borderColor: `hsl(${s.tint})` }}
                      />
                      <Icon className="w-7 h-7" style={{ color: `hsl(${s.tint})` }} />
                      <span
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-md"
                        style={{ background: `hsl(${s.tint})` }}
                      >
                        {i + 1}
                      </span>
                    </motion.div>
                  </div>

                  {/* card */}
                  <div
                    className={`${left ? "md:col-start-1 md:text-right md:pr-16" : "md:col-start-2 md:pl-16"}`}
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="rounded-3xl p-6 bg-white/90 backdrop-blur-xl border border-white shadow-[0_15px_45px_-20px_rgba(79,70,229,0.25)]"
                    >
                      <div
                        className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2"
                        style={{ color: `hsl(${s.tint})` }}
                      >
                        Step {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="font-display text-2xl font-bold mb-1.5 tracking-tight">
                        {s.title}
                      </h3>
                      <p className="text-sm text-foreground/65 leading-relaxed">{s.desc}</p>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
