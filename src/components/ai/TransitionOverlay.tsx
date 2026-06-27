import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface TransitionOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

const TransitionOverlay = ({ isVisible, onComplete }: TransitionOverlayProps) => {
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(onComplete, 1100);
    return () => clearTimeout(t);
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white/85 backdrop-blur-xl"
        >
          {/* Expanding pastel aurora */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.6, 2.4], opacity: [0, 1, 0.6] }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute inset-0 m-auto w-[60vmin] h-[60vmin] rounded-full blur-[80px]"
            style={{
              background:
                "conic-gradient(from 0deg, #a78bfa, #60a5fa, #34d399, #fbbf24, #f472b6, #a78bfa)",
              opacity: 0.45,
            }}
          />

          {/* Particle burst */}
          {Array.from({ length: 26 }).map((_, i) => {
            const angle = (i / 26) * Math.PI * 2;
            const dist = 280 + (i % 5) * 30;
            return (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: [0, 1, 0],
                  scale: [0.6, 1.2, 0.4],
                }}
                transition={{ duration: 1.0, ease: "easeOut", delay: 0.05 }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ["#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#fbbf24"][i % 5],
                  boxShadow: "0 0 14px currentColor",
                  color: ["#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#fbbf24"][i % 5],
                }}
              />
            );
          })}

          {/* Glowing sweep line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
            className="absolute left-0 right-0 top-1/2 h-[2px] origin-left"
            style={{
              background:
                "linear-gradient(90deg, transparent, #a78bfa, #60a5fa, transparent)",
              boxShadow: "0 0 24px rgba(167,139,250,0.7)",
            }}
          />

          {/* Center title */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.08, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="relative z-10 text-center px-6"
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
              className="text-6xl sm:text-7xl mb-5 drop-shadow"
            >
              ✨
            </motion.div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              Entering your financial world
            </h1>
            <p className="text-gray-500 font-medium">Calibrating Lumo AI to your persona…</p>

            <motion.div className="w-64 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden mt-7">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.9, ease: "circOut" }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransitionOverlay;
