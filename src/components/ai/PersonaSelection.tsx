import { motion } from "framer-motion";
import { useState } from "react";

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  accentHsl: string;
  stats: { label: string; value: string }[];
}

const personas: Persona[] = [
  {
    id: "saver",
    name: "Saver",
    emoji: "🎓",
    tagline: "Every rupee counts",
    description: "Master budgeting on a tight schedule.",
    accentHsl: "217 91% 60%",
    stats: [
      { label: "Savings", value: "₹3K/mo" },
      { label: "Focus", value: "Budgets" },
    ],
  },
  {
    id: "investor",
    name: "Investor",
    emoji: "📈",
    tagline: "Make money work for you",
    description: "AI insights on portfolio and risk.",
    accentHsl: "152 69% 41%",
    stats: [
      { label: "Returns", value: "12%/yr" },
      { label: "Focus", value: "Growth" },
    ],
  },
  {
    id: "planner",
    name: "Planner",
    emoji: "🎯",
    tagline: "Structured financial life",
    description: "Budgets, goals, and timelines.",
    accentHsl: "262 83% 58%",
    stats: [
      { label: "Goals", value: "5 active" },
      { label: "Focus", value: "Control" },
    ],
  },
  {
    id: "risktaker",
    name: "Risk Taker",
    emoji: "🚀",
    tagline: "Bold moves, big rewards",
    description: "Aggressive growth strategies.",
    accentHsl: "38 92% 50%",
    stats: [
      { label: "Returns", value: "18%/yr" },
      { label: "Focus", value: "Alpha" },
    ],
  },
  {
    id: "student",
    name: "Student",
    emoji: "📚",
    tagline: "Learn as you earn",
    description: "Financial literacy first approach.",
    accentHsl: "330 81% 60%",
    stats: [
      { label: "Savings", value: "₹2K/mo" },
      { label: "Focus", value: "Learn" },
    ],
  },
];

interface PersonaSelectionProps {
  onSelect: (persona: Persona) => void;
}

const PersonaSelection = ({ onSelect }: PersonaSelectionProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (persona: Persona) => {
    setSelectedId(persona.id);
    setTimeout(() => onSelect(persona), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden"
    >
      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center mb-10 sm:mb-12"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3 font-medium">
            ✦ Choose your style
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 text-foreground">
            Choose Your Persona
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Pick the one that matches your financial journey.
          </p>
        </motion.div>

        {/* Character cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {personas.map((persona, i) => {
            const isHovered = hoveredId === persona.id;
            const isSelected = selectedId === persona.id;
            const isOther = selectedId && !isSelected;

            return (
              <motion.button
                key={persona.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: isOther ? 0.3 : 1,
                  y: 0,
                  scale: isSelected ? 1.05 : 1,
                }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4, type: "spring", stiffness: 250 }}
                whileHover={!selectedId ? { y: -8, scale: 1.03 } : {}}
                onHoverStart={() => setHoveredId(persona.id)}
                onHoverEnd={() => setHoveredId(null)}
                onClick={() => !selectedId && handleSelect(persona)}
                className={`relative text-center p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer bg-background/80 backdrop-blur-sm shadow-sm ${
                  isSelected
                    ? "border-foreground/20 shadow-lg"
                    : isHovered
                    ? "border-border shadow-md"
                    : "border-border/50"
                }`}
              >
                {/* Subtle accent glow on hover */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `radial-gradient(circle at 50% 30%, hsl(${persona.accentHsl} / 0.08), transparent 70%)`,
                    }}
                  />
                )}

                <div className="relative z-10">
                  {/* Emoji avatar */}
                  <motion.div
                    animate={isHovered ? { y: [0, -4, 0] } : {}}
                    transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
                    className="text-3xl sm:text-4xl mb-3"
                  >
                    {persona.emoji}
                  </motion.div>

                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-0.5">
                    {persona.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground italic mb-3">
                    "{persona.tagline}"
                  </p>

                  {/* Stats */}
                  <div className="space-y-1 pt-2 border-t border-border/40">
                    {persona.stats.map((stat) => (
                      <div key={stat.label} className="flex justify-between text-[10px] sm:text-xs">
                        <span className="text-muted-foreground">{stat.label}</span>
                        <span className="font-medium text-foreground">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-xl bg-foreground flex items-center justify-center text-background text-xs font-bold"
                  >
                    ✓
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-muted-foreground/50 text-xs mt-8"
        >
          Tap a persona to begin
        </motion.p>
      </div>
    </motion.div>
  );
};

export default PersonaSelection;
export { personas };
