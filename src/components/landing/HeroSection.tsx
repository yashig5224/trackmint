import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.97]);

  return (
    <section
      ref={ref}
      className="relative min-h-[90vh] sm:min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Soft pastel blobs */}
      <div className="absolute top-[20%] left-[5%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-[hsl(262,83%,58%/0.06)] blur-[100px]" />
      <div className="absolute bottom-[20%] right-[5%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-[hsl(217,91%,60%/0.05)] blur-[120px]" />

      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 text-center px-4 sm:px-6 max-w-5xl"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 sm:mb-8 font-medium"
        >
          Personal Finance, Reimagined
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-[8.5rem] font-bold tracking-[-0.04em] leading-[0.9]"
        >
          Smarter money
          <br />
          decisions.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed"
        >
          AI-powered insights that help you save more, spend smarter, and reach
          your financial goals faster.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 sm:mt-12"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm font-medium hover:opacity-90 transition-all duration-300 hover:shadow-lg"
          >
            Try FinTrack AI
            <span className="text-lg">→</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-5 h-8 border-2 border-muted-foreground/20 rounded-full flex items-start justify-center p-1"
        >
          <div className="w-1 h-2 bg-muted-foreground/40 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
