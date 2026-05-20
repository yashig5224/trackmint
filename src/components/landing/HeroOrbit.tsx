import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { TrendingUp, Target, PiggyBank, Sparkles, Bell, LineChart, Wallet, ArrowUpRight } from "lucide-react";
import { lumoAvatar } from "@/assets/personas";

type OrbitCard = {
  icon: typeof TrendingUp;
  title: string;
  value: string;
  tint: string;
  angle: number; // degrees
  radius: number; // px
  delay: number;
};

const CARDS: OrbitCard[] = [
  { icon: PiggyBank, title: "Saved this week", value: "₹2,400", tint: "150,75%,45%", angle: -10, radius: 230, delay: 0 },
  { icon: Target, title: "Goal progress", value: "80%", tint: "220,90%,58%", angle: 60, radius: 260, delay: 0.3 },
  { icon: LineChart, title: "Investments", value: "+18%", tint: "260,80%,62%", angle: 130, radius: 240, delay: 0.6 },
  { icon: Bell, title: "Subs found", value: "3 leaks", tint: "25,90%,55%", angle: 200, radius: 250, delay: 0.9 },
  { icon: TrendingUp, title: "Food spend", value: "-12%", tint: "190,80%,50%", angle: 270, radius: 235, delay: 1.2 },
  { icon: Sparkles, title: "AI insight", value: "Ready", tint: "300,75%,62%", angle: 330, radius: 255, delay: 1.5 },
];

const HeroOrbit = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const parallaxX = useTransform(sx, [-1, 1], [-18, 18]);
  const parallaxY = useTransform(sy, [-1, 1], [-14, 14]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      mx.set(x);
      my.set(y);
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [mx, my]);

  return (
    <div
      ref={containerRef}
      className="relative h-[520px] sm:h-[600px] lg:h-[680px] flex items-center justify-center select-none"
      style={{ perspective: 1400 }}
    >
      {/* Ambient mesh */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 m-auto w-[560px] h-[560px] rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(220,100%,90%,0.5), hsl(260,100%,92%,0.45), hsl(180,100%,90%,0.4), hsl(300,100%,93%,0.45), hsl(220,100%,90%,0.5))",
          filter: "blur(60px)",
          opacity: 0.7,
        }}
      />

      {/* Finance grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(260,40%,40%) 1px, transparent 1px), linear-gradient(90deg, hsl(260,40%,40%) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at center, black 30%, transparent 70%)",
        }}
      />

      {/* Orbit rings */}
      {[300, 420, 540].map((d, i) => (
        <motion.div
          key={d}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
          className="absolute rounded-full border border-dashed pointer-events-none"
          style={{
            width: d,
            height: d,
            borderColor: `hsl(${260 - i * 20},60%,75%,0.35)`,
          }}
        />
      ))}

      {/* Light beams */}
      <motion.div
        animate={{ opacity: [0.15, 0.35, 0.15], rotate: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, transparent 0deg, hsl(220,100%,80%,0.35) 20deg, transparent 60deg, transparent 180deg, hsl(280,100%,82%,0.3) 220deg, transparent 260deg)",
          filter: "blur(40px)",
        }}
      />

      {/* CORE — Lumo orb */}
      <motion.div
        style={{ x: parallaxX, y: parallaxY }}
        className="relative z-20"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 m-auto w-56 h-56 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(220,100%,85%,0.9), hsl(260,90%,82%,0.6) 50%, transparent 75%)",
            filter: "blur(30px)",
          }}
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full p-[3px] bg-gradient-to-br from-white via-[hsl(220,100%,95%)] to-[hsl(280,90%,95%)] shadow-[0_30px_80px_-20px_rgba(120,90,220,0.55)]"
        >
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white to-[hsl(220,60%,97%)] overflow-hidden">
            <img src={lumoAvatar} alt="Lumo AI core" className="w-full h-full object-cover" />
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="absolute -inset-1 rounded-full border-2 border-[hsl(220,90%,65%)]"
            />
          </div>
        </motion.div>
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white text-[10px] font-semibold tracking-wide text-foreground/70 shadow">
          LUMO · AI CORE
        </div>
      </motion.div>

      {/* Orbiting cards */}
      {CARDS.map((c, i) => {
        const Icon = c.icon;
        return (
          <FloatingCard
            key={c.title}
            card={c}
            index={i}
            parallaxX={parallaxX}
            parallaxY={parallaxY}
            Icon={Icon}
          />
        );
      })}

      {/* Floating ₹ particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: "110%" }}
            animate={{ opacity: [0, 0.4, 0], y: "-15%" }}
            transition={{
              duration: 14 + (i % 5) * 2,
              delay: i * 1.3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute font-display font-bold"
            style={{
              left: `${(i * 37) % 95}%`,
              fontSize: 14 + (i % 4) * 4,
              color: "transparent",
              WebkitTextStroke: "1px hsl(260,60%,70%,0.5)",
              filter: "drop-shadow(0 0 10px hsl(220,90%,75%,0.4))",
            }}
          >
            ₹
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const FloatingCard = ({
  card,
  index,
  parallaxX,
  parallaxY,
  Icon,
}: {
  card: OrbitCard;
  index: number;
  parallaxX: ReturnType<typeof useTransform<number, number>>;
  parallaxY: ReturnType<typeof useTransform<number, number>>;
  Icon: typeof TrendingUp;
}) => {
  const rad = (card.angle * Math.PI) / 180;
  const baseX = Math.cos(rad) * card.radius;
  const baseY = Math.sin(rad) * card.radius * 0.6;
  const depth = 1 + (index % 3) * 0.3;
  const px = useTransform(parallaxX, (v) => v * depth * 1.3);
  const py = useTransform(parallaxY, (v) => v * depth * 1.3);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, x: baseX, y: baseY }}
      animate={{
        opacity: 1,
        scale: 1,
        x: [baseX, baseX + 8, baseX - 6, baseX],
        y: [baseY, baseY - 10, baseY + 6, baseY],
      }}
      transition={{
        opacity: { delay: card.delay, duration: 0.8 },
        scale: { delay: card.delay, duration: 0.8 },
        x: { duration: 10 + index, repeat: Infinity, ease: "easeInOut", delay: card.delay },
        y: { duration: 9 + index, repeat: Infinity, ease: "easeInOut", delay: card.delay },
      }}
      style={{ x: px, y: py }}
      whileHover={{ scale: 1.08, zIndex: 30 }}
      className="absolute z-10"
    >
      <motion.div
        animate={{ rotateY: [-4, 4, -4], rotateX: [2, -2, 2] }}
        transition={{ duration: 8 + index, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="group relative w-44 px-3.5 py-3 rounded-2xl bg-white/75 backdrop-blur-xl border border-white/90 shadow-[0_18px_45px_-15px_rgba(120,90,220,0.35)] hover:shadow-[0_22px_55px_-15px_rgba(120,90,220,0.5)] transition-shadow"
      >
        <div
          className="absolute -inset-px rounded-2xl opacity-50 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, hsl(${card.tint},0.18), transparent 60%)`,
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, hsl(${card.tint},0.22), hsl(${card.tint},0.08))` }}
          >
            <Icon className="w-4 h-4" style={{ color: `hsl(${card.tint})` }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-foreground/55 truncate">{card.title}</div>
            <div className="text-sm font-bold tracking-tight flex items-center gap-1">
              {card.value}
              <ArrowUpRight className="w-3 h-3" style={{ color: `hsl(${card.tint})` }} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HeroOrbit;
