import { motion } from "framer-motion";
import { UserPlus, ListPlus, Target, Brain, Sparkles, TrendingUp } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Sign up", desc: "Choose your persona in 30 seconds." },
  { icon: ListPlus, title: "Add transactions", desc: "Manual or auto — Lumo categorizes it all." },
  { icon: Target, title: "Set goals", desc: "Dream big. Lumo breaks it into quests." },
  { icon: Brain, title: "AI analyzes", desc: "Lumo finds patterns you'd never spot." },
  { icon: Sparkles, title: "Smart insights", desc: "Daily nudges that compound over time." },
  { icon: TrendingUp, title: "Financial growth", desc: "Level up your wealth, your way." },
];

const HowItWorks = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(260,80%,99%)] to-white" />
      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-medium">✦ Your Financial Evolution</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            Watch your money{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              transform
            </span>.
          </h2>
        </motion.div>

        <div className="relative">
          {/* Glowing connecting line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[hsl(260,60%,80%)] to-transparent hidden md:block" />

          <div className="space-y-10 md:space-y-16">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6 }}
                  className={`relative flex items-center gap-6 md:gap-10 ${left ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  <div className="flex-1 md:text-right md:pr-8 md:max-w-[40%] order-2 md:order-none" style={!left ? { textAlign: "left", paddingLeft: "2rem", paddingRight: 0 } : {}}>
                    <div className="text-xs font-bold text-[hsl(260,70%,60%)] mb-1">STEP {i + 1}</div>
                    <h3 className="font-display text-xl md:text-2xl font-bold mb-1.5">{s.title}</h3>
                    <p className="text-sm text-foreground/65 leading-relaxed">{s.desc}</p>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-white via-[hsl(220,100%,98%)] to-[hsl(280,100%,98%)] border border-white/90 shadow-[0_15px_40px_-12px_rgba(120,90,220,0.3)] flex items-center justify-center z-10"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute inset-0 rounded-3xl border-2 border-[hsl(260,80%,70%)]"
                    />
                    <Icon className="w-7 h-7 text-[hsl(260,70%,55%)]" />
                  </motion.div>

                  <div className="flex-1 hidden md:block" />
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
