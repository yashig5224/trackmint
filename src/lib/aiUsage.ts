// Client-side AI usage limiter for free-tier users.
// NOT secure — bypassable. UX-only nudge to upgrade. Wire to server-side later.

const KEY = "lumo_ai_usage_v1";
export const FREE_DAILY_LIMIT = 10;

interface UsageRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(): UsageRecord {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { date: today(), count: 0 };
    const parsed = JSON.parse(raw) as UsageRecord;
    if (parsed.date !== today()) return { date: today(), count: 0 };
    return parsed;
  } catch {
    return { date: today(), count: 0 };
  }
}

export function getAiUsage(): { used: number; remaining: number; limit: number } {
  const rec = read();
  return { used: rec.count, remaining: Math.max(0, FREE_DAILY_LIMIT - rec.count), limit: FREE_DAILY_LIMIT };
}

export function consumeAiUsage(): boolean {
  const rec = read();
  if (rec.count >= FREE_DAILY_LIMIT) return false;
  rec.count += 1;
  localStorage.setItem(KEY, JSON.stringify(rec));
  return true;
}

export function resetAiUsage() {
  localStorage.removeItem(KEY);
}
