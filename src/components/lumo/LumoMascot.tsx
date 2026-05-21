import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * LumoMascot — premium custom mascot with 6 reactive states inspired by
 * the friendly robot reference. Pure CSS + Framer Motion (no images).
 *
 * States:
 *  1. idle              — calm floating, slow blink
 *  2. reaction          — eyes brighten, smile grows, arm lifts
 *  3. wave-start        — arm fully raised, glow intensifies
 *  4. peak-happy        — big beaming smile, fast blinks, max glow
 *  5. wave-hold         — continues waving for ~2.6s
 *  6. settle            — arm lowers, smile softens, returns to idle
 */
export type LumoState =
  | "idle"
  | "reaction"
  | "wave-start"
  | "peak-happy"
  | "wave-hold"
  | "settle";

export type LumoTrigger = "idle" | "hover" | "typing" | "loading" | "success" | "error";

interface Props {
  trigger?: LumoTrigger;
  size?: number;
  className?: string;
  /** Auto-run the full 6-step sequence (~5s) when trigger flips to "success" */
  autoSequence?: boolean;
}

const useReactionSequence = (trigger: LumoTrigger, autoSequence: boolean) => {
  const [state, setState] = useState<LumoState>("idle");

  useEffect(() => {
    if (!autoSequence) {
      if (trigger === "success") setState("peak-happy");
      else if (trigger === "error") setState("reaction");
      else if (trigger === "hover" || trigger === "typing") setState("reaction");
      else if (trigger === "loading") setState("reaction");
      else setState("idle");
      return;
    }

    if (trigger !== "success") {
      setState(trigger === "hover" || trigger === "typing" ? "reaction" : "idle");
      return;
    }

    // Full cinematic sequence for success
    const timers: ReturnType<typeof setTimeout>[] = [];
    setState("reaction");
    timers.push(setTimeout(() => setState("wave-start"), 350));
    timers.push(setTimeout(() => setState("peak-happy"), 800));
    timers.push(setTimeout(() => setState("wave-hold"), 1400));
    timers.push(setTimeout(() => setState("settle"), 3800));
    timers.push(setTimeout(() => setState("idle"), 4600));
    return () => timers.forEach(clearTimeout);
  }, [trigger, autoSequence]);

  return state;
};

const LumoMascot = ({
  trigger = "idle",
  size = 160,
  className = "",
  autoSequence = true,
}: Props) => {
  const state = useReactionSequence(trigger, autoSequence);
  const isActive = state !== "idle" && state !== "settle";
  const isWaving = state === "wave-start" || state === "peak-happy" || state === "wave-hold";
  const isPeak = state === "peak-happy" || state === "wave-hold";
  const isError = trigger === "error";

  const glowGrad = isError
    ? "from-rose-300/80 via-amber-200/60 to-rose-200/70"
    : isPeak
    ? "from-emerald-300/90 via-sky-300/80 to-violet-300/80"
    : isActive
    ? "from-sky-300/70 via-violet-300/60 to-emerald-200/60"
    : "from-sky-200/55 via-violet-200/50 to-emerald-100/45";

  return (
    <div
      className={`relative inline-flex items-end justify-center ${className}`}
      style={{ width: size, height: size * 1.15 }}
    >
      {/* Floating glow platform */}
      <motion.div
        animate={{
          scale: isPeak ? [1, 1.18, 1.06] : [1, 1.05, 1],
          opacity: isPeak ? [0.7, 1, 0.8] : [0.45, 0.7, 0.45],
        }}
        transition={{
          duration: isPeak ? 1.4 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[78%] h-[18%] rounded-[50%] blur-2xl bg-gradient-to-tr ${glowGrad}`}
      />

      {/* Podium */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-white/90 to-sky-50/60 border border-white/80 shadow-[0_18px_40px_-18px_rgba(99,102,241,0.45)]"
        style={{ width: size * 0.7, height: size * 0.08 }}
      />
      <div
        className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-[50%] ${
          isError ? "bg-rose-200/70" : "bg-emerald-200/70"
        } blur-md`}
        style={{ width: size * 0.55, height: size * 0.05 }}
      />

      {/* Antenna */}
      <motion.div
        animate={{
          rotate: isActive ? [-3, 3, -3] : [-1, 1, -1],
        }}
        transition={{ duration: isActive ? 1.4 : 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 -translate-x-1/2 origin-bottom"
        style={{ bottom: size * 0.93, height: size * 0.18 }}
      >
        <div className="w-[2px] h-full mx-auto bg-gradient-to-b from-sky-300 to-slate-300" />
        <motion.div
          animate={{
            boxShadow: isPeak
              ? [
                  "0 0 8px 2px rgba(125,211,252,0.8)",
                  "0 0 18px 6px rgba(167,139,250,0.9)",
                  "0 0 8px 2px rgba(125,211,252,0.8)",
                ]
              : [
                  "0 0 6px 1px rgba(125,211,252,0.5)",
                  "0 0 12px 3px rgba(125,211,252,0.7)",
                  "0 0 6px 1px rgba(125,211,252,0.5)",
                ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sky-300"
        />
      </motion.div>

      {/* Body — floats */}
      <motion.div
        animate={{
          y: isPeak ? [-6, -10, -6] : [0, -5, 0],
          rotate: isPeak ? [-2, 2, -2] : [0, 0, 0],
        }}
        transition={{ duration: isPeak ? 1.6 : 3.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
        style={{ width: size * 0.72, height: size * 0.82, marginBottom: size * 0.1 }}
      >
        {/* Body shell */}
        <div className="absolute inset-x-0 bottom-0 top-[28%] rounded-[38%_38%_42%_42%/40%_40%_50%_50%] bg-gradient-to-b from-white via-white to-slate-100 border border-white shadow-[0_25px_60px_-20px_rgba(99,102,241,0.5)]">
          <div className="absolute inset-x-4 top-2 h-3 rounded-full bg-white/80 blur-[1px]" />
          {/* belly ring */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[55%] w-[55%] h-[1.5px] bg-slate-200/80 rounded-full" />
        </div>

        {/* Head */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[38%] bg-gradient-to-b from-white to-slate-50 border border-white shadow-[0_15px_30px_-10px_rgba(99,102,241,0.35)]"
          style={{ top: 0, width: "78%", height: "55%" }}
        >
          {/* Screen face */}
          <div className="absolute inset-[14%] rounded-[28%] bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
            {/* inner glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.25),transparent_70%)]" />
            {/* Eyes */}
            <div className="absolute inset-0 flex items-center justify-center gap-[14%]">
              <Eye active={isActive} peak={isPeak} error={isError} />
              <Eye active={isActive} peak={isPeak} error={isError} delay={0.05} />
            </div>
            {/* Smile */}
            <Smile state={state} isError={isError} />
            {/* Cheek blush on peak */}
            <AnimatePresence>
              {isPeak && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-[14%] bottom-[28%] w-[18%] h-[10%] rounded-full bg-rose-300/70 blur-[3px]"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-[14%] bottom-[28%] w-[18%] h-[10%] rounded-full bg-rose-300/70 blur-[3px]"
                  />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Left arm (static) */}
        <div
          className="absolute rounded-full bg-gradient-to-b from-white to-slate-100 border border-white shadow"
          style={{
            left: "-6%",
            top: "48%",
            width: "14%",
            height: "26%",
            borderRadius: "60% 60% 80% 80%",
          }}
        />

        {/* Right arm — waves */}
        <motion.div
          animate={
            isWaving
              ? { rotate: [10, -35, 15, -35, 15, -10], y: [-2, -6, -2, -6, -2, 0] }
              : { rotate: [0, 3, 0], y: [0, 0, 0] }
          }
          transition={{
            duration: isWaving ? 2.4 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            right: isWaving ? "-12%" : "-6%",
            top: isWaving ? "26%" : "48%",
            width: "14%",
            height: isWaving ? "30%" : "26%",
            transformOrigin: "50% 90%",
            borderRadius: "60% 60% 80% 80%",
          }}
          className="absolute bg-gradient-to-b from-white to-slate-100 border border-white shadow"
        >
          {/* hand */}
          {isWaving && (
            <motion.div
              animate={{ rotate: [-10, 10, -10] }}
              transition={{ duration: 0.4, repeat: Infinity }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-white shadow"
            />
          )}
        </motion.div>

        {/* Legs */}
        <div className="absolute bottom-0 left-[28%] w-[12%] h-[10%] rounded-b-full bg-gradient-to-b from-slate-100 to-slate-200" />
        <div className="absolute bottom-0 right-[28%] w-[12%] h-[10%] rounded-b-full bg-gradient-to-b from-slate-100 to-slate-200" />

        {/* Wave motion lines */}
        <AnimatePresence>
          {isWaving && (
            <motion.svg
              key="wavelines"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -right-2 top-2 w-8 h-10"
              viewBox="0 0 32 40"
              fill="none"
            >
              {[0, 1, 2].map((i) => (
                <motion.path
                  key={i}
                  d={`M ${4 + i * 6} 6 Q ${10 + i * 6} 14, ${4 + i * 6} 22`}
                  stroke="hsl(220,90%,65%)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const Eye = ({
  active,
  peak,
  error,
  delay = 0,
}: {
  active: boolean;
  peak: boolean;
  error?: boolean;
  delay?: number;
}) => (
  <motion.div
    animate={{
      scaleY: peak ? [1, 0.15, 1, 1, 0.15, 1] : active ? [1, 0.1, 1] : [1, 0.1, 1],
    }}
    transition={{
      duration: peak ? 1.4 : 0.32,
      repeat: Infinity,
      repeatDelay: peak ? 0.4 : active ? 2.2 : 3.6,
      delay,
    }}
    className="relative flex items-center justify-center"
    style={{ width: "22%", height: "55%" }}
  >
    {/* Curved happy eye */}
    <div
      className={`w-full rounded-full ${error ? "bg-rose-300" : "bg-cyan-300"}`}
      style={{
        height: "55%",
        borderRadius: "50% 50% 50% 50% / 0% 0% 100% 100%",
        boxShadow: peak
          ? `0 0 12px 3px ${error ? "rgba(244,114,182,0.9)" : "rgba(103,232,249,0.9)"}`
          : `0 0 6px 1px ${error ? "rgba(244,114,182,0.6)" : "rgba(103,232,249,0.6)"}`,
      }}
    />
  </motion.div>
);

const Smile = ({ state, isError }: { state: LumoState; isError: boolean }) => {
  const wide = state === "peak-happy" || state === "wave-hold";
  const grown = wide || state === "wave-start" || state === "reaction";
  const width = wide ? "44%" : grown ? "34%" : "22%";
  const color = isError ? "bg-rose-300/90" : "bg-cyan-200/90";
  return (
    <motion.div
      animate={{ width }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={`absolute left-1/2 -translate-x-1/2 ${color} ${
        wide ? "h-[18%]" : "h-[8%]"
      }`}
      style={{
        bottom: "20%",
        borderRadius: wide ? "0 0 40% 40% / 0 0 100% 100%" : "999px",
        boxShadow: wide
          ? `0 0 14px 3px ${isError ? "rgba(244,114,182,0.7)" : "rgba(103,232,249,0.6)"}`
          : "none",
      }}
    >
      {wide && (
        <div className="absolute inset-x-[20%] top-0 h-1/2 bg-slate-900/40 rounded-b-full" />
      )}
    </motion.div>
  );
};

export default LumoMascot;
