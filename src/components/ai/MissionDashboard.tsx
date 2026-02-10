import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { Persona } from "./PersonaSelection";

// ─── Types ───
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

// ─── AI Responses ───
const aiResponses: Record<string, { text: string; insights: Insight[] }> = {
  "Analyze my spending": {
    text: "📊 I've analyzed your spending for the past 30 days. Here's what stands out — your dining expenses are significantly above your set budget, but your transport costs dropped nicely this month. Let's dig in:",
    insights: [
      { label: "Total Spent", value: "₹27,940", change: "-5.2% vs last month", positive: true },
      { label: "Dining Out", value: "₹4,800", change: "22% above budget", positive: false, chartData: [{ name: "Budget", value: 4000 }, { name: "Spent", value: 4800 }] },
      { label: "Transport", value: "₹3,100", change: "38% under budget", positive: true },
      { label: "Subscriptions", value: "3 active", change: "₹1,847/mo total" },
    ],
  },
  "Create budget": {
    text: "🎯 Based on your income of ₹55,000 and spending patterns, here's a personalized budget I'd recommend. I've optimized it using the 50/30/20 rule adapted to your lifestyle:",
    insights: [
      { label: "Needs (50%)", value: "₹27,500", change: "Rent, Bills, Groceries" },
      { label: "Wants (30%)", value: "₹16,500", change: "Dining, Shopping, Fun" },
      { label: "Savings (20%)", value: "₹11,000", change: "Goals + Emergency" },
      { label: "Projected Savings", value: "₹1,32,000/yr", change: "+23% vs current", positive: true },
    ],
  },
  "Find savings tips": {
    text: "💡 I found 5 ways you could save more this month. Some quick wins and some bigger moves — here are the top ones:",
    insights: [
      { label: "Cancel Unused Sub", value: "Save ₹499/mo", change: "Spotify Premium unused 3 weeks", positive: true },
      { label: "Meal Prep Sundays", value: "Save ₹2,400/mo", change: "Reduce dining by 50%", positive: true },
      { label: "Switch Insurance", value: "Save ₹3,600/yr", change: "Better plan available", positive: true },
      { label: "Total Potential", value: "₹6,499/mo", change: "₹77,988 per year!", positive: true },
    ],
  },
  "Show monthly report": {
    text: "📈 Here's your complete financial report for this month. Overall, you're trending in the right direction — income is up and expenses are down. Keep it going!",
    insights: [
      { label: "Net Income", value: "+₹27,060", change: "+23% vs Feb", positive: true },
      { label: "Top Category", value: "Food ₹8,240", change: "29.5% of spending", chartData: [{ name: "Food", value: 8240 }, { name: "Transport", value: 4500 }, { name: "Shopping", value: 6200 }, { name: "Bills", value: 5800 }, { name: "Fun", value: 3200 }] },
      { label: "Savings Rate", value: "49.2%", change: "Above target of 30%", positive: true },
      { label: "Goal Progress", value: "65%", change: "Emergency Fund on track", positive: true },
    ],
  },
  "Track goals": {
    text: "🎯 You have 3 active savings goals. Your Emergency Fund is looking great — you'll hit it by August! The vacation fund needs a small boost though:",
    insights: [
      { label: "Emergency Fund", value: "68%", change: "₹1,36,000 / ₹2,00,000", positive: true, chartData: [{ name: "Saved", value: 68 }, { name: "Left", value: 32 }] },
      { label: "Vacation Fund", value: "56%", change: "₹45,000 / ₹80,000" },
      { label: "New Laptop", value: "80%", change: "₹72,000 / ₹90,000", positive: true },
      { label: "Est. Completion", value: "Aug 2026", change: "All goals", positive: true },
    ],
  },
};

const quickActions = [
  "Analyze my spending",
  "Create budget",
  "Find savings tips",
  "Show monthly report",
  "Track goals",
];

const CHART_COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 81%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(152, 69%, 41%)",
];

// ─── Counter Animation Component ───
const AnimatedValue = ({ value }: { value: string }) => {
  const numMatch = value.match(/(₹?)([\d,]+\.?\d*)(.*)/);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    if (!numMatch) {
      setDisplayed(value);
      return;
    }
    const prefix = numMatch[1];
    const targetNum = parseFloat(numMatch[2].replace(/,/g, ""));
    const suffix = numMatch[3];
    let start = 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (targetNum - start) * eased);
      setDisplayed(`${prefix}${current.toLocaleString()}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayed}</span>;
};

// ─── Main Component ───
interface MissionDashboardProps {
  persona: Persona;
  onBack: () => void;
}

const MissionDashboard = ({ persona, onBack }: MissionDashboardProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "ai",
      text: `Welcome, ${persona.name}! 👋 I'm your FinTrack AI coach. I've tailored my advice to your "${persona.tagline}" style. Ready to start your financial journey? Choose an action below or type your question.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streak] = useState(7);
  const [score] = useState(740);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let nextId = useRef(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const sendMessage = (text: string) => {
    const userMsg: Message = { id: nextId.current++, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const response = aiResponses[text] || {
      text: `Great question! Based on your ${persona.name} profile, I'd analyze your recent activity to give you a personalized answer. Let me look into "${text}" for you — here's what I found:`,
      insights: [
        { label: "Quick Insight", value: "Analyzing...", change: "Based on your data", positive: true },
        { label: "Recommendation", value: "Personalized", change: `Tailored for ${persona.name}`, positive: true },
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
    }, 1200 + Math.random() * 800);
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
      transition={{ duration: 0.5 }}
      className="flex flex-col h-[calc(100vh-64px)] md:h-screen"
    >
      {/* ═══ Mission Header ═══ */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="shrink-0 bg-foreground text-background px-4 md:px-6 py-3"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-background/60 hover:text-background transition-colors text-sm">
              ← Back
            </button>
            <div className="hidden sm:block h-4 w-px bg-background/20" />
            <div className="hidden sm:block">
              <p className="text-[10px] tracking-[0.2em] uppercase text-background/50">Mission</p>
              <p className="text-sm font-display font-bold">Financial Freedom</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Progress */}
            <div className="hidden md:block">
              <p className="text-[10px] text-background/50 mb-1">Progress</p>
              <div className="w-24 h-1.5 bg-background/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full rounded-full"
                  style={{ background: persona.accentColor }}
                />
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              <p className="text-[10px] text-background/50">Score</p>
              <p className="text-sm font-display font-bold" style={{ color: persona.accentColor }}>{score}</p>
            </div>

            {/* Streak */}
            <div className="text-center">
              <p className="text-[10px] text-background/50">Streak</p>
              <p className="text-sm font-display font-bold">🔥 {streak}d</p>
            </div>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: `${persona.accentColor}30` }}
            >
              {persona.emoji}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Conversation Area ═══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
                layout
              >
                {msg.role === "ai" ? (
                  /* ── AI Message Card ── */
                  <div className="space-y-4">
                    <div className="glass-card p-5 md:p-6 shadow-lg shadow-foreground/[0.03]">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                          style={{ background: `${persona.accentColor}15`, color: persona.accentColor }}
                        >
                          AI
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">FinTrack AI · just now</p>
                        </div>
                      </div>
                      <p className="text-sm md:text-base leading-relaxed text-foreground/90 pl-11">
                        {msg.text}
                      </p>
                    </div>

                    {/* Insight Cards */}
                    {msg.insights && msg.insights.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 pl-4 md:pl-8">
                        {msg.insights.map((insight, idx) => (
                          <motion.div
                            key={insight.label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 * idx + 0.3, duration: 0.4 }}
                            className="glass-card p-4 relative overflow-hidden group"
                          >
                            {/* Subtle accent bar */}
                            <div
                              className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
                              style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 pl-2">
                              {insight.label}
                            </p>
                            <p className="font-display text-lg md:text-xl font-bold pl-2">
                              <AnimatedValue value={insight.value} />
                            </p>
                            {insight.change && (
                              <p className={`text-xs mt-1 pl-2 ${
                                insight.positive ? "text-success" : insight.positive === false ? "text-destructive" : "text-muted-foreground"
                              }`}>
                                {insight.change}
                              </p>
                            )}

                            {/* Mini Chart */}
                            {insight.chartData && (
                              <div className="mt-2 h-12">
                                <ResponsiveContainer width="100%" height="100%">
                                  {insight.chartData.length <= 2 ? (
                                    <PieChart>
                                      <Pie
                                        data={insight.chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={10}
                                        outerRadius={20}
                                        dataKey="value"
                                        strokeWidth={0}
                                      >
                                        {insight.chartData.map((_, ci) => (
                                          <Cell key={ci} fill={ci === 0 ? persona.accentColor : "hsl(0,0%,90%)"} />
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
                  /* ── User Message Card ── */
                  <div className="flex justify-end">
                    <div className="bg-foreground text-background px-5 py-3.5 rounded-2xl rounded-br-md max-w-[80%] shadow-md">
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-5 shadow-lg shadow-foreground/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: `${persona.accentColor}15`, color: persona.accentColor }}
                  >
                    AI
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        className="w-2 h-2 rounded-full bg-muted-foreground/40"
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
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-xl">
        {/* Quick Action Chips */}
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickActions.map((action) => (
              <motion.button
                key={action}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => sendMessage(action)}
                disabled={isTyping}
                className="shrink-0 px-4 py-2 rounded-full border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:shadow-sm transition-all duration-200 disabled:opacity-40"
              >
                {action}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
              placeholder="Ask your AI coach anything..."
              disabled={isTyping}
              className="flex-1 px-5 py-3.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all disabled:opacity-50"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="bg-foreground text-background px-5 py-3.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
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
