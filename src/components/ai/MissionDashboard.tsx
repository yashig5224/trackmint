import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Mic, Send, LogOut, Settings, Sparkles, TrendingUp, AlertTriangle, Target } from "lucide-react";
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
  "Analyze my spending": {
    text: "I've analyzed your recent transactions. You're doing great overall, but dining out is slightly above your usual trend.",
    insights: [
      { label: "Saved this week", value: "₹2,400", change: "+12% vs last week", positive: true },
      { label: "Food spending", value: "₹4,800", change: "22% above budget", positive: false, chartData: [{ name: "Budget", value: 4000 }, { name: "Spent", value: 4800 }] },
    ],
  },
  "Create a budget": {
    text: "Let's build a smart budget. Based on your income, here's an optimized 50/30/20 allocation for this month.",
    insights: [
      { label: "Needs", value: "50%", change: "₹27,500" },
      { label: "Wants", value: "30%", change: "₹16,500" },
      { label: "Savings", value: "20%", change: "₹11,000", positive: true, chartData: [{ name: "Needs", value: 50 }, { name: "Wants", value: 30 }, { name: "Savings", value: 20 }] },
    ],
  },
  "Detect waste": {
    text: "I found a few subscriptions you haven't used recently. Cutting these will save you a good amount annually.",
    insights: [
      { label: "Active Subs", value: "8", change: "₹2,840/mo" },
      { label: "Unused Subs", value: "3", change: "Save ₹1,150/mo", positive: true, chartData: [{ name: "Active", value: 5 }, { name: "Unused", value: 3 }] },
    ],
  },
  "Goal planning": {
    text: "Your goals are looking solid. You're on track to hit your Emergency Fund target early!",
    insights: [
      { label: "Goal progress", value: "68%", change: "Emergency Fund", positive: true, chartData: [{ name: "Done", value: 68 }, { name: "Left", value: 32 }] },
      { label: "Est. Completion", value: "Aug 2026", change: "2 months early!", positive: true },
    ],
  },
};

const quickActions = [
  "Analyze my spending",
  "Create a budget",
  "Detect waste",
  "Save more money",
  "Goal planning"
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
      text: `Welcome to your Financial Mission! 👋 I'm your personalized ${persona.name} Coach. I've been analyzing your recent transactions. What's our focus for today?`,
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
      text: `I'm analyzing your request for "${text}" based on your ${persona.name} profile...`,
      insights: [
        { label: "Processing", value: "Insights", change: "Gathering data", positive: true },
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
    }, 1500); // 1.5s typing delay
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
      className="flex flex-col h-[100dvh] w-screen relative overflow-hidden bg-[#fafafa]"
    >
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-purple-50/40 blur-[120px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-50/40 blur-[100px] pointer-events-none mix-blend-multiply" />

      {/* Floating particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`bg-particle-${i}`}
          animate={{ 
            y: ["100vh", "-10vh"],
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
      <div className="flex-1 overflow-y-auto relative z-10 scrollbar-none pb-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-10">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
                layout
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "ai" ? (
                  <div className="flex gap-4 sm:gap-6 max-w-[95%] sm:max-w-[85%]">
                    {/* AI Avatar */}
                    <div className="shrink-0 pt-2">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl sm:text-3xl z-10 relative">
                        {persona.emoji}
                      </div>
                    </div>
                    
                    {/* AI Message Container */}
                    <div className="space-y-4 w-full">
                      <div className="glass-card p-6 sm:p-8 rounded-[32px] rounded-tl-xl bg-white/80 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-[20px] pointer-events-none" />
                        <p className="text-lg sm:text-xl leading-relaxed text-gray-800 font-medium relative z-10">
                          {msg.text}
                        </p>
                      </div>

                      {/* Dynamic AI Insights */}
                      {msg.insights && msg.insights.length > 0 && (
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
                    <div className="p-6 sm:p-8 rounded-[32px] rounded-tr-xl bg-gray-900 text-white shadow-xl shadow-gray-900/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[30px]" />
                      <p className="text-lg sm:text-xl leading-relaxed relative z-10">
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
                <div className="shrink-0 pt-2 opacity-50">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl sm:text-3xl grayscale">
                    {persona.emoji}
                  </div>
                </div>
                <div className="p-6 rounded-[24px] rounded-tl-xl bg-white/60 border border-white backdrop-blur-xl flex items-center gap-2 h-[72px]">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -8, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-2.5 h-2.5 bg-gray-400 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ═══ Smart Input Dock ═══ */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
        className="absolute bottom-0 left-0 w-full z-30 pb-6 pt-10 px-4 sm:px-8 bg-gradient-to-t from-[#fafafa] via-[#fafafa]/80 to-transparent"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Quick Actions (Scrollable) */}
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 mask-linear-fade">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => { setInput(action); setTimeout(() => handleSend(), 100); }}
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
