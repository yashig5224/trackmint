// Realistic demo dataset that mirrors the live Supabase shapes.
// Used by Demo Mode (/dashboard) — never written to the database.

export interface DemoTx {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  payment_method: string | null;
  note: string | null;
  recurring: boolean | null;
  transaction_date: string;
}

export interface DemoGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
}

export interface DemoBudget {
  id: string;
  category: string;
  monthly_limit: number;
  spent_amount: number;
  month: string;
}

export interface DemoAIHistory {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
}

export interface DemoAutomationLog {
  id: string;
  action_taken: string;
  reason: string;
  amount_impact: number | null;
  created_at: string;
}

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const back = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return iso(d); };
const id = (p: string, n: number) => `demo-${p}-${n}`;

// 90 days of realistic Indian-market transactions
const txTemplates: Array<Omit<DemoTx, "id" | "transaction_date">> = [
  { title: "Monthly Salary — Acme Corp",  amount: 185000, type: "income",  category: "Salary",        payment_method: "Bank",   recurring: true,  note: "Payroll" },
  { title: "Freelance — Design Project",  amount: 24000,  type: "income",  category: "Salary",        payment_method: "UPI",    recurring: false, note: null },
  { title: "Dividend Credit",             amount: 3200,   type: "income",  category: "Investment",    payment_method: "Bank",   recurring: false, note: null },

  { title: "Rent — Apartment",            amount: 38000,  type: "expense", category: "Bills",         payment_method: "Bank",   recurring: true,  note: null },
  { title: "Electricity Bill",            amount: 2480,   type: "expense", category: "Bills",         payment_method: "UPI",    recurring: true,  note: null },
  { title: "Internet — JioFiber",         amount: 999,    type: "expense", category: "Bills",         payment_method: "UPI",    recurring: true,  note: null },
  { title: "Mobile Recharge",             amount: 749,    type: "expense", category: "Bills",         payment_method: "UPI",    recurring: true,  note: null },

  { title: "Swiggy — Dinner",             amount: 640,    type: "expense", category: "Food",          payment_method: "UPI",    recurring: false, note: null },
  { title: "Zomato — Lunch",              amount: 420,    type: "expense", category: "Food",          payment_method: "UPI",    recurring: false, note: null },
  { title: "Starbucks",                   amount: 380,    type: "expense", category: "Food",          payment_method: "Card",   recurring: false, note: null },
  { title: "BigBasket Groceries",         amount: 4250,   type: "expense", category: "Food",          payment_method: "Card",   recurring: false, note: null },
  { title: "Cafe Coffee Day",             amount: 290,    type: "expense", category: "Food",          payment_method: "UPI",    recurring: false, note: null },

  { title: "Uber — Office",               amount: 245,    type: "expense", category: "Travel",        payment_method: "UPI",    recurring: false, note: null },
  { title: "Ola — Airport",               amount: 680,    type: "expense", category: "Travel",        payment_method: "Card",   recurring: false, note: null },
  { title: "IndiGo Flight — BLR/DEL",     amount: 6800,   type: "expense", category: "Travel",        payment_method: "Card",   recurring: false, note: null },
  { title: "Petrol — Indian Oil",         amount: 2200,   type: "expense", category: "Travel",        payment_method: "Card",   recurring: false, note: null },

  { title: "Amazon — Electronics",        amount: 5499,   type: "expense", category: "Shopping",      payment_method: "Card",   recurring: false, note: null },
  { title: "Myntra — Apparel",            amount: 3299,   type: "expense", category: "Shopping",      payment_method: "Card",   recurring: false, note: null },
  { title: "Decathlon — Running Shoes",   amount: 4199,   type: "expense", category: "Shopping",      payment_method: "Card",   recurring: false, note: null },

  { title: "Netflix",                     amount: 649,    type: "expense", category: "Entertainment", payment_method: "Card",   recurring: true,  note: "Subscription" },
  { title: "Spotify Premium",             amount: 119,    type: "expense", category: "Entertainment", payment_method: "Card",   recurring: true,  note: "Subscription" },
  { title: "ChatGPT Plus",                amount: 1699,   type: "expense", category: "Entertainment", payment_method: "Card",   recurring: true,  note: "Subscription" },
  { title: "PVR — Movie",                 amount: 720,    type: "expense", category: "Entertainment", payment_method: "UPI",    recurring: false, note: null },

  { title: "Apollo Pharmacy",             amount: 480,    type: "expense", category: "Health",        payment_method: "UPI",    recurring: false, note: null },
  { title: "Cult.fit Membership",         amount: 1499,   type: "expense", category: "Health",        payment_method: "Card",   recurring: true,  note: "Subscription" },

  { title: "Coursera — Course",           amount: 2999,   type: "expense", category: "Education",     payment_method: "Card",   recurring: false, note: null },

  { title: "Mutual Fund SIP — Nifty 50",  amount: 15000,  type: "expense", category: "Investment",    payment_method: "Bank",   recurring: true,  note: "SIP" },
  { title: "PPF Contribution",            amount: 5000,   type: "expense", category: "Investment",    payment_method: "Bank",   recurring: true,  note: null },
];

// Sprinkle across last 90 days with a roughly weekly cadence per item
export const DEMO_TRANSACTIONS: DemoTx[] = txTemplates.flatMap((t, i) => {
  const isIncome = t.type === "income";
  const isRecurring = !!t.recurring;
  const occurrences = isIncome ? 3 : isRecurring ? 3 : 4;
  return Array.from({ length: occurrences }, (_, k) => {
    const offset = isRecurring ? k * 30 + (i % 5) : Math.floor((k * 90) / occurrences) + (i % 7);
    return { ...t, id: id("tx", i * 10 + k), transaction_date: back(Math.min(89, offset)) };
  });
});

export const DEMO_GOALS: DemoGoal[] = [
  { id: id("goal", 1), goal_name: "Emergency Fund",     target_amount: 300000, current_amount: 182000, deadline: back(-180), category: "Safety" },
  { id: id("goal", 2), goal_name: "Goa Trip — December", target_amount: 60000,  current_amount: 28500,  deadline: back(-120), category: "Travel" },
  { id: id("goal", 3), goal_name: "New MacBook Pro",    target_amount: 220000, current_amount: 145000, deadline: back(-90),  category: "Tech" },
  { id: id("goal", 4), goal_name: "Investment Target",  target_amount: 500000, current_amount: 215000, deadline: back(-300), category: "Investment" },
];

const monthKey = today.toISOString().slice(0, 7) + "-01";
export const DEMO_BUDGETS: DemoBudget[] = [
  { id: id("bud", 1), category: "Food",          monthly_limit: 12000, spent_amount: 9420,  month: monthKey },
  { id: id("bud", 2), category: "Travel",        monthly_limit: 8000,  spent_amount: 9925,  month: monthKey },
  { id: id("bud", 3), category: "Shopping",      monthly_limit: 10000, spent_amount: 12997, month: monthKey },
  { id: id("bud", 4), category: "Entertainment", monthly_limit: 4000,  spent_amount: 3187,  month: monthKey },
  { id: id("bud", 5), category: "Bills",         monthly_limit: 45000, spent_amount: 42228, month: monthKey },
];

export const DEMO_AI_HISTORY: DemoAIHistory[] = [
  { id: id("ai", 1), prompt: "How much can I safely invest each month?",            response: "Based on your ₹1.85L income and 18% savings rate, you can sustainably invest ₹22,000–₹28,000/month while keeping a 3-month emergency buffer.", created_at: back(2) },
  { id: id("ai", 2), prompt: "Am I overspending on food?",                          response: "Your Food category is at 78% of your ₹12,000 budget with 9 days remaining. You're trending ~₹2,300 over — consider cooking 2 dinners this week.", created_at: back(5) },
  { id: id("ai", 3), prompt: "Can I afford the Goa trip in December?",              response: "Yes — at your current ₹4,750/mo savings velocity, you'll reach ₹60,000 by Nov 18, comfortably before December.", created_at: back(8) },
  { id: id("ai", 4), prompt: "Find subscriptions I might not be using.",            response: "ChatGPT Plus (₹1,699) hasn't shown engagement signals in 38 days. Cult.fit (₹1,499) charged but no check-ins logged. Potential savings: ₹3,198/mo.", created_at: back(12) },
];

export const DEMO_AUTOMATION_LOGS: DemoAutomationLog[] = [
  { id: id("aut", 1), action_taken: "Budget Guardian flagged Travel category",       reason: "Spent ₹9,925 of ₹8,000 (124%) — over limit",          amount_impact: -1925, created_at: back(1) },
  { id: id("aut", 2), action_taken: "Subscription Watcher detected duplicate",       reason: "Spotify Premium charged twice on the same card",       amount_impact: -119,  created_at: back(3) },
  { id: id("aut", 3), action_taken: "Savings Booster suggested SIP increase",        reason: "3-month surplus avg ₹28k — capacity for +₹5k SIP",     amount_impact: 5000,  created_at: back(6) },
  { id: id("aut", 4), action_taken: "Goal Accelerator: Emergency Fund on track",     reason: "Reached 60% — projected completion Mar 2027",          amount_impact: null,  created_at: back(9) },
  { id: id("aut", 5), action_taken: "Weekly Digest delivered",                       reason: "Net +₹12,400 this week, top category: Food",           amount_impact: 12400, created_at: back(7) },
];

export const DEMO_PROFILE = {
  id: "demo-user",
  full_name: "Alex Morgan",
  email: "demo@fintrack.ai",
  currency: "INR",
  monthly_income: 185000,
  selected_persona: "salary" as const,
  level: 7,
  xp: 2840,
  onboarded: true,
};
