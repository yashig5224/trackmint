import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import BackgroundFX from "./BackgroundFX";
import HeroOrbit from "./HeroOrbit";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const ROTATING = ["Track.", "Predict.", "Grow.", "Automate."];

const HeroSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen pt-28 pb-16 md:pt-32 overflow-hidden">
      <BackgroundFX variant="vivid" />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center"
      >
        {/* LEFT */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 text-xs font-medium text-foreground/80 shadow-sm mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(150,80%,50%)] animate-pulse" />
            Powered by Lumo AI · v2.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-bold tracking-[-0.045em] leading-[0.98] text-foreground"
          >
            Your AI{" "}
            <span className="relative inline-block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,95%,55%)] via-[hsl(260,85%,60%)] to-[hsl(300,80%,65%)]">
                Financial
              </span>
              <motion.span
                aria-hidden
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-1 left-0 right-0 h-[3px] origin-left rounded-full bg-gradient-to-r from-[hsl(220,95%,60%)] via-[hsl(260,85%,65%)] to-[hsl(300,80%,70%)]"
              />
            </span>
            <br />
            Universe.
          </motion.h1>

          <div className="mt-5 flex items-center justify-center lg:justify-start gap-2 text-xl sm:text-2xl font-display font-semibold">
            <span className="text-foreground/45">It learns to</span>
            <span className="relative inline-block min-w-[8ch] text-left">
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING[wordIdx]}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,95%,55%)] via-[hsl(260,85%,60%)] to-[hsl(300,80%,65%)]"
                >
                  {ROTATING[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-base sm:text-lg text-foreground/65 leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            An intelligent finance ecosystem that understands your spending,
            predicts your future, and helps you build wealth effortlessly.
          </motion.p>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4"
          >
            <Link
              to="/login?signup=1"
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[hsl(220,95%,55%)] via-[hsl(260,85%,60%)] to-[hsl(290,80%,62%)] text-white font-medium shadow-[0_12px_40px_-10px_rgba(120,90,220,0.55)] hover:shadow-[0_18px_50px_-10px_rgba(120,90,220,0.7)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
              <span className="relative">Start Your Journey</span>
              <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 text-foreground font-medium hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[hsl(260,80%,60%)]" />
              Try Demo Mode
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-10 grid grid-cols-3 gap-3 sm:gap-6 max-w-md mx-auto lg:mx-0"
          >
            {[
              { v: "₹12M+", l: "Tracked" },
              { v: "20K+", l: "Users" },
              { v: "4.9★", l: "Rating" },
            ].map((s) => (
              <div key={s.l} className="text-center lg:text-left">
                <div className="font-display font-bold text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                  {s.v}
                </div>
                <div className="text-[11px] sm:text-xs text-foreground/55">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT — floating AI financial ecosystem */}
        <HeroOrbit />
      </motion.div>

    </section>
  );
};

export default HeroSection;
