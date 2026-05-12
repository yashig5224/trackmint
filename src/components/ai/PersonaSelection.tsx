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
      className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden bg-gradient-to-b from-[hsl(200,40%,98%)] to-[hsl(220,30%,96%)]"
    >
      {/* Immersive Background: Soft sky gradient, floating blobs, coins */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(262,83%,58%/0.05)] blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(217,91%,60%/0.06)] blur-[120px]"
        />
        
        {/* Animated Coins in background */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -30, 0],
              rotateY: [0, 360],
              rotateX: [0, 180]
            }}
            transition={{ 
              duration: 6 + i, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 0.5
            }}
            className="absolute w-12 h-12 rounded-full bg-[hsl(38,92%,50%/0.1)] border border-[hsl(38,92%,50%/0.2)] backdrop-blur-md"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: selectedId ? 0 : 1, y: selectedId ? -20 : 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-foreground drop-shadow-sm">
            Choose Your Financial Persona
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto font-medium">
            Your AI Coach will personalize your financial journey.
          </p>
        </motion.div>

        {/* Character cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-5 justify-center items-stretch max-w-lg sm:max-w-2xl lg:max-w-none mx-auto">
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
                  delay: selectedId ? 0 : 0.1 + i * 0.08, 
                  duration: selectedId ? 0.6 : 0.5, 
                  type: "spring", 
                  stiffness: selectedId ? 100 : 250,
                  damping: selectedId ? 20 : 20
                }}
                whileHover={!selectedId ? { y: -12, scale: 1.05 } : {}}
                onHoverStart={() => setHoveredId(persona.id)}
                onHoverEnd={() => setHoveredId(null)}
                onClick={() => !selectedId && handleSelect(persona)}
                className={`relative text-center p-6 rounded-[28px] border transition-colors duration-300 cursor-pointer bg-background/70 backdrop-blur-xl shadow-lg flex flex-col items-center h-full ${
                  isSelected
                    ? "border-transparent shadow-2xl"
                    : isHovered
                    ? "border-border shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
                    : "border-border/40"
                }`}
              >
                {/* Soft glow on hover */}
                {isHovered && !selectedId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-[28px] pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, hsl(${persona.accentHsl} / 0.15), transparent 70%)`,
                    }}
                  />
                )}

                {/* Level Badge */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                  <div className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md shadow-sm border border-border/50 text-[10px] font-bold text-foreground flex items-center gap-1">
                    <span style={{ color: `hsl(${persona.accentHsl})` }}>★</span>
                    Lvl {persona.level}
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-bold shadow-md"
                    >
                      ✓
                    </motion.div>
                  )}
                </div>

                <div className="relative z-10 w-full flex flex-col items-center flex-1 mt-6">
                  {/* Isometric 3D-ish Avatar block */}
                  <motion.div
                    animate={isHovered && !selectedId ? { y: [0, -8, 0] } : {}}
                    transition={{ duration: 2, repeat: isHovered ? Infinity : 0, ease: "easeInOut" }}
                    className="relative w-24 h-24 mb-6"
                  >
                    {/* Isometric base */}
                    <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-20 h-6 rounded-[100%] bg-black/5 blur-sm" />
                    
                    {/* "Minecraft-inspired" blocky wrapper */}
                    <div 
                      className="w-full h-full rounded-2xl flex items-center justify-center text-5xl shadow-inner border-b-4 border-r-4 transition-all duration-300"
                      style={{ 
                        backgroundColor: `hsl(${persona.accentHsl} / 0.1)`,
                        borderColor: `hsl(${persona.accentHsl} / 0.2)`,
                        borderTopColor: `hsl(${persona.accentHsl} / 0.05)`,
                        borderLeftColor: `hsl(${persona.accentHsl} / 0.05)`,
                        borderWidth: isHovered ? "4px 4px 8px 4px" : "2px 2px 4px 2px"
                      }}
                    >
                      <span className="drop-shadow-md">{persona.emoji}</span>
                    </div>
                  </motion.div>

                  <h3 className="font-display text-lg font-bold text-foreground mb-1.5 leading-tight">
                    {persona.name}
                  </h3>
                  <p className="text-xs font-medium text-[hsl(var(--foreground)/0.6)] mb-3 uppercase tracking-wider">
                    {persona.tagline}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-auto">
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