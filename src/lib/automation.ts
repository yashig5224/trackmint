// Client-side AI Automation engine — pure derivations from existing data.
// Persists user toggles in localStorage; results are recomputed on demand.

export type AutomationKey =
  | "auto_budget"
  | "auto_categorize"
  | "spike_detection"
  | "subscription_detect"
  | "smart_alerts"
  | "goal_suggestions"
  | "monthly_report";

export interface AutomationMeta {
  key: AutomationKey;
  title: string;
  description: string;
  tier: "pro" | "elite";
  emoji: string;
}

export const AUTOMATIONS: AutomationMeta[] = [
  { key: "auto_budget", title: "Auto Budget Generation", description: "AI builds monthly budgets from your spending patterns and income.", tier: "pro", emoji: "💸" },
  { key: "auto_categorize", title: "Smart Categorization", description: "Uncategorized transactions get classified by keyword intelligence.", tier: "pro", emoji: "🧠" },
  { key: "spike_detection", title: "Spending Spike Detection", description: "Detects categories where you spent 2× more than your weekly average.", tier: "pro", emoji: "📈" },
  { key: "subscription_detect", title: "Subscription Radar", description: "Finds recurring charges so you never lose money to forgotten subs.", tier: "pro", emoji: "🔁" },
  { key: "smart_alerts", title: "Smart Alerts", description: "Real-time notifications about your spending habits.", tier: "pro", emoji: "🔔" },
  { key: "goal_suggestions", title: "AI Goal Suggestions", description: "Suggests emergency funds, savings targets and investment goals.", tier: "elite", emoji: "🎯" },
  { key: "monthly_report", title: "Monthly AI Summary", description: "Generates an investor-grade monthly report automatically.", tier: "elite", emoji: "📊" },
];

const STORAGE_KEY = "fintrack_automation_v1";
type State = Record<AutomationKey, boolean>;
const DEFAULTS: State = {
  auto_budget: true, auto_categorize: true, spike_detection: true,
  subscription_detect: true, smart_alerts: true,
  goal_suggestions: false, monthly_report: false,
};

export function loadAutomation(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<State>) };
  } catch { return { ...DEFAULTS }; }
}
export function saveAutomation(s: State) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

// ===== Derivations =====
interface Tx { title: string; amount: number; type: string; category: string | null; transaction_date: string; recurring?: boolean | null }

const KEYWORD_MAP: Record<string, string> = {
  // Food
  starbucks: "Food", coffee: "Food", swiggy: "Food", zomato: "Food", restaurant: "Food", dinner: "Food", lunch: "Food", pizza: "Food",
  // Shopping
  amazon: "Shopping", flipkart: "Shopping", myntra: "Shopping", store: "Shopping", mall: "Shopping",
  // Travel
  uber: "Travel", ola: "Travel", flight: "Travel", indigo: "Travel", airbnb: "Travel", hotel: "Travel", train: "Travel", fuel: "Travel", petrol: "Travel",
  // Bills
  rent: "Bills", electricity: "Bills", water: "Bills", internet: "Bills", wifi: "Bills", mobile: "Bills",
  // Entertainment
  netflix: "Entertainment", spotify: "Entertainment", prime: "Entertainment", hotstar: "Entertainment", movie: "Entertainment", cinema: "Entertainment", youtube: "Entertainment",
  // Health
  pharmacy: "Health", doctor: "Health", hospital: "Health", gym: "Health", apollo: "Health",
  // Salary / Income
  salary: "Salary", payroll: "Salary", stipend: "Salary",
  // Investment
  mutual: "Investment", stock: "Investment", zerodha: "Investment", groww: "Investment", crypto: "Investment",
};

export function suggestCategory(title: string): string | null {
  const t = title.toLowerCase();
  for (const k of Object.keys(KEYWORD_MAP)) {
    if (t.includes(k)) return KEYWORD_MAP[k];
  }
  return null;
}

export interface BudgetSuggestion { category: string; suggested: number; spent: number }
export function suggestBudgets(transactions: Tx[], monthlyIncome: number): BudgetSuggestion[] {
  const byCat: Record<string, number> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const c = t.category || "Other";
    byCat[c] = (byCat[c] || 0) + Number(t.amount);
  });
  const totalSpent = Object.values(byCat).reduce((s, v) => s + v, 0) || 1;
  // budget = blend of historical share + recommended cap (% of income)
  const capPct: Record<string, number> = {
    Food: 0.15, Shopping: 0.08, Travel: 0.10, Bills: 0.30, Entertainment: 0.05,
    Health: 0.08, Education: 0.05, Investment: 0.15, Other: 0.05,
  };
  return Object.entries(byCat).map(([category, spent]) => {
    const historyShare = spent / totalSpent;
    const incomeBudget = (capPct[category] ?? 0.05) * monthlyIncome;
    const blended = monthlyIncome > 0 ? Math.round((incomeBudget + historyShare * monthlyIncome) / 2) : Math.round(spent * 1.1);
    return { category, suggested: Math.max(spent, blended), spent };
  }).sort((a, b) => b.spent - a.spent);
}

export interface Spike { category: string; weekAmount: number; baseline: number; multiplier: number }
export function detectSpikes(transactions: Tx[]): Spike[] {
  const now = Date.now();
  const week = 7 * 86400000;
  const weekly: Record<string, number> = {};
  const prior: Record<string, number[]> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const ts = new Date(t.transaction_date).getTime();
    const c = t.category || "Other";
    if (now - ts <= week) weekly[c] = (weekly[c] || 0) + Number(t.amount);
    else if (now - ts <= week * 5) {
      const bucket = Math.floor((now - ts) / week);
      prior[c] = prior[c] || []; prior[c][bucket] = (prior[c][bucket] || 0) + Number(t.amount);
    }
  });
  const out: Spike[] = [];
  for (const c of Object.keys(weekly)) {
    const baseline = (prior[c] || [0, 0, 0, 0]).reduce((s, v) => s + (v || 0), 0) / 4;
    if (baseline > 0 && weekly[c] >= baseline * 1.8) {
      out.push({ category: c, weekAmount: weekly[c], baseline, multiplier: weekly[c] / baseline });
    } else if (baseline === 0 && weekly[c] > 0) {
      out.push({ category: c, weekAmount: weekly[c], baseline: 0, multiplier: Infinity });
    }
  }
  return out.sort((a, b) => b.multiplier - a.multiplier).slice(0, 5);
}

export interface Subscription { title: string; amount: number; occurrences: number }
export function detectSubscriptions(transactions: Tx[]): Subscription[] {
  const groups: Record<string, { amounts: number[]; title: string }> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const key = t.title.trim().toLowerCase();
    groups[key] = groups[key] || { amounts: [], title: t.title };
    groups[key].amounts.push(Number(t.amount));
  });
  const subs: Subscription[] = [];
  for (const g of Object.values(groups)) {
    if (g.amounts.length >= 2) {
      const avg = g.amounts.reduce((s, v) => s + v, 0) / g.amounts.length;
      const variance = g.amounts.every((a) => Math.abs(a - avg) / avg < 0.15);
      if (variance) subs.push({ title: g.title, amount: Math.round(avg), occurrences: g.amounts.length });
    }
  }
  return subs.sort((a, b) => b.amount - a.amount).slice(0, 8);
}

export interface Alert { kind: "warn" | "info" | "good"; message: string }
export function generateAlerts(transactions: Tx[], income: number): Alert[] {
  const alerts: Alert[] = [];
  const spikes = detectSpikes(transactions);
  spikes.forEach((s) => alerts.push({
    kind: "warn",
    message: `You spent ${s.multiplier === Infinity ? "a new" : `${s.multiplier.toFixed(1)}× higher`} amount on ${s.category} this week.`,
  }));
  const totalWeek = transactions
    .filter((t) => t.type === "expense" && Date.now() - new Date(t.transaction_date).getTime() <= 7 * 86400000)
    .reduce((s, t) => s + Number(t.amount), 0);
  if (income > 0 && totalWeek > income * 0.35) alerts.push({ kind: "warn", message: `Weekly spend (${Math.round((totalWeek / income) * 100)}% of income) is high — slow down.` });
  if (income > 0 && totalWeek < income * 0.1) alerts.push({ kind: "good", message: "Excellent control this week — you’re well below your weekly budget." });
  return alerts;
}

export interface GoalSuggestion { name: string; amount: number; rationale: string }
export function suggestGoals(income: number, expenses: number): GoalSuggestion[] {
  const monthlyExp = expenses || income * 0.6;
  return [
    { name: "Emergency Fund", amount: Math.round(monthlyExp * 6), rationale: "6 months of expenses — global safety standard." },
    { name: "Annual Vacation", amount: Math.round(income * 1.5), rationale: "1.5× monthly income — comfortable annual travel budget." },
    { name: "Investment Seed", amount: Math.round(income * 3), rationale: "Initial capital for diversified investments." },
  ];
}
