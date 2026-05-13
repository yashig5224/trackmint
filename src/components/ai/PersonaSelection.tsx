import { motion } from "framer-motion";
import { useState } from "react";

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
  {
    id: "student",
    name: "Student Saver",
    emoji: "🎒",
    tagline: "Learn as you earn",
    description: "Master budgeting on a tight schedule. Great for beginners.",
    accentHsl: "330 81% 60%", // Pink
    level: 1,
  },
  {
    id: "investor",
    name: "Smart Investor",
    emoji: "📈",
    tagline: "Make money work for you",
    description: "AI insights on portfolio, risk, and long-term growth.",
    accentHsl: "152 69% 41%", // Green
    level: 5,
  },
  {
    id: "salary",
    name: "Salary Warrior",
    emoji: "💼",
    tagline: "Optimize every paycheck",
    description: "Maximize your monthly income with smart allocations.",
    accentHsl: "217 91% 60%", // Blue
    level: 3,
  },
  {
    id: "hustler",
    name: "Side Hustler",
    emoji: "🚀",
    tagline: "Multiple income streams",
    description: "Manage freelance, biz, and main income seamlessly.",
    accentHsl: "38 92% 50%", // Orange
    level: 4,
  },
  {
    id: "minimalist",
    name: "Minimalist Planner",
    emoji: "🪴",
    tagline: "Less is more",
    description: "Clean, essential tracking. Focus on what truly matters.",
    accentHsl: "262 83% 58%", // Purple
    level: 2,
  },
  {
    id: "luxury",
    name: "Luxury Spender",
    emoji: "✨",
    tagline: "Live well, save well",
    description: "Balance premium lifestyle choices with smart wealth building.",
    accentHsl: "45 93% 47%", // Gold
    level: 4,
  },
  {
    id: "crusher",
    name: "Goal Crusher",
    emoji: "🎯",
    tagline: "Laser-focused results",
    description: "Aggressive savings strategies to hit major milestones fast.",
    accentHsl: "350 89% 60%", // Coral Red
    level: 3,
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
    setTimeout(() => onSelect(persona), 800); // Wait for zoom transition
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden bg-[#fafafa]"
    >
      {/* Immersive Background: Soft sky gradient, floating blobs, coins */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-100/40 blur-[120px]"
        />
        
        {/* Animated Coins in background */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -40, 0],
              rotateY: [0, 360],
              rotateX: [0, 180]
            }}
            transition={{ 
              duration: 8 + i, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 0.5
            }}
            className="absolute w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-100/30 to-orange-100/30 border border-white/50 backdrop-blur-md shadow-sm"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: selectedId ? 0 : 1, y: selectedId ? -20 : 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-gray-900 drop-shadow-sm">
            Choose Your Financial Persona
          </h1>
          <p className="text-gray-500 text-lg sm:text-xl max-w-xl mx-auto font-medium">
            Your AI Coach will personalize your financial journey based on your archetype.
          </p>
        </motion.div>

        {/* Character cards grid */}
        <div className="flex flex-wrap justify-center gap-5 sm:gap-6 mx-auto">
          {personas.map((persona, i) => {
            const isHovered = hoveredId === persona.id;
            const isSelected = selectedId === persona.id;
            const isOther = selectedId && !isSelected;

            return (
              <motion.button
                key={persona.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{
                  opacity: isOther ? 0 : 1,
                  y: isOther ? 20 : 0,
                  scale: isSelected ? 1.5 : 1, // Smooth zoom transition on click
                  zIndex: isSelected ? 50 : 1,
                }}
                transition={{ 
                  delay: selectedId ? 0 : 0.05 + i * 0.05, 
                  duration: selectedId ? 0.6 : 0.5, 
                  type: "spring", 
                  stiffness: selectedId ? 100 : 250,
                  damping: selectedId ? 20 : 20
                }}
                whileHover={!selectedId ? { y: -12, scale: 1.05 } : {}}
                onHoverStart={() => setHoveredId(persona.id)}
                onHoverEnd={() => setHoveredId(null)}
                onClick={() => !selectedId && handleSelect(persona)}
                className={`relative text-center p-6 w-[280px] rounded-[32px] border transition-colors duration-300 cursor-pointer bg-white/60 backdrop-blur-xl shadow-lg flex flex-col items-center h-full ${
                  isSelected
                    ? "border-transparent shadow-2xl bg-white"
                    : isHovered
                    ? "border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] bg-white/80"
                    : "border-white/40"
                }`}
              >
                {/* Soft glow on hover */}
                {isHovered && !selectedId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-[32px] pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, hsl(${persona.accentHsl} / 0.08), transparent 70%)`,
                    }}
                  />
                )}

                {/* Level Badge */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                  <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-gray-100 text-[11px] font-bold text-gray-900 flex items-center gap-1.5">
                    <span style={{ color: `hsl(${persona.accentHsl})` }}>★</span>
                    Lvl {persona.level}
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      ✓
                    </motion.div>
                  )}
                </div>

                <div className="relative z-10 w-full flex flex-col items-center flex-1 mt-8">
                  {/* Avatar block */}
                  <motion.div
                    animate={isHovered && !selectedId ? { y: [0, -8, 0] } : {}}
                    transition={{ duration: 2, repeat: isHovered ? Infinity : 0, ease: "easeInOut" }}
                    className="relative w-28 h-28 mb-8"
                  >
                    {/* Soft base shadow */}
                    <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-20 h-6 rounded-[100%] bg-black/5 blur-md" />
                    
                    <div 
                      className="w-full h-full rounded-[24px] flex items-center justify-center text-5xl shadow-sm border-2 bg-white transition-all duration-300 relative overflow-hidden"
                      style={{ 
                        borderColor: `hsl(${persona.accentHsl} / 0.15)`,
                      }}
                    >
                      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: `hsl(${persona.accentHsl})` }} />
                      <span className="drop-shadow-sm relative z-10">{persona.emoji}</span>
                    </div>
                  </motion.div>

                  <h3 className="font-display text-xl font-bold text-gray-900 mb-2 leading-tight">
                    {persona.name}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-400 mb-4 uppercase tracking-widest">
                    {persona.tagline}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-auto font-medium">
                    {persona.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default PersonaSelection;