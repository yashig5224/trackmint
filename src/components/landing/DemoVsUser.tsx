import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, User, Check, ArrowRight } from "lucide-react";

const cards = [
  {
    title: "Demo Mode",
    subtitle: "Explore in seconds",
    icon: Sparkles,
    gradient: "from-[hsl(220,100%,96%)] via-[hsl(260,100%,97%)] to-[hsl(280,100%,98%)]",
    accent: "220,90%,55%",
    glow: "from-[hsl(220,90%,70%,0.4)] to-[hsl(280,80%,75%,0.3)]",
    badge: "No signup",
    items: [
      "Preloaded AI conversations",
      "Sample dashboards & charts",
      "All 6 personas unlocked",
      "Zero signup required",
    ],
    cta: "Try Demo",
    href: "/dashboard",
  },
  {
    title: "User Mode",
    subtitle: "Make it yours",
    icon: User,
    gradient: "from-[hsl(150,80%,95%)] via-[hsl(170,80%,96%)] to-[hsl(190,80%,97%)]",
    accent: "150,70%,40%",
    glow: "from-[hsl(150,80%,70%,0.4)] to-[hsl(190,80%,75%,0.3)]",
    badge: "Recommended",
    items: [
      "Real transaction tracking",
      "Personalized AI insights",
      "Goals synced across devices",
      "Lumo learns your patterns",
    ],
    cta: "Sign Up Free",
    href: "/login?signup=1",
  },
];

const DemoVsUser = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(220,100%,99%)] to-white" />
      <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-[hsl(220,100%,92%,0.3)] blur-3xl" />
      <div className="absolute bottom-20 right-1/3 w-96 h-96 rounded-full bg-[hsl(150,100%,92%,0.3)] blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-semibold">
            ✦ Choose Your Mode
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            Play first, or{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              go all in
            </span>.
          </h2>
          <p className="mt-4 text-foreground/65 max-w-lg mx-auto">
            Same Lumo. Different commitment. You can always upgrade later.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, duration: 0.7 }}
                whileHover={{ y: -10 }}
                className="group relative"
              >
                {/* glow halo */}
                <motion.div
                  animate={{ opacity: [0.35, 0.7, 0.35] }}
                  transition={{ duration: 5, repeat: Infinity, delay: i * 0.5 }}
                  className={`absolute -inset-4 rounded-[40px] blur-2xl bg-gradient-to-br ${c.glow} opacity-60 group-hover:opacity-100 transition-opacity`}
                />
                {/* animated border */}
                <div className="relative rounded-3xl p-[1.5px] overflow-hidden">
                  <motion.div
                    aria-hidden
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-1/2 opacity-70 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `conic-gradient(from 0deg, hsl(${c.accent},0.6), transparent 40%, hsl(${c.accent},0.4) 70%, transparent)`,
                    }}
                  />
                  <div className={`relative rounded-3xl p-7 md:p-9 bg-gradient-to-br ${c.gradient} overflow-hidden`}>
                    {/* badge */}
                    <span
                      className="absolute top-5 right-5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-md border border-white"
                      style={{ color: `hsl(${c.accent})` }}
                    >
                      {c.badge}
                    </span>

                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.55, 0.3] }}
                      transition={{ duration: 5, repeat: Infinity, delay: i * 0.5 }}
                      className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl"
                      style={{ background: `hsl(${c.accent},0.3)` }}
                    />

                    <div className="relative">
                      <motion.div
                        whileHover={{ rotate: 8, scale: 1.08 }}
                        className="w-14 h-14 rounded-2xl bg-white shadow-[0_15px_30px_-12px_rgba(15,23,42,0.2)] border border-white flex items-center justify-center mb-4"
                      >
                        <Icon className="w-6 h-6" style={{ color: `hsl(${c.accent})` }} />
                      </motion.div>
                      <div
                        className="text-xs font-bold uppercase tracking-[0.2em] mb-1"
                        style={{ color: `hsl(${c.accent})` }}
                      >
                        {c.subtitle}
                      </div>
                      <h3 className="font-display text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                        {c.title}
                      </h3>
                      <ul className="space-y-3 mb-8">
                        {c.items.map((item, j) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + j * 0.08 }}
                            className="flex items-start gap-3 text-sm text-foreground/80"
                          >
                            <div
                              className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: `hsl(${c.accent},0.15)` }}
                            >
                              <Check className="w-3 h-3" style={{ color: `hsl(${c.accent})` }} strokeWidth={3} />
                            </div>
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                      <Link
                        to={c.href}
                        className="group/btn inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-white text-sm font-bold text-foreground hover:-translate-y-0.5 transition-all shadow-[0_15px_30px_-10px_rgba(15,23,42,0.2)] hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)]"
                      >
                        {c.cta}
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DemoVsUser;
