import { motion } from "framer-motion";
import { useState } from "react";

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  gradient: string;
  accentColor: string;
  stats: { label: string; value: string }[];
}

const personas: Persona[] = [
  {
    id: "student",
    name: "Student Saver",
    emoji: "🎓",
    tagline: "Every rupee counts",
    description: "Master the art of budgeting on a tight schedule. Track expenses, split costs, and build your first emergency fund.",
    gradient: "from-blue-50 to-indigo-50",
    accentColor: "hsl(217, 91%, 60%)",
    stats: [
      { label: "Avg Savings", value: "₹3K/mo" },
      { label: "Top Focus", value: "Budgets" },
      { label: "Difficulty", value: "⭐⭐" },
    ],
  },
  {
    id: "earner",
    name: "Young Earner",
    emoji: "💼",
    tagline: "Level up your income",
    description: "You just started earning. Now learn to manage it like a pro — taxes, investments, and lifestyle balance.",
    gradient: "from-emerald-50 to-teal-50",
    accentColor: "hsl(152, 69%, 41%)",
    stats: [
      { label: "Avg Savings", value: "₹15K/mo" },
      { label: "Top Focus", value: "Growth" },
      { label: "Difficulty", value: "⭐⭐⭐" },
    ],
  },
  {
    id: "hustler",
    name: "Side Hustler",
    emoji: "🚀",
    tagline: "Multiple streams, one dashboard",
    description: "Freelancing, gig work, passion projects — track all your income streams and optimize your hustle.",
    gradient: "from-amber-50 to-orange-50",
    accentColor: "hsl(38, 92%, 50%)",
    stats: [
      { label: "Avg Streams", value: "3+" },
      { label: "Top Focus", value: "Income" },
      { label: "Difficulty", value: "⭐⭐⭐" },
    ],
  },
  {
    id: "investor",
    name: "Smart Investor",
    emoji: "📈",
    tagline: "Make money work for you",
    description: "Stocks, mutual funds, crypto — get AI insights on portfolio allocation and risk management.",
    gradient: "from-violet-50 to-purple-50",
    accentColor: "hsl(262, 83%, 58%)",
    stats: [
      { label: "Avg Returns", value: "12%/yr" },
      { label: "Top Focus", value: "Invest" },
      { label: "Difficulty", value: "⭐⭐⭐⭐" },
    ],
  },
  {
    id: "minimalist",
    name: "Minimalist Monk",
    emoji: "🧘",
    tagline: "Less stuff, more freedom",
    description: "Simplify your finances. Cut subscriptions, reduce waste, and find peace in financial minimalism.",
    gradient: "from-stone-50 to-neutral-100",
    accentColor: "hsl(0, 0%, 45%)",
    stats: [
      { label: "Avg Cut", value: "40%" },
      { label: "Top Focus", value: "Reduce" },
      { label: "Difficulty", value: "⭐" },
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
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center py-12 px-4"
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-center mb-12"
      >
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3 font-medium">
          Step 1 of 3 — Personalize
        </p>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
          Choose Your Financial Persona
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Your AI coach adapts to your lifestyle. Pick the path that fits you best.
        </p>
      </motion.div>

      {/* Persona Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl w-full">
        {personas.map((persona, i) => {
          const isSelected = selectedId === persona.id;
          const isOther = selectedId && !isSelected;

          return (
            <motion.button
              key={persona.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: isOther ? 0.3 : 1,
                y: 0,
                scale: isSelected ? 1.05 : 1,
              }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.5, type: "spring", stiffness: 200 }}
              whileHover={!selectedId ? { y: -8, scale: 1.03 } : {}}
              onHoverStart={() => setHoveredId(persona.id)}
              onHoverEnd={() => setHoveredId(null)}
              onClick={() => !selectedId && handleSelect(persona)}
              className={`relative text-left p-6 rounded-2xl border border-border bg-gradient-to-br ${persona.gradient} transition-shadow duration-300 cursor-pointer group ${
                hoveredId === persona.id ? "shadow-xl" : "shadow-sm"
              } ${isSelected ? "ring-2 ring-foreground shadow-2xl" : ""}`}
            >
              {/* Character emoji */}
              <motion.div
                animate={hoveredId === persona.id ? { rotate: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="text-5xl mb-4"
              >
                {persona.emoji}
              </motion.div>

              {/* Name & tagline */}
              <h3 className="font-display text-lg font-bold mb-1">{persona.name}</h3>
              <p className="text-xs text-muted-foreground mb-3 italic">"{persona.tagline}"</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                {persona.description}
              </p>

              {/* Stats */}
              <div className="space-y-1.5 pt-3 border-t border-border/50">
                {persona.stats.map((stat) => (
                  <div key={stat.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-medium">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Select indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={isSelected ? { opacity: 1, scale: 1 } : {}}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-foreground flex items-center justify-center"
              >
                <span className="text-background text-xs">✓</span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PersonaSelection;
export { personas };
