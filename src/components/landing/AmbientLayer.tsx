import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Global ambient layer: cursor glow + floating particles.
 * Pointer-events none. Sits below all content.
 */
const AmbientLayer = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onScroll = () => {};
    const onMove = (e: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.transform = `translate3d(${e.clientX - 200}px, ${e.clientY - 200}px, 0)`;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (reduced) return null;

  const particles = Array.from({ length: 14 });

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {/* cursor glow */}
      <div
        ref={glowRef}
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.18] blur-3xl transition-transform duration-200 ease-out hidden md:block"
        style={{
          background:
            "radial-gradient(circle, hsl(260,90%,70%) 0%, hsl(220,90%,70%) 40%, transparent 70%)",
        }}
      />
      {/* particles */}
      {particles.map((_, i) => {
        const left = (i * 73) % 100;
        const top = (i * 41) % 100;
        const size = 4 + (i % 4) * 2;
        const dur = 14 + (i % 6) * 3;
        const delay = (i % 5) * 1.2;
        const hue = [220, 260, 290, 180, 150][i % 5];
        return (
          <motion.span
            key={i}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [-20, -120, -20], opacity: [0, 0.6, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
            className="absolute rounded-full blur-[2px]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: `hsl(${hue},90%,75%)`,
              boxShadow: `0 0 16px hsl(${hue},90%,75%)`,
            }}
          />
        );
      })}
    </div>
  );
};

export default AmbientLayer;
