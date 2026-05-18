import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { personaGrid, personaCells } from "@/assets/personas";

const featured = [
  { id: "student",  name: "Student Saver",  tagline: "Lean budgets · big dreams",         level: 4, match: 92, tint: "from-[hsl(220,100%,92%)] to-[hsl(200,100%,95%)]", accent: "hsl(220,90%,55%)" },
  { id: "investor", name: "Smart Investor", tagline: "Portfolio · risk · growth",         level: 7, match: 88, tint: "from-[hsl(150,80%,92%)] to-[hsl(170,80%,95%)]", accent: "hsl(150,70%,40%)" },
  { id: "hustler",  name: "Side Hustler",   tagline: "Multiple streams · tax-smart",      level: 6, match: 85, tint: "from-[hsl(280,80%,93%)] to-[hsl(300,80%,95%)]", accent: "hsl(280,80%,55%)" },
];

const hiddenGlimpses = ["salary", "minimalist", "luxury", "family", "crypto"];

const PersonasShowcase = () => {
  return (
    <section id="personas" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(220,100%,99%)] to-white" />

      {/* Ambient orbs */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-[hsl(220,100%,88%,0.5)] to-transparent blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-[hsl(280,80%,90%,0.5)] to-transparent blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-20"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-foreground/55 mb-3 font-medium">
            ✦ Discover Your Identity
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            Choose your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] via-[hsl(260,85%,60%)] to-[hsl(290,80%,62%)]">
              financial identity
            </span>
          </h2>
          <p className="mt-4 text-foreground/65 max-w-xl mx-auto">
            10+ AI personas — each with a unique coaching style.
            Unlock yours by signing in.
          </p>
        </motion.div>

        {/* Cinematic slider with faded edges */}
        <div className="relative">
          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 z-20 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 z-20 bg-gradient-to-l from-white via-white/80 to-transparent" />

          <div className="flex gap-5 md:gap-7 overflow-x-auto scrollbar-none px-4 md:px-12 py-6 snap-x snap-mandatory">
            {/* Glimpse left */}
            <GlimpseCard id={hiddenGlimpses[0]} side="left" />

            {featured.map((p, i) => {
              const cell = personaCells[p.id];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.6 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative shrink-0 w-[260px] sm:w-[300px] snap-center"
                >
                  {/* Animated gradient border */}
                  <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-white via-[hsl(260,80%,90%)] to-white opacity-80 group-hover:opacity-100 transition-opacity" />

                  <div className="relative rounded-[2rem] p-5 bg-white/85 backdrop-blur-xl border border-white shadow-[0_18px_50px_-18px_rgba(120,90,220,0.25)] group-hover:shadow-[0_28px_70px_-18px_rgba(120,90,220,0.4)] transition-all duration-500 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${p.tint} opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />

                    {/* Persona artwork */}
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/70 border border-white mb-4"
                      style={{
                        backgroundImage: `url(${personaGrid})`,
                        backgroundSize: "400% 200%",
                        backgroundPosition: `${cell.x} ${cell.y}`,
                      }}
                    >
                      {/* Level badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold tracking-wide">
                        LVL {p.level}
                      </div>
                      {/* Particles on hover */}
                      {[0, 1, 2].map((k) => (
                        <motion.span
                          key={k}
                          className="absolute w-1 h-1 rounded-full opacity-0 group-hover:opacity-100"
                          style={{ left: `${20 + k * 30}%`, bottom: "10%", background: p.accent }}
                          animate={{ y: [0, -40, -60], opacity: [0, 1, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, delay: k * 0.3 }}
                        />
                      ))}
                    </motion.div>

                    <div className="relative">
                      <h3 className="font-display text-lg font-bold tracking-tight">{p.name}</h3>
                      <p className="text-xs text-foreground/65 mt-0.5">{p.tagline}</p>

                      {/* AI compatibility */}
                      <div className="mt-4 flex items-center justify-between text-[10px] text-foreground/55 mb-1.5">
                        <span className="uppercase tracking-wider font-semibold">AI Match</span>
                        <span className="font-bold" style={{ color: p.accent }}>{p.match}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-foreground/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${p.match}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 + i * 0.1, duration: 1.2, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${p.accent}, hsl(260,80%,65%))` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Glimpse right */}
            <GlimpseCard id={hiddenGlimpses[1]} side="right" />

            {/* Unlock more card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
              whileHover={{ scale: 1.03 }}
              className="relative shrink-0 w-[240px] sm:w-[280px] snap-center"
            >
              <Link
                to="/login?signup=1"
                className="block relative rounded-[2rem] p-5 h-full min-h-[380px] bg-gradient-to-br from-white via-[hsl(260,100%,98%)] to-[hsl(220,100%,98%)] border-2 border-dashed border-[hsl(260,50%,80%)] hover:border-[hsl(260,80%,65%)] transition-all overflow-hidden flex flex-col items-center justify-center text-center group"
              >
                {/* Pulsing aura */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-8 rounded-full bg-gradient-to-br from-[hsl(220,100%,88%,0.6)] to-[hsl(280,80%,88%,0.6)] blur-2xl"
                />
                <div className="relative">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)] flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(120,90,220,0.5)]">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div className="font-display text-base font-bold tracking-tight">
                    + 7 More Personas
                  </div>
                  <div className="text-xs text-foreground/60 mt-1 mb-4">
                    Await your discovery
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white text-[11px] font-medium text-foreground/75 group-hover:bg-white">
                    <Sparkles className="w-3 h-3 text-[hsl(260,80%,60%)]" />
                    Unlock yours
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Glimpse far right */}
            <GlimpseCard id={hiddenGlimpses[2]} side="right" />
          </div>
        </div>
      </div>
    </section>
  );
};

const GlimpseCard = ({ id, side }: { id: string; side: "left" | "right" }) => {
  const cell = personaCells[id];
  if (!cell) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="shrink-0 w-[120px] sm:w-[160px] snap-start"
      style={{ filter: "blur(2px)" }}
    >
      <div
        className={`relative rounded-[2rem] h-[340px] bg-white/60 border border-white/80 overflow-hidden ${
          side === "left" ? "opacity-50" : "opacity-50"
        }`}
      >
        <div
          className="absolute inset-3 rounded-2xl bg-white/50"
          style={{
            backgroundImage: `url(${personaGrid})`,
            backgroundSize: "400% 200%",
            backgroundPosition: `${cell.x} ${cell.y}`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
      </div>
    </motion.div>
  );
};

export default PersonasShowcase;
