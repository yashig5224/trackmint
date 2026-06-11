// Banking provider registry. Real Plaid / Setu / Tink / Salt Edge / Finvu /
// Perfios / Account Aggregator integrations should expose the same three
// primitives — `initiateConsent`, `fetchAccounts`, `fetchTransactions` — and
// be added here. The UI is provider-agnostic and reads from this list.

export type ProviderRegion = "india" | "global";

export interface BankProvider {
  id: string;
  name: string;
  region: ProviderRegion;
  description: string;
  consentMode: "oauth" | "aa" | "redirect";
  enabled: boolean;
}

export const BANK_PROVIDERS: BankProvider[] = [
  { id: "aa",        name: "Account Aggregator", region: "india",  description: "RBI-licensed AA framework (Finvu / OneMoney / NADL)", consentMode: "aa",       enabled: true  },
  { id: "setu",      name: "Setu",               region: "india",  description: "Setu AA — instant bank consent",                     consentMode: "aa",       enabled: true  },
  { id: "perfios",   name: "Perfios",            region: "india",  description: "Perfios bank statement analysis",                    consentMode: "aa",       enabled: false },
  { id: "finvu",     name: "Finvu",              region: "india",  description: "Finvu AA aggregator",                                consentMode: "aa",       enabled: false },
  { id: "plaid",     name: "Plaid",              region: "global", description: "Plaid Link — US / CA / EU / UK",                     consentMode: "oauth",    enabled: true  },
  { id: "tink",      name: "Tink",               region: "global", description: "Tink (Visa) — European banks",                       consentMode: "oauth",    enabled: false },
  { id: "salt_edge", name: "Salt Edge",          region: "global", description: "Salt Edge — 5,000+ banks worldwide",                 consentMode: "oauth",    enabled: false },
];

// Realistic Indian banks for the mock consent flow
export const SAMPLE_BANKS = [
  { name: "HDFC Bank",      colors: "from-blue-500 to-blue-700" },
  { name: "ICICI Bank",     colors: "from-orange-500 to-red-600" },
  { name: "Axis Bank",      colors: "from-purple-600 to-pink-600" },
  { name: "State Bank of India", colors: "from-indigo-600 to-blue-800" },
  { name: "Kotak Mahindra", colors: "from-red-600 to-rose-700" },
  { name: "Yes Bank",       colors: "from-blue-600 to-indigo-700" },
  { name: "IDFC First",     colors: "from-rose-500 to-pink-700" },
  { name: "Federal Bank",   colors: "from-amber-500 to-orange-700" },
];

// Sample merchants used to synthesize realistic synced transactions when a
// provider sandbox isn't wired. Replace with real provider response in prod.
const MERCHANTS: Array<{ title: string; category: string; min: number; max: number; type: "income" | "expense"; recurring?: boolean }> = [
  { title: "Salary Credit",        category: "Salary",        min: 60000, max: 180000, type: "income",  recurring: true },
  { title: "Swiggy",               category: "Food & Dining", min: 180,   max: 850,    type: "expense" },
  { title: "Zomato",               category: "Food & Dining", min: 200,   max: 1200,   type: "expense" },
  { title: "Uber",                 category: "Transport",     min: 80,    max: 540,    type: "expense" },
  { title: "Amazon",               category: "Shopping",      min: 299,   max: 4999,   type: "expense" },
  { title: "Flipkart",             category: "Shopping",      min: 199,   max: 8999,   type: "expense" },
  { title: "Netflix",              category: "Entertainment", min: 649,   max: 649,    type: "expense", recurring: true },
  { title: "Spotify Premium",      category: "Entertainment", min: 119,   max: 119,    type: "expense", recurring: true },
  { title: "BESCOM Electricity",   category: "Utilities",     min: 1200,  max: 3800,   type: "expense", recurring: true },
  { title: "Airtel Postpaid",      category: "Utilities",     min: 499,   max: 999,    type: "expense", recurring: true },
  { title: "Big Basket",           category: "Groceries",     min: 600,   max: 3200,   type: "expense" },
  { title: "Apollo Pharmacy",      category: "Health",        min: 250,   max: 1800,   type: "expense" },
  { title: "IRCTC",                category: "Travel",        min: 450,   max: 2400,   type: "expense" },
  { title: "Cult.fit",             category: "Health",        min: 999,   max: 1999,   type: "expense", recurring: true },
  { title: "Petrol Pump",          category: "Transport",     min: 1500,  max: 3500,   type: "expense" },
  { title: "Starbucks",            category: "Food & Dining", min: 240,   max: 720,    type: "expense" },
];

export interface SyncedTx {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  payment_method: string;
  transaction_date: string;
  recurring: boolean;
  note: string;
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

/**
 * Generates a realistic batch of bank transactions for the given window.
 * In production replace this with calls to Plaid/Setu/etc.
 */
export function generateSyncedTransactions(opts: {
  bankName: string;
  accountType: string;
  daysBack: number;
  count?: number;
}): SyncedTx[] {
  const { bankName, accountType, daysBack, count = randInt(8, 18) } = opts;
  const out: SyncedTx[] = [];
  const now = Date.now();
  const method = accountType === "credit_card" ? "Credit Card" : "Bank Transfer";

  for (let i = 0; i < count; i++) {
    const m = MERCHANTS[randInt(0, MERCHANTS.length - 1)];
    const daysAgo = randInt(0, daysBack);
    const date = new Date(now - daysAgo * 86400000).toISOString().slice(0, 10);
    out.push({
      title: m.title,
      amount: Math.round(rand(m.min, m.max)),
      type: m.type,
      category: m.category,
      payment_method: method,
      transaction_date: date,
      recurring: !!m.recurring,
      note: `Imported from ${bankName}`,
    });
  }
  return out.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
}

export function generateBalance(accountType: string): { current: number; available: number } {
  if (accountType === "credit_card") {
    const used = randInt(5000, 80000);
    const limit = randInt(150000, 500000);
    return { current: -used, available: limit - used };
  }
  const bal = randInt(20000, 850000);
  return { current: bal, available: Math.max(0, bal - randInt(0, 5000)) };
}

export function maskAccountNumber(): string {
  const last4 = String(randInt(1000, 9999));
  return `XXXX XXXX ${last4}`;
}
