import { createContext, useContext, useState, ReactNode } from "react";
import type { PlanTier } from "@/hooks/useSubscription";

interface DemoModeCtx {
  isDemo: boolean;
  tier: PlanTier;
  setTier: (t: PlanTier) => void;
}

const Ctx = createContext<DemoModeCtx>({ isDemo: false, tier: "elite", setTier: () => {} });

export function DemoModeProvider({ children }: { children: ReactNode }) {
  // Default to Elite so visitors see the most premium experience
  const [tier, setTier] = useState<PlanTier>("elite");
  return <Ctx.Provider value={{ isDemo: true, tier, setTier }}>{children}</Ctx.Provider>;
}

export function useDemoMode() {
  return useContext(Ctx);
}
