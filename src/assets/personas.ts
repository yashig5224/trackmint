import personaGrid from "./personas-grid.png";
import lumoAvatar from "./lumo-avatar.png";
import coachBg from "./coach-background.png";

export { personaGrid, lumoAvatar, coachBg };

// The persona grid is a 4×2 image. These coordinates map each persona to
// its cell so we can show a single character via background-position.
// Grid: bg-size 400% 200%
// X: col 0 → 0%, col 1 → 33.33%, col 2 → 66.66%, col 3 → 100%
// Y: row 0 → 0%, row 1 → 100%
export type PersonaCell = { x: string; y: string };

export const personaCells: Record<string, PersonaCell> = {
  student:     { x: "0%",     y: "0%"   }, // r1c1 backpack student
  salary:      { x: "33.33%", y: "0%"   }, // r1c2 navy suit briefcase
  investor:    { x: "66.66%", y: "0%"   }, // r1c3 green suit + bull
  hustler:     { x: "100%",   y: "0%"   }, // r1c4 purple hoodie laptop
  minimalist:  { x: "0%",     y: "100%" }, // r2c1 beige minimalist
  luxury:      { x: "33.33%", y: "100%" }, // r2c2 black/gold luxury
  crypto:      { x: "66.66%", y: "100%" }, // r2c3 purple crypto
  crusher:     { x: "100%",   y: "100%" }, // r2c4 orange goal crusher
};
