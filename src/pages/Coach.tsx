import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TransitionOverlay from "@/components/ai/TransitionOverlay";
import PersonaSelection from "@/components/ai/PersonaSelection";
import MissionDashboard from "@/components/ai/MissionDashboard";
import type { Persona } from "@/components/ai/PersonaSelection";

type Phase = "transition" | "persona" | "mission";

const Coach = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("transition");
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleTransitionComplete = () => setPhase("persona");

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
    setPhase("mission");
  };

  const handleBack = () => {
    if (phase === "mission") {
      setSelectedPersona(null);
      setPhase("persona");
    } else {
      navigate("/dashboard");
    }
  };

  const handleExit = () => navigate("/dashboard");

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[hsl(0,0%,98%)]">
      {/* Light immersive background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,40%,97%)] via-[hsl(0,0%,98%)] to-[hsl(220,30%,96%)]" />
      
      {/* Soft pastel blobs */}
      <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-[hsl(262,83%,58%/0.06)] blur-[100px]" />
      <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[hsl(217,91%,60%/0.05)] blur-[120px]" />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(152,69%,41%/0.04)] blur-[100px]" />

      {/* Transition overlay */}
      <TransitionOverlay
        isVisible={phase === "transition"}
        onComplete={handleTransitionComplete}
      />

      {/* Content phases */}
      <AnimatePresence mode="wait">
        {phase === "persona" && (
          <motion.div
            key="persona"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-10"
          >
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleExit}
              className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-background transition-all text-sm shadow-sm"
            >
              ← Back
            </motion.button>
            <PersonaSelection onSelect={handlePersonaSelect} />
          </motion.div>
        )}

        {phase === "mission" && selectedPersona && (
          <motion.div
            key="mission"
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-10"
          >
            <MissionDashboard persona={selectedPersona} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Coach;
