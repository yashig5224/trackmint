import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface TransitionOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

const TransitionOverlay = ({ isVisible, onComplete }: TransitionOverlayProps) => {
  const [loadingText, setLoadingText] = useState("Setting up your experience");
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isVisible) return;

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    const texts = [
      "Setting up your experience",
      "Loading your financial data",
      "Preparing AI Coach",
      "Almost ready",
    ];
    let textIdx = 0;
    const textInterval = setInterval(() => {
      textIdx = (textIdx + 1) % texts.length;
      setLoadingText(texts[textIdx]);
    }, 1200);

    const timer = setTimeout(onComplete, 3000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(textInterval);
      clearTimeout(timer);
    };
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        >
          {/* Light background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,97%)] via-background to-[hsl(220,30%,96%)]" />

          {/* Soft glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute w-[500px] h-[500px] rounded-full bg-[hsl(262,83%,58%/0.08)] blur-[80px]"
          />

          {/* Center content */}
          <div className="relative z-10 text-center px-6">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl sm:text-6xl mb-8"
            >
              ✨
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight"
            >
              {loadingText}
              <span className="text-muted-foreground">{dots}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground text-sm mb-10"
            >
              Your personalized finance assistant awaits
            </motion.p>

            {/* Loading bar */}
            <motion.div className="w-56 sm:w-72 h-1.5 bg-[hsl(0,0%,92%)] rounded-full mx-auto overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.8, ease: "easeInOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[hsl(262,83%,58%/0.6)] via-[hsl(217,91%,60%/0.6)] to-[hsl(152,69%,41%/0.6)]"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransitionOverlay;
