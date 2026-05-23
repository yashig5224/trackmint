import { Sparkles, Crown, Zap } from "lucide-react";

export type PlanId = "free" | "pro" | "elite";
export type BillingCycle = "monthly" | "yearly";

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  badge?: string;
  icon: typeof Sparkles;
  priceMonthly: number;
  priceYearly: number;
  priceIdMonthly?: string;
  priceIdYearly?: string;
  cta: string;
  highlight: boolean;
  gradient: string;
  ring: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter",
    tagline: "Get the basics in motion.",
    icon: Sparkles,
    priceMonthly: 0,
    priceYearly: 0,
    cta: "Start Free",
    highlight: false,
    gradient: "from-white via-white to-blue-50/40",
    ring: "ring-1 ring-slate-200/70",
    features: [
      "Basic expense tracking",
      "Demo mode access",
      "10 Lumo AI chats / day",
      "Basic reports",
      "Up to 3 goals",
      "Basic analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlock intelligent finance.",
    badge: "Most Popular",
    icon: Zap,
    priceMonthly: 299,
    priceYearly: 2999,
    priceIdMonthly: "pro_monthly",
    priceIdYearly: "pro_yearly",
    cta: "Upgrade to Pro",
    highlight: true,
    gradient: "from-indigo-50 via-white to-violet-50",
    ring: "ring-2 ring-indigo-400/60",
    features: [
      "Unlimited Lumo AI chats",
      "Advanced analytics",
      "Spending heatmap",
      "Smart AI insights",
      "Goal forecasting",
      "Export reports (PDF / CSV)",
      "AI recommendations",
      "Real-time dashboard",
    ],
  },
  {
    id: "elite",
    name: "Elite AI+",
    tagline: "Your private financial intelligence.",
    icon: Crown,
    priceMonthly: 799,
    priceYearly: 7999,
    priceIdMonthly: "elite_monthly",
    priceIdYearly: "elite_yearly",
    cta: "Unlock Elite AI",
    highlight: false,
    gradient: "from-violet-50 via-fuchsia-50 to-white",
    ring: "ring-1 ring-violet-300/70",
    features: [
      "Everything in Pro",
      "GPT + Gemini + Claude routing",
      "Voice AI Coach",
      "Investment analysis",
      "Financial forecasting",
      "AI memory system",
      "Advanced AI reports",
      "Priority AI processing",
      "Smart wealth insights",
    ],
  },
];

export const COMPARISON_ROWS: { label: string; values: [string, string, string] }[] = [
  { label: "AI Chats / day", values: ["10", "Unlimited", "Unlimited + Priority"] },
  { label: "Reports", values: ["Basic", "Advanced + Export", "AI-generated"] },
  { label: "Spending Heatmap", values: ["—", "✓", "✓"] },
  { label: "AI Forecasting", values: ["—", "✓", "Multi-horizon"] },
  { label: "Multi-AI (GPT/Gemini/Claude)", values: ["—", "—", "✓"] },
  { label: "Export Reports", values: ["—", "✓", "✓"] },
  { label: "Voice AI Coach", values: ["—", "—", "✓"] },
  { label: "Smart Insights", values: ["Basic", "Advanced", "Wealth-grade"] },
  { label: "Goal Forecasting", values: ["—", "✓", "✓"] },
];

export const FAQ_ITEMS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel with one click from Manage Subscription. You keep access until the end of your current billing period.",
  },
  {
    q: "Is payment secure?",
    a: "All payments are processed by Stripe with PCI-DSS level 1 compliance. We never see or store your card details.",
  },
  {
    q: "Which AI models are included?",
    a: "Pro uses our optimized Lumo model. Elite AI+ unlocks routing across GPT, Gemini and Claude for the best answer on every question.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes — upgrade, downgrade or switch billing cycles anytime. Changes are pro-rated automatically.",
  },
  {
    q: "Is my financial data encrypted?",
    a: "Everything is encrypted in transit (TLS 1.3) and at rest (AES-256). Your data is yours — we never sell it.",
  },
];
