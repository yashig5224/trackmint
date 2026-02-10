import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import PersonaSelection from "./PersonaSelection";
import MissionDashboard from "./MissionDashboard";
import type { Persona } from "./PersonaSelection";

const AIAssistant = () => {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  return (
    <AnimatePresence mode="wait">
      {!selectedPersona ? (
        <PersonaSelection key="persona" onSelect={setSelectedPersona} />
      ) : (
        <MissionDashboard
          key="mission"
          persona={selectedPersona}
          onBack={() => setSelectedPersona(null)}
        />
      )}
    </AnimatePresence>
  );
};

export default AIAssistant;
