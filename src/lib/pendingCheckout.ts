// Persists a selected plan across the login/signup flow so users don't lose
// their place. Cleared as soon as it's consumed.

export interface PendingCheckout {
  priceId: string;
  planName: string;
  cycle: "monthly" | "yearly";
}

const KEY = "fintrack:pendingCheckout";

export function setPendingCheckout(p: PendingCheckout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function getPendingCheckout(): PendingCheckout | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingCheckout) : null;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
