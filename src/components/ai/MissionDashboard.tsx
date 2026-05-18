import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Mic, Send, LogOut, Settings, Sparkles, TrendingUp, AlertTriangle, Target, Copy, RotateCcw, ThumbsUp, ThumbsDown, Bookmark } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Persona } from "./PersonaSelection";
import { lumoAvatar, coachBg } from "@/assets/personas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  fullText?: string;       // target text while streaming
  streaming?: boolean;
  insights?: Insight[];
  chips?: string[];
}

interface Insight {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  chartData?: { name: string; value: number }[];
}

// Persona-aware response library. Keyword-matched against the user message.
type Reply = { text: string; insights: Insight[] };

const baseLibrary: { keys: string[]; reply: Reply }[] = [
  {
    keys: ["spend", "spending", "analyze", "expenses"],
    reply: {
      text: "I scanned your last 30 days. Overall you're trending well — but dining out is creeping above your usual baseline. A small 10% trim would compound nicely.",
      insights: [
        { label: "Saved this week", value: "₹2,400", change: "+12% vs last week", positive: true },
        { label: "Food spending", value: "₹4,800", change: "22% above budget", positive: false, chartData: [{ name: "Budget", value: 4000 }, { name: "Spent", value: 4800 }] },
      ],
    },
  },
  {
    keys: ["budget", "allocation", "50/30/20", "monthly"],
    reply: {
      text: "Let's structure a balanced budget using the 50/30/20 rule. Based on your income, here's a clean monthly allocation.",
      insights: [
        { label: "Needs", value: "50%", change: "₹27,500" },
        { label: "Wants", value: "30%", change: "₹16,500" },
        { label: "Savings", value: "20%", change: "₹11,000", positive: true, chartData: [{ name: "Needs", value: 50 }, { name: "Wants", value: 30 }, { name: "Savings", value: 20 }] },
      ],
    },
  },
  {
    keys: ["waste", "subscription", "unused", "cancel"],
    reply: {
      text: "I found 3 subscriptions with no usage in the past 30 days. Cancelling these would save you ₹13,800 annually.",
      insights: [
        { label: "Active Subs", value: "8", change: "₹2,840/mo" },
        { label: "Unused Subs", value: "3", change: "Save ₹1,150/mo", positive: true, chartData: [{ name: "Active", value: 5 }, { name: "Unused", value: 3 }] },
      ],
    },
  },
  {
    keys: ["goal", "save more", "emergency", "target"],
    reply: {
      text: "Your goals are on track. At this pace you'll hit your Emergency Fund 2 months early. Want me to redirect ₹2,000/mo to your next goal?",
      insights: [
        { label: "Goal progress", value: "68%", change: "Emergency Fund", positive: true, chartData: [{ name: "Done", value: 68 }, { name: "Left", value: 32 }] },
        { label: "Est. Completion", value: "Aug 2026", change: "2 months early!", positive: true },
      ],
    },
  },
  {
    keys: ["invest", "sip", "portfolio", "stock", "mutual"],
    reply: {
      text: "Your portfolio leans 70% equity / 20% debt / 10% cash. For your risk profile, a small rebalance toward index funds will smooth volatility.",
      insights: [
        { label: "Equity", value: "70%", change: "+3% MoM", positive: true, chartData: [{ name: "Eq", value: 70 }, { name: "Debt", value: 20 }, { name: "Cash", value: 10 }] },
        { label: "Suggested SIP", value: "₹8,000", change: "Index fund", positive: true },
      ],
    },
  },
  {
    keys: ["tax", "income tax", "deduction"],
    reply: {
      text: "You can still claim ₹62,000 in deductions this year via 80C + NPS. Want a step-by-step filing checklist?",
      insights: [
        { label: "80C used", value: "₹88,000", change: "of ₹1.5L" },
        { label: "Potential save", value: "₹19,400", change: "If maxed", positive: true },
      ],
    },
  },
];

const personaLibrary: Record<string, { keys: string[]; reply: Reply }[]> = {
  student: [
    { keys: ["college", "hostel", "pocket"], reply: { text: "Here's a lean student plan: keep mess + essentials under ₹4,500, cap outings at ₹1,500, and stash ₹500 weekly. Tiny, but it compounds.", insights: [
      { label: "Weekly save target", value: "₹500", change: "Doable", positive: true },
      { label: "Monthly buffer", value: "₹2,000", change: "Auto-transfer", positive: true, chartData: [{ name: "Saved", value: 2000 }, { name: "Spent", value: 4500 }] },
    ] } },
    { keys: ["food", "mess", "eating"], reply: { text: "Food is your biggest swing category. Try a 5-day mess plan + 2 outings cap. You'd save around ₹1,800/mo.", insights: [
      { label: "Food now", value: "₹6,300", change: "Above target", positive: false, chartData: [{ name: "Now", value: 6300 }, { name: "Target", value: 4500 }] },
    ] } },
  ],
  salary: [
    { keys: ["salary", "optimize", "paycheck"], reply: { text: "Automate the moment salary lands: 20% to investments, 10% to emergency, then spend the rest guilt-free.", insights: [
      { label: "Auto-save", value: "20%", change: "₹11,000/mo", positive: true },
      { label: "Emergency", value: "10%", change: "₹5,500/mo", positive: true, chartData: [{ name: "Invest", value: 20 }, { name: "Emerg", value: 10 }, { name: "Live", value: 70 }] },
    ] } },
    { keys: ["emi", "loan", "debt"], reply: { text: "Your EMIs eat 28% of take-home. Refinancing your personal loan could drop it to 22% — frees up ₹3,300/mo.", insights: [
      { label: "EMI share", value: "28%", change: "Slightly high", positive: false },
      { label: "After refi", value: "22%", change: "Free ₹3,300", positive: true },
    ] } },
  ],
  investor: [
    { keys: ["risk", "rebalance", "allocation"], reply: { text: "Risk-adjusted, you're slightly overweight on small caps. Trim 5%, rotate into large-cap index, and your Sharpe ratio improves.", insights: [
      { label: "Sharpe", value: "1.1", change: "→ 1.3 projected", positive: true, chartData: [{ name: "Lg", value: 45 }, { name: "Mid", value: 25 }, { name: "Sm", value: 30 }] },
    ] } },
  ],
  hustler: [
    { keys: ["freelance", "client", "revenue", "income"], reply: { text: "Across your 3 income streams, freelance is volatile. Set aside 30% of every payout for taxes + lean months.", insights: [
      { label: "Streams", value: "3", change: "₹84k avg/mo", positive: true, chartData: [{ name: "Free", value: 50 }, { name: "Side", value: 30 }, { name: "Affil", value: 20 }] },
      { label: "Tax buffer", value: "30%", change: "Auto-allocate", positive: true },
    ] } },
  ],
  minimalist: [
    { keys: ["simplify", "essentials", "cut"], reply: { text: "Pared down: 3 categories cover 92% of your needs. Everything else is optional — and that's freedom.", insights: [
      { label: "Core spend", value: "₹18,400", change: "92% of life", positive: true, chartData: [{ name: "Core", value: 92 }, { name: "Extra", value: 8 }] },
    ] } },
  ],
  family: [
    { keys: ["kid", "child", "education", "school"], reply: { text: "For a ₹15L education corpus in 12 years, start a ₹6,200/mo SIP at 11% expected returns. Locked in, stress-free.", insights: [
      { label: "Monthly SIP", value: "₹6,200", change: "12-yr horizon", positive: true },
      { label: "Target", value: "₹15L", change: "Education", positive: true, chartData: [{ name: "Need", value: 100 }] },
    ] } },
  ],
  luxury: [
    { keys: ["travel", "luxury", "lifestyle"], reply: { text: "Your luxury budget is healthy. One smart swap: book international trips 90 days out — same experience, ~22% cheaper.", insights: [
      { label: "Smart swap", value: "22%", change: "Per trip", positive: true },
    ] } },
  ],
  crypto: [
    { keys: ["crypto", "btc", "eth", "defi", "stable"], reply: { text: "Your crypto allocation is 18% of net worth — at the upper edge. Consider rotating 5% into stablecoin yield to cushion volatility.", insights: [
      { label: "Crypto share", value: "18%", change: "High vol", positive: false, chartData: [{ name: "BTC", value: 50 }, { name: "ETH", value: 30 }, { name: "Alt", value: 20 }] },
    ] } },
  ],
};

const findReply = (msg: string, personaId: string): Reply | null => {
  const lower = msg.toLowerCase();
  const candidates = [...(personaLibrary[personaId] ?? []), ...baseLibrary];
  for (const c of candidates) {
    if (c.keys.some((k) => lower.includes(k))) return c.reply;
  }
  return null;
};

const defaultActions = [
  "Analyze my spending",
  "Create a budget",
  "Detect waste",
  "Save more money",
  "Goal planning",
];

const personaPrompts: Record<string, string[]> = {
  student:    ["Create my student budget", "Reduce food expenses", "Track hostel spending", "Save ₹500 this week"],
  salary:     ["Optimize my salary", "Automate my savings", "Plan an emergency fund", "Lower my EMIs"],
  investor:   ["Review my portfolio", "Suggest a SIP", "Risk-check my stocks", "Rebalance ideas"],
  hustler:    ["Track freelance income", "Estimate my taxes", "Forecast monthly revenue", "Cashflow tips"],
  minimalist: ["Simplify my budget", "Cut 3 expenses", "Essentials-only plan", "Quiet money habits"],
  family:     ["Plan for kids' education", "Family insurance check", "Shared monthly budget", "Emergency fund target"],
  luxury:     ["Smart luxury swaps", "Travel budget planner", "Reward optimization", "Wealth + lifestyle balance"],
  crypto:     ["Crypto allocation tips", "DeFi risk check", "Stablecoin strategy", "Tax on crypto gains"],
};

const CHART_COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 81%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(152, 69%, 41%)",
];

const AnimatedValue = ({ value }: { value: string }) => {
  const numMatch = value.match(/(₹?)([\d,]+\.?\d*)(.*)/);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    if (!numMatch) { setDisplayed(value); return; }
    const prefix = numMatch[1];
    const targetNum = parseFloat(numMatch[2].replace(/,/g, ""));
    const suffix = numMatch[3];
    const duration = 1000;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(targetNum * eased);
      setDisplayed(`${prefix}${current.toLocaleString()}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayed}</span>;
};

interface MissionDashboardProps {
  persona: Persona;
  onBack: () => void;
}

const MissionDashboard = ({ persona, onBack }: MissionDashboardProps) => {
  const accentColor = `hsl(${persona.accentHsl})`;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "ai",
      text: `Hey, I'm Lumo AI ✨ — your ${persona.name} coach. I've scanned your recent transactions and I'm ready to help. What should we tackle first?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Stream a finished text into a message id, char by char, like ChatGPT.
  const streamInto = (id: number, full: string) => {
    let i = 0;
    const step = Math.max(2, Math.floor(full.length / 220)); // ~220 frames total
    const tick = () => {
      i = Math.min(full.length, i + step);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, text: full.slice(0, i), streaming: i < full.length } : m
        )
      );
      if (i < full.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const chipPool = (personaId: string): string[] => {
    const pool: Record<string, string[]> = {
      student:    ["Create a weekly food budget", "Find ₹500 I can save", "Track hostel spend"],
      salary:     ["Automate my savings", "Plan emergency fund", "Lower my EMIs"],
      investor:   ["Rebalance my portfolio", "Suggest a SIP", "Risk-check my stocks"],
      hustler:    ["Forecast next month", "Estimate my taxes", "Smooth cash flow"],
      minimalist: ["Cut 3 expenses", "Essentials-only plan", "Quiet money habits"],
      family:     ["Plan kids' education", "Family insurance check", "Shared budget"],
      luxury:     ["Travel budget planner", "Smart luxury swaps", "Reward optimization"],
      crypto:     ["Allocation tips", "Stablecoin strategy", "Tax on crypto gains"],
    };
    return pool[personaId] ?? ["Analyze my spending", "Create a budget plan", "How can I save more?"];
  };

  const sendMessage = async (text: string) => {
    const userMsg: Message = { id: nextId.current++, role: "user", text };
    const history = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const libReply = findReply(text, persona.id);

    try {
      const { data, error } = await supabase.functions.invoke("lumo-chat", {
        body: {
          message: text,
          persona: { id: persona.id, name: persona.name },
          history: history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      const aiText: string =
        !error && data?.text
          ? data.text
          : libReply?.text ??
            `Let me think about "${text}" through your ${persona.name} lens and surface one concrete next step.`;

      const id = nextId.current++;
      const aiMsg: Message = {
        id,
        role: "ai",
        text: "",
        fullText: aiText,
        streaming: true,
        insights: libReply?.insights,
        chips: chipPool(persona.id),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
      streamInto(id, aiText);
    } catch (e) {
      console.error("Lumo AI error", e);
      const id = nextId.current++;
      const fallback = libReply?.text ?? "I hit a hiccup reaching the AI service. Try again in a moment.";
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id, role: "ai", text: "", fullText: fallback, streaming: true,
        insights: libReply?.insights, chips: chipPool(persona.id),
      }]);
      streamInto(id, fallback);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const quickActions = personaPrompts[persona.id] ?? defaultActions;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full w-full absolute inset-0 overflow-hidden bg-[#fafafa]"
    >
      {/* Uploaded immersive background */}
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <img src={coachBg} alt="" className="w-full h-full object-cover" style={{ objectPosition: "center 30%" }} />
        <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/90" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`bg-particle-${i}`}
          animate={{ 
            y: ["100%", "-10%"],
            x: [0, Math.sin(i) * 50, 0],
            opacity: [0, 0.4, 0],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 10 + Math.random() * 20, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 5
          }}
          className="absolute bottom-0 w-3 h-3 rounded-md bg-gradient-to-tr from-blue-200/30 to-purple-200/30 backdrop-blur-sm pointer-events-none"
          style={{ left: `${5 + Math.random() * 90}%` }}
        />
      ))}

      {/* ═══ Top Mission HUD Bar ═══ */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
        className="shrink-0 relative z-30 px-4 sm:px-8 py-6"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/60 border border-white backdrop-blur-xl text-gray-900 hover:bg-white transition-all shadow-sm group"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-bold tracking-widest uppercase text-blue-600 mb-1">Current Mission</p>
              <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
                Save ₹15,000 This Month <Target className="w-5 h-5 text-emerald-500" />
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-card bg-white/60 border-white px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">Streak</p>
                  <p className="text-sm font-bold text-gray-900 leading-none mt-1">12 Days</p>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
                  Lvl {persona.level}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">XP</p>
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-500 w-[65%]" />
                  </div>
                </div>
              </div>
            </div>
            <button className="w-12 h-12 rounded-2xl bg-white/60 border border-white backdrop-blur-xl flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white shadow-sm transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Main Chat Area ═══ */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto relative z-10 scrollbar-none pt-2 pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-10">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "ai" ? (
                  <div className="flex gap-4 sm:gap-6 max-w-[95%] sm:max-w-[85%]">
                    {/* AI Avatar */}
                    <div className="shrink-0 pt-2">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-md ring-2 ring-white relative"
                        style={{ background: `linear-gradient(135deg, hsl(${persona.accentHsl} / 0.15), hsl(${persona.accentHsl} / 0.05))` }}
                      >
                        <img src={lumoAvatar} alt="Lumo AI" className="w-full h-full object-cover" />
                      </motion.div>
                    </div>
                    
                    {/* AI Message Container */}
                    <div className="space-y-4 w-full">
                      <div className="glass-card p-6 sm:p-7 rounded-[32px] rounded-tl-xl bg-white/85 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-[20px] pointer-events-none" />
                        <div className="relative z-10 prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:text-gray-900 prose-h2:text-base prose-h2:uppercase prose-h2:tracking-wider prose-h2:text-gray-500 prose-h2:mt-4 prose-h2:mb-2 prose-p:text-gray-800 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:my-2 prose-li:my-0.5 prose-li:text-gray-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text || "‎"}
                          </ReactMarkdown>
                          {msg.streaming && (
                            <span className="inline-block w-2 h-5 align-[-2px] ml-0.5 bg-blue-500 animate-pulse rounded-sm" />
                          )}
                        </div>

                        {/* Toolbar */}
                        {!msg.streaming && (
                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1 text-gray-400">
                            <button onClick={() => { navigator.clipboard.writeText(msg.text); toast.success("Copied"); }} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                            <button onClick={() => sendMessage(messages.find(x => x.role === 'user' && x.id < msg.id)?.text ?? 'Try again')} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Regenerate"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button onClick={() => toast.success("Thanks for the feedback")} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-emerald-600 transition-colors" title="Helpful"><ThumbsUp className="w-3.5 h-3.5" /></button>
                            <button onClick={() => toast("Got it — I'll improve")} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-rose-600 transition-colors" title="Not helpful"><ThumbsDown className="w-3.5 h-3.5" /></button>
                            <button onClick={() => toast.success("Saved to insights")} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-amber-600 transition-colors" title="Save"><Bookmark className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>

                      {/* Follow-up suggestion chips */}
                      {!msg.streaming && msg.chips && msg.chips.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
                          {msg.chips.map((chip) => (
                            <button
                              key={chip}
                              onClick={() => sendMessage(chip)}
                              className="px-3.5 py-2 text-sm rounded-full bg-white/80 border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all backdrop-blur-md flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3 h-3 text-blue-500" /> {chip}
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {/* Dynamic AI Insights */}
                      {msg.insights && msg.insights.length > 0 && !msg.streaming && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {msg.insights.map((insight, idx) => (
                            <motion.div
                              key={insight.label}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5, type: "spring" }}
                              className="glass-card p-6 rounded-[24px] bg-white border border-gray-100 shadow-sm relative overflow-hidden group"
                            >
                              <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">
                                {insight.label}
                              </p>
                              <p className="font-display text-3xl font-bold text-gray-900 mb-3">
                                <AnimatedValue value={insight.value} />
                              </p>

                              {insight.change && (
                                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${
                                  insight.positive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : insight.positive === false
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {insight.positive ? <TrendingUp className="w-3.5 h-3.5" /> : insight.positive === false ? <AlertTriangle className="w-3.5 h-3.5" /> : null}
                                  {insight.change}
                                </div>
                              )}

                              {insight.chartData && (
                                <div className="mt-5 h-16 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    {insight.chartData.length <= 2 ? (
                                      <PieChart>
                                        <Pie data={insight.chartData} cx="85%" cy="50%" innerRadius={18} outerRadius={32} dataKey="value" strokeWidth={0}>
                                          {insight.chartData.map((_, ci) => (
                                            <Cell key={ci} fill={ci === 0 ? accentColor : "hsl(220, 20%, 94%)"} />
                                          ))}
                                        </Pie>
                                      </PieChart>
                                    ) : (
                                      <BarChart data={insight.chartData}>
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                          {insight.chartData.map((_, ci) => (
                                            <Cell key={ci} fill={CHART_COLORS[ci % CHART_COLORS.length]} />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    )}
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] sm:max-w-[70%]">
                    <div className="p-5 sm:p-6 rounded-[28px] rounded-tr-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 text-white shadow-[0_12px_40px_-12px_rgba(99,102,241,0.5)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/15 rounded-full blur-[30px]" />
                      <p className="text-base sm:text-lg leading-relaxed relative z-10 font-medium">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex gap-4 sm:gap-6 max-w-[80%]"
              >
                <div className="shrink-0 pt-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-md ring-2 ring-white">
                    <img src={lumoAvatar} alt="Lumo AI" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="px-5 py-4 rounded-[24px] rounded-tl-xl bg-white/80 border border-white backdrop-blur-xl flex items-center gap-3 shadow-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-500"
                  />
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="text-sm font-medium bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-500 bg-clip-text text-transparent"
                  >
                    Lumo AI is analyzing your finances…
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="h-2" />
        </div>
      </div>

      {/* ═══ Smart Input Dock ═══ */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
        className="shrink-0 relative z-30 pb-4 pt-4 px-4 sm:px-8 bg-gradient-to-t from-[#fafafa] via-[#fafafa]/90 to-transparent"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Quick Actions (Scrollable) */}
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 mask-linear-fade">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action)}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm text-sm font-medium text-gray-700 hover:text-gray-900 hover:border-gray-200 hover:shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" /> {action}
              </button>
            ))}
          </div>

          {/* Floating Input Area */}
          <div className="glass-card bg-white/80 border-white p-2 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center gap-2">
            <button className="w-12 h-12 flex items-center justify-center rounded-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
              <Mic className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything about your finances..."
              className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 placeholder:text-gray-400 px-2"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors shrink-0 shadow-md"
            >
              <Send className="w-5 h-5 -ml-0.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MissionDashboard;
