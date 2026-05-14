import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { personaGrid, personaCells, coachBg } from "@/assets/personas";

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  accentHsl: string;
  level: number;
}

const personas: Persona[] = [
  { id: "student",    name: "Student Saver",      emoji: "🎒", tagline: "Learn as you earn",       description: "Master budgeting on a tight schedule. Great for beginners.",            accentHsl: "217 91% 60%", level: 1 },
  { id: "salary",     name: "Salary Warrior",     emoji: "💼", tagline: "Optimize every paycheck", description: "Maximize your monthly income with smart allocations.",                  accentHsl: "220 70% 40%", level: 3 },
  { id: "investor",   name: "Smart Investor",     emoji: "📈", tagline: "Make money work for you", description: "AI insights on portfolio, risk, and long-term growth.",                 accentHsl: "152 69% 41%", level: 5 },
  { id: "hustler",    name: "Side Hustler",       emoji: "🚀", tagline: "Multiple income streams", description: "Manage freelance, biz, and main income seamlessly.",                    accentHsl: "262 83% 58%", level: 4 },
  { id: "minimalist", name: "Minimalist Planner", emoji: "🪴", tagline: "Less is more",            description: "Clean, essential tracking. Focus on what truly matters.",               accentHsl: "30 25% 55%",  level: 2 },
  { id: "luxury",     name: "Luxury Spender",     emoji: "✨", tagline: "Live well, save well",    description: "Balance premium lifestyle choices with smart wealth building.",         accentHsl: "45 80% 45%",  level: 4 },
  { id: "crypto",     name: "Crypto Curious",     emoji: "🪙", tagline: "Explore web3 wealth",     description: "Navigate crypto, NFTs, and decentralized finance with confidence.",     accentHsl: "280 80% 60%", level: 3 },
  { id: "crusher",    name: "Goal Crusher",       emoji: "🎯", tagline: "Laser-focused results",   description: "Aggressive savings strategies to hit major milestones fast.",           accentHsl: "20 92% 55%",  level: 3 },
];

interface PersonaSelectionProps {
  onSelect: (persona: Persona) => void;
}

const PersonaSelection = ({ onSelect }: PersonaSelectionProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleSelect = (persona: Persona) => {
    setSelectedId(persona.id);
    setTimeout(() => onSelect(persona), 800);
  };

  const scroll = (dir: 1 | -1) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden"
    >
      {/* Uploaded background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={coachBg}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 30%" }}
        />
        {/* Soft white overlay for light-mode readability */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/80" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -40, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          className="absolute w-2 h-2 rounded-full bg-white/80 shadow-[0_0_12px_rgba(99,102,241,0.6)] pointer-events-none"
          style={{ top: `${10 + Math.random() * 80}%`, left: `${5 + Math.random() * 90}%` }}
        />
      ))}

      <div className="relative z-10 w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: selectedId ? 0 : 1, y: selectedId ? -20 : 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-gray-900">
            Choose Your Financial Persona
          </h1>
          <p className="text-gray-600 text-base sm:text-xl max-w-xl mx-auto font-medium">
            Lumo AI personalizes your journey based on your archetype.
          </p>
        </motion.div>

        {/* Carousel container */}
        <div className="relative">
          {/* Scroll buttons (desktop) */}
          <button
            onClick={() => scroll(-1)}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-white shadow-lg border border-gray-100 hover:scale-110 transition-transform"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-white shadow-lg border border-gray-100 hover:scale-110 transition-transform"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* Horizontal scroll track */}
          <div
            ref={trackRef}
            className="flex gap-5 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-6 px-2 -mx-2 scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {personas.map((persona, i) => {
              const isHovered = hoveredId === persona.id;
              const isSelected = selectedId === persona.id;
              const isOther = selectedId && !isSelected;
              const cell = personaCells[persona.id];

              return (
                <motion.button
                  key={persona.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{
                    opacity: isOther ? 0 : 1,
                    y: isOther ? 20 : 0,
                    scale: isSelected ? 1.4 : 1,
                    zIndex: isSelected ? 50 : 1,
                  }}
                  transition={{
                    delay: selectedId ? 0 : 0.05 + i * 0.05,
                    duration: selectedId ? 0.6 : 0.5,
                    type: "spring",
                    stiffness: selectedId ? 100 : 250,
                    damping: 20,
                  }}
                  whileHover={!selectedId ? { y: -10 } : {}}
                  onHoverStart={() => setHoveredId(persona.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  onClick={() => !selectedId && handleSelect(persona)}
                  className={`relative shrink-0 snap-center text-left w-[260px] sm:w-[280px] rounded-[28px] border bg-white/80 backdrop-blur-xl shadow-lg cursor-pointer transition-colors duration-300 overflow-hidden ${
                    isSelected
                      ? "border-transparent shadow-2xl bg-white"
                      : isHovered
                      ? "border-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] bg-white"
                      : "border-white/60"
                  }`}
                  style={{
                    boxShadow: isHovered
                      ? `0 25px 50px -15px hsl(${persona.accentHsl} / 0.25)`
                      : undefined,
                  }}
                >
                  {/* Persona image — cell from grid */}
                  <div className="relative h-[260px] w-full overflow-hidden bg-gradient-to-b from-white to-gray-50">
                    <motion.div
                      animate={isHovered && !selectedId ? { scale: 1.06 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${personaGrid})`,
                        backgroundSize: "400% 200%",
                        backgroundPosition: `${cell.x} ${cell.y}`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                    {/* Soft accent glow */}
                    <div
                      className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30"
                      style={{
                        background: `radial-gradient(circle at 50% 90%, hsl(${persona.accentHsl} / 0.25), transparent 60%)`,
                      }}
                    />
                    {/* Level badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-white text-[11px] font-bold text-gray-900 flex items-center gap-1">
                      <span style={{ color: `hsl(${persona.accentHsl})` }}>★</span>
                      Lvl {persona.level}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shadow-md"
                      >
                        ✓
                      </motion.div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="p-5 pt-4">
                    <h3 className="font-display text-lg font-bold text-gray-900 leading-tight">
                      {persona.name}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                      {persona.tagline}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed mt-3 font-medium">
                      {persona.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Scroll hint (mobile) */}
          <p className="md:hidden text-center text-xs text-gray-500 mt-4 font-medium">
            ← swipe to explore →
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PersonaSelection;
