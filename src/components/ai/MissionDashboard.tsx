import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { Persona } from "./PersonaSelection";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  insights?: Insight[];
}

interface Insight {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  chartData?: { name: string; value: number }[];
}

const aiResponses: Record<string, { text: string; insights: Insight[] }> = {
  "Analyze Spending": {
    text: "📊 I've scanned your spending for the past 30 days. Your dining expenses are above budget, but transport costs dropped nicely!",
    insights: [
      { label: "Total Spent", value: "₹27,940", change: "-5.2% vs last month", positive: true },
      { label: "Dining Out", value: "₹4,800", change: "22% above budget", positive: false, chartData: [{ name: "Budget", value: 4000 }, { name: "Spent", value: 4800 }] },
      { label: "Transport", value: "₹3,100", change: "38% under budget", positive: true },
      { label: "Subscriptions", value: "3 active", change: "₹1,847/mo total" },
    ],
  },
  "Create Budget": {
    text: "🎯 Based on your ₹55,000 income and spending patterns, here's an optimized 50/30/20 budget:",
    insights: [
      { label: "Needs (50%)", value: "₹27,500", change: "Rent, Bills, Groceries" },
      { label: "Wants (30%)", value: "₹16,500", change: "Dining, Shopping, Fun" },
      { label: "Savings (20%)", value: "₹11,000", change: "Goals + Emergency" },
      { label: "Projected Savings", value: "₹1,32,000/yr", change: "+23% vs current", positive: true },
    ],
  },
  "Save More": {
    text: "💡 Found 5 ways to save more this month:",
    insights: [
      { label: "Cancel Unused Sub", value: "Save ₹499/mo", change: "Spotify unused 3 weeks", positive: true },
      { label: "Meal Prep", value: "Save ₹2,400/mo", change: "Reduce dining 50%", positive: true },
      { label: "Switch Insurance", value: "Save ₹3,600/yr", change: "Better plan available", positive: true },
      { label: "Total Potential", value: "₹6,499/mo", change: "₹77,988 per year!", positive: true },
    ],
  },
  "Monthly Report": {
    text: "📈 Complete financial report: income is up and expenses are down!",
    insights: [
      { label: "Net Income", value: "+₹27,060", change: "+23% vs Feb", positive: true },
      { label: "Top Category", value: "Food ₹8,240", change: "29.5% of spending", chartData: [{ name: "Food", value: 8240 }, { name: "Transport", value: 4500 }, { name: "Shopping", value: 6200 }, { name: "Bills", value: 5800 }, { name: "Fun", value: 3200 }] },
      { label: "Savings Rate", value: "49.2%", change: "Above target of 30%", positive: true },
      { label: "Goal Progress", value: "65%", change: "Emergency Fund on track", positive: true },
    ],
  },
  "Goals Plan": {
    text: "🎯 3 active savings goals. Emergency Fund is looking great!",
    insights: [
      { label: "Emergency Fund", value: "68%", change: "₹1,36,000 / ₹2,00,000", positive: true, chartData: [{ name: "Saved", value: 68 }, { name: "Left", value: 32 }] },
      { label: "Vacation Fund", value: "56%", change: "₹45,000 / ₹80,000" },
      { label: "New Laptop", value: "80%", change: "₹72,000 / ₹90,000", positive: true },
      { label: "Est. Completion", value: "Aug 2026", change: "All goals", positive: true },
    ],
  },
};

const quickActions = [
  { label: "Analyze Spending", icon: "⚡" },
  { label: "Create Budget", icon: "🛡️" },
  { label: "Save More", icon: "💎" },
  { label: "Monthly Report", icon: "📊" },
  { label: "Goals Plan", icon: "🎯" },
];

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
    const duration = 700;
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
      text: `Welcome! 👋 I'm your AI Finance Coach, tailored for the "${persona.name}" style. Choose an action below to get started!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const sendMessage = (text: string) => {
    const userMsg: Message = { id: nextId.current++, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const response = aiResponses[text] || {
      text: `Analyzing "${text}" for your ${persona.name} profile...`,
      insights: [
        { label: "Quick Insight", value: "Processing", change: "Based on your data", positive: true },
      ],
    };

    setTimeout(() => {
      setIsTyping(false);
      const aiMsg: Message = {
        id: nextId.current++,
        role: "ai",
        text: response.text,
        insights: response.insights,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000 + Math.random() * 600);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-screen w-screen relative overflow-hidden bg-[hsl(0,0%,98%)]"
    >
      {/* Light background blobs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(262,83%,58%/0.04)] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[hsl(217,91%,60%/0.04)] blur-[80px] pointer-events-none" />

      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="shrink-0 relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="hidden sm:block h-4 w-px bg-border/60" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-lg">{persona.emoji}</span>
              <div>
                <p className="text-sm font-display font-semibold text-foreground">{persona.name}</p>
                <p className="text-[10px] text-muted-foreground">AI Finance Coach</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Streak</p>
              <p className="text-sm font-display font-bold text-foreground">🔥 7d</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-muted-foreground">Score</p>
              <p className="text-sm font-display font-bold" style={{ color: accentColor }}>740</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Chat Area ═══ */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                layout
              >
                {msg.role === "ai" ? (
                  <div className="space-y-3">
                    <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm">
                      <div className="flex items-start gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                          style={{ background: `hsl(${persona.accentHsl} / 0.1)`, color: accentColor }}
                        >
                          {persona.emoji}
                        </div>
                        <p className="text-xs text-muted-foreground pt-1.5">AI Coach · just now</p>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80 pl-11">{msg.text}</p>
                    </div>

                    {msg.insights && msg.insights.length > 0 && (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pl-2 sm:pl-6">
                        {msg.insights.map((insight, idx) => (
                          <motion.div
                            key={insight.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 * idx + 0.2, duration: 0.3 }}
                            className="p-3 sm:p-4 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm"
                          >
                            <div
                              className="w-1 h-full absolute top-0 left-0 rounded-l-xl"
                              style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                              {insight.label}
                            </p>
                            <p className="font-display text-base sm:text-lg font-bold text-foreground">
                              <AnimatedValue value={insight.value} />
                            </p>
                            {insight.change && (
                              <p className={`text-[11px] mt-0.5 ${
                                insight.positive
                                  ? "text-[hsl(152,69%,41%)]"
                                  : insight.positive === false
                                  ? "text-[hsl(0,72%,51%)]"
                                  : "text-muted-foreground"
                              }`}>
                                {insight.change}
                              </p>
                            )}

                            {insight.chartData && (
                              <div className="mt-2 h-10">
                                <ResponsiveContainer width="100%" height="100%">
                                  {insight.chartData.length <= 2 ? (
                                    <PieChart>
                                      <Pie data={insight.chartData} cx="50%" cy="50%" innerRadius={8} outerRadius={16} dataKey="value" strokeWidth={0}>
                                        {insight.chartData.map((_, ci) => (
                                          <Cell key={ci} fill={ci === 0 ? accentColor : "hsl(0,0%,90%)"} />
                                        ))}
                                      </Pie>
                                    </PieChart>
                                  ) : (
                                    <BarChart data={insight.chartData}>
                                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
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
                ) : (
                  <div className="flex justify-end">
                    <div className="px-4 py-3 rounded-2xl rounded-br-md max-w-[80%] shadow-sm text-background text-sm"
                      style={{ background: accentColor }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{ background: `hsl(${persona.accentHsl} / 0.1)` }}
                  >
                    {persona.emoji}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ═══ Quick Actions + Input ═══ */}
      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-xl relative z-10">
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => sendMessage(action.label)}
                disabled={isTyping}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/50 bg-background text-xs font-medium text-foreground/70 hover:text-foreground hover:border-border hover:shadow-sm transition-all duration-200 disabled:opacity-30"
              >
                <span>{action.icon}</span>
                {action.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-4 sm:pb-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
              placeholder="Ask your AI coach anything..."
              disabled={isTyping}
              className="flex-1 px-4 py-3 rounded-2xl border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-border/50 transition-all disabled:opacity-50 shadow-sm"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="px-5 py-3 rounded-2xl text-sm font-medium text-background transition-opacity disabled:opacity-30 shadow-sm"
              style={{ background: accentColor }}
            >
              Send
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MissionDashboard;
