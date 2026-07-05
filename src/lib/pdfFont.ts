// Loads a real Unicode TTF (Roboto) and registers it with jsPDF.
// Without this, jsPDF uses the built-in "Helvetica" core font which is NOT
// embedded in the output PDF. Viewers substitute it with a system font that
// has different glyph widths → characters overlap and look scattered.
// Roboto also has proper glyphs for ₹, —, →, · etc. that WinAnsi Helvetica lacks.

import type jsPDF from "jspdf";

const REGULAR_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf";
const BOLD_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf";

let cachedRegular: string | null = null;
let cachedBold: string | null = null;
let loadPromise: Promise<void> | null = null;

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  return btoa(bin);
}

async function loadFonts(): Promise<void> {
  if (cachedRegular && cachedBold) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      const [reg, bold] = await Promise.all([
        fetchBase64(REGULAR_URL),
        fetchBase64(BOLD_URL),
      ]);
      cachedRegular = reg;
      cachedBold = bold;
    })().catch((e) => {
      loadPromise = null;
      throw e;
    });
  }
  return loadPromise;
}

/**
 * Registers Roboto as the "helvetica" family on the given jsPDF doc.
 * Overriding the helvetica alias means every existing
 * `setFont("helvetica", ...)` call in the codebase picks up the real embedded
 * font with no other changes required.
 */
export async function registerAppFonts(doc: jsPDF): Promise<void> {
  try {
    await loadFonts();
    if (!cachedRegular || !cachedBold) return;
    doc.addFileToVFS("Roboto-Regular.ttf", cachedRegular);
    doc.addFont("Roboto-Regular.ttf", "helvetica", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", cachedBold);
    doc.addFont("Roboto-Bold.ttf", "helvetica", "bold");
    // Also register italic/bolditalic fallbacks so jsPDF never falls back to
    // the un-embedded core font when a style is requested.
    doc.addFont("Roboto-Regular.ttf", "helvetica", "italic");
    doc.addFont("Roboto-Bold.ttf", "helvetica", "bolditalic");
    doc.setFont("helvetica", "normal");
  } catch (err) {
    // Fall back silently to the built-in font on network failure.
    console.warn("[pdf] font embed failed, falling back to core Helvetica", err);
  }
}
