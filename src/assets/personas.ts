import personaGrid from "./personas-grid.png";
import lumoAvatar from "./lumo-avatar.png";
import coachBg from "./coach-background.png";

export { personaGrid, lumoAvatar, coachBg };

// 4×2 grid sprite. bg-size 400% 200%
// X: col0=0%, col1=33.33%, col2=66.66%, col3=100%
// Y: row0=0%, row1=100%
export type PersonaCell = { x: string; y: string };

export const personaCells: Record<string, PersonaCell> = {
  student:     { x: "0%",     y: "0%"   }, // r1c1 backpack student
  salary:      { x: "33.33%", y: "0%"   }, // r1c2 navy suit briefcase
  investor:    { x: "66.66%", y: "0%"   }, // r1c3 green suit + bull
  hustler:     { x: "100%",   y: "0%"   }, // r1c4 purple hoodie laptop
  minimalist:  { x: "0%",     y: "100%" }, // r2c1 beige minimalist
  luxury:      { x: "33.33%", y: "100%" }, // r2c2 gold luxury
  crypto:      { x: "66.66%", y: "100%" }, // r2c3 purple crypto
  family:      { x: "100%",   y: "100%" }, // r2c4 — repurposed for Family Guardian
};
