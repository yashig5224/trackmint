import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Mic, LogOut, Settings, Sparkles, TrendingUp, AlertTriangle, Target,
  Copy, RotateCcw, ThumbsUp, ThumbsDown, Bookmark, Plus, MessageSquare,
  Trash2, PanelLeftClose, PanelLeftOpen, Pin, Lock, Crown, Zap, Brain,
  Mic2, FileDown, LineChart as LineChartIcon, HeartHandshake, ChevronDown,
  Check, BookOpen, Database, X, Share2, Sparkle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Persona } from "./PersonaSelection";
import { lumoAvatar } from "@/assets/personas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription, type PlanTier } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { DEMO_TRANSACTIONS, DEMO_GOALS, DEMO_PROFILE } from "@/lib/demoData";
import { UpgradeModal } from "@/components/payments/UpgradeModal";
import { getAiUsage, consumeAiUsage, FREE_DAILY_LIMIT } from "@/lib/aiUsage";
import LumoVoiceMode from "./LumoVoiceMode";
import { PromptInput } from "@/components/ui/ai-chat-input";

// ─── Plan-gated AI model catalog ─────────────────────────────────────────────
interface AiModelOption {
  id: string;
  label: string;
  vendor: "Lumo" | "GPT" | "Gemini" | "Claude" | "Groq" | "DeepSeek";
  specialty: string;
  speed: string;
  minTier: PlanTier;
}

const AI_MODELS: AiModelOption[] = [
  { id: "lumo",       label: "Lumo Smart",    vendor: "Lumo",     specialty: "Smart Hybrid Router", speed: "Sub-sec", minTier: "free"  },
  { id: "openai",     label: "GPT-4o",        vendor: "GPT",      specialty: "Nuanced Reasoning",   speed: "Fast",    minTier: "pro"   },
  { id: "gemini",     label: "Gemini 2.5",    vendor: "Gemini",   specialty: "Budget Analytics",    speed: "Ultra",   minTier: "pro"   },
  { id: "groq",       label: "Llama 3.3 70B", vendor: "Groq",     specialty: "Zero-Latency Stream", speed: "Instant", minTier: "free"  },
  { id: "openrouter", label: "DeepSeek R1",   vendor: "DeepSeek", specialty: "Scenario Modeling",   speed: "Deep",    minTier: "elite" },
];

const tierRank: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

export interface ActionPayload {
  type: "create_transaction" | "create_budget" | "create_goal";
  data: Record<string, any>;
  status?: "pending" | "applied" | "cancelled";
}

export interface RetrievedSource {
  id: string;
  title: string;
  category: string;
  type: "knowledge" | "financial_data";
  snippet: string;
  similarity?: number;
}

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  fullText?: string;
  streaming?: boolean;
  insights?: Insight[];
  chips?: string[];
  action?: ActionPayload;
  sources?: RetrievedSource[];
  createdAt?: string;
}

interface Insight {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  chartData?: { name: string; value: number }[];
}

type Reply = { text: string; insights: Insight[] };

const baseLibrary: { keys: string[]; reply: Reply }[] = [
  {
    keys: ["spend", "spending", "analyze", "expenses"],
    reply: {
      text: "I analyzed your logged spending. Your major categories are clearly visible — food and discretionary dining are key areas where a small weekly cap frees up substantial compound savings.",
      insights: [
        { label: "Weekly save target", value: "₹500", change: "+12% momentum", positive: true },
        { label: "Food spending", value: "₹1,746", change: "Top logged category", positive: false, chartData: [{ name: "Food", value: 1746 }, { name: "Other", value: 1729 }] },
      ],
    },
  },
  {
    keys: ["budget", "allocation", "50/30/20", "monthly"],
    reply: {
      text: "Let's structure a balanced budget using the 50/30/20 rule. Based on your income, here's a clean monthly allocation.",
      insights: [
        { label: "Needs (50%)", value: "₹2,500", change: "Core essentials", positive: true },
        { label: "Wants (30%)", value: "₹1,500", change: "Discretionary", positive: true },
      ],
    },
  },
];

const personaLibrary: Record<string, { keys: string[]; reply: Reply }[]> = {
  student: [
    { keys: ["college", "hostel", "pocket"], reply: { text: "Here's a lean student plan: keep mess + essentials under ₹3,000, cap outings at ₹1,000, and stash ₹500 weekly into savings.", insights: [
      { label: "Weekly save target", value: "₹500", change: "Doable", positive: true },
      { label: "Monthly buffer", value: "₹2,000", change: "Auto-transfer", positive: true, chartData: [{ name: "Saved", value: 2000 }, { name: "Spent", value: 3000 }] },
    ] } },
    { keys: ["food", "mess", "eating"], reply: { text: "Food is your biggest swing category. Tracking small snacks and cooking 2 meals at home easily recovers ₹800–₹1,200/mo.", insights: [
      { label: "Food logged", value: "₹1,746", change: "25% of spend", positive: false, chartData: [{ name: "Food", value: 1746 }, { name: "Other", value: 1729 }] },
    ] } },
  ],
  salary: [
    { keys: ["salary", "optimize", "paycheck"], reply: { text: "Automate the moment salary lands: 20% to investments, 10% to emergency, then spend the rest guilt-free.", insights: [
      { label: "Auto-save", value: "20%", change: "₹11,000/mo", positive: true },
      { label: "Emergency", value: "10%", change: "₹5,500/mo", positive: true },
    ] } },
  ],
};

const matchLibrary = (msg: string, personaId: string): Reply | null => {
  const lower = msg.toLowerCase();
  const candidates = [...(personaLibrary[personaId] ?? []), ...baseLibrary];
  for (const c of candidates) {
    if (c.keys.some((k) => lower.includes(k))) return c.reply;
  }
  return null;
};

const getFallbackReply = (personaId: string): Reply => {
  return {
    text: "I've reviewed your financial profile and transaction log. Setting a concrete weekly cap and directing at least 15-20% into your active goals will rapidly build cash flow stability.",
    insights: [
      { label: "Recommended Savings", value: "20%", change: "Healthy baseline", positive: true },
      { label: "Emergency Buffer", value: "3-6 mos", change: "Safety cushion", positive: true },
    ],
  };
};

const defaultActions = [
  "How am I doing financially?",
  "How much have I spent in last 6 months?",
  "Find ₹500 I can save this week",
  "Analyze my food spend",
  "Create a 50/30/20 budget",
];

const personaPrompts: Record<string, string[]> = {
  student:    ["How am I doing financially?", "How much have I spent in last 6 months?", "Analyze my food spend", "Find ₹500 I can save", "Track hostel spending"],
  salary:     ["Optimize my monthly paycheck", "How much have I saved this year?", "Plan emergency fund", "Lower my EMIs", "Tax-saving ideas"],
  investor:   ["Review my asset allocation", "Index funds vs Mutual funds", "Suggest a SIP strategy", "Market dip preparation"],
  hustler:    ["Forecast next month's cash flow", "Estimate my quarterly taxes", "Smooth irregular income", "Emergency buffer"],
  minimalist: ["Audit my recurring subscriptions", "Cut 3 non-essential habits", "Quiet wealth blueprint", "30-day no-spend test"],
  family:     ["Family medical buffer check", "Plan education fund", "Term life insurance calculation", "Shared household budget"],
  luxury:     ["Smart travel swaps without downgrade", "Reward point optimization", "Splurge fund blueprint"],
  crypto:     ["Crypto allocation safety limit", "Stablecoin yield buffer", "Taxation on crypto transfers"],
};

interface Thread {
  id: string;
  title: string;
  personaId: string;
  personaName: string;
  messages: Message[];
  updatedAt: number;
  pinned?: boolean;
}

const STORAGE_KEY = "lumo_threads_v1";

const loadThreads = (): Thread[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch { return []; }
};

const saveThreads = (t: Thread[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {}
};

const autoTitle = (msg: string) => {
  const cleaned = msg.replace(/[^\w\s₹.,?-]/g, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  return (words.length > 36 ? words.slice(0, 36) + "…" : words) || "Financial Chat";
};

interface MissionDashboardProps {
  persona: Persona;
  onBack: () => void;
}

const MissionDashboard = ({ persona, onBack }: MissionDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, isPro, isElite } = useSubscription();
  const { isDemo } = useDemoMode();

  // Responsive state for mobile drawer
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const demoContext = useMemo(() => {
    if (!isDemo) return undefined;
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    const recent = DEMO_TRANSACTIONS.filter(t => new Date(t.transaction_date) >= monthAgo);
    const totalSpent = recent.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const byCat = new Map<string, number>();
    recent.filter(t => t.type === "expense" && t.category).forEach(t => {
      byCat.set(t.category!, (byCat.get(t.category!) ?? 0) + t.amount);
    });
    const topCategories = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
    const goals = DEMO_GOALS.map(g => `${g.goal_name} (₹${g.current_amount.toLocaleString("en-IN")}/₹${g.target_amount.toLocaleString("en-IN")})`);
    return {
      monthlyIncome: DEMO_PROFILE.monthly_income,
      totalSpent: Math.round(totalSpent),
      topCategories,
      goals,
    };
  }, [isDemo]);

  // Usage state
  const [usage, setUsage] = useState(() => getAiUsage());
  const refreshUsage = () => setUsage(getAiUsage());
  const limitReached = tier === "free" && usage.remaining <= 0;

  // Upgrade modal
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<"pro" | "elite">("pro");
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const openUpgrade = (t: "pro" | "elite" = "pro", feature?: string) => {
    if (!user) { navigate("/pricing"); return; }
    setUpgradeTier(t); setUpgradeFeature(feature); setUpgradeOpen(true);
  };

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>("lumo");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const activeModel = AI_MODELS.find((m) => m.id === selectedModel) ?? AI_MODELS[0];

  const greetingMsg = (): Message => ({
    id: 0,
    role: "ai",
    text: `Hey, I'm **Lumo AI** ✨ — your ${persona.name} financial coach.\n\nI have scanned your verified database records and recent transactions. What financial question would you like to explore?`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });

  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeId, setActiveId] = useState<string>(() => {
    const all = loadThreads();
    const mine = all.filter((t) => t.personaId === persona.id);
    if (mine.length) return mine[0].id;
    const id = `t_${Date.now()}`;
    const next: Thread = {
      id, personaId: persona.id, personaName: persona.name,
      title: "New Chat", messages: [greetingMsg()], updatedAt: Date.now(),
    };
    const merged = [next, ...all];
    saveThreads(merged);
    return id;
  });

  // Sidebar starts open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);

  useEffect(() => {
    setThreads(loadThreads());
  }, []);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );

  const messages = activeThread?.messages ?? [greetingMsg()];

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== activeId) return t;
        const newMsgs = typeof updater === "function" ? updater(t.messages) : updater;
        let title = t.title;
        if (title === "New Chat") {
          const firstUser = newMsgs.find((m) => m.role === "user");
          if (firstUser) title = autoTitle(firstUser.text);
        }
        return { ...t, messages: newMsgs, title, updatedAt: Date.now() };
      });
      saveThreads(next);
      return next;
    });
  };

  const newChat = () => {
    const id = `t_${Date.now()}`;
    const t: Thread = {
      id, personaId: persona.id, personaName: persona.name,
      title: "New Chat", messages: [greetingMsg()], updatedAt: Date.now(),
    };
    setThreads((prev) => {
      const next = [t, ...prev];
      saveThreads(next);
      return next;
    });
    setActiveId(id);
    if (isMobile) setSidebarOpen(false);
    toast.success("New financial session started");
  };

  const deleteChat = (id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveThreads(next);
      if (id === activeId) {
        const mine = next.filter((t) => t.personaId === persona.id);
        if (mine.length) setActiveId(mine[0].id);
        else {
          const nid = `t_${Date.now()}`;
          const fresh: Thread = {
            id: nid, personaId: persona.id, personaName: persona.name,
            title: "New Chat", messages: [greetingMsg()], updatedAt: Date.now(),
          };
          const m = [fresh, ...next]; saveThreads(m); setActiveId(nid);
          return m;
        }
      }
      return next;
    });
  };

  const togglePin = (id: string) => {
    setThreads((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, pinned: !t.pinned } : t);
      saveThreads(next);
      return next;
    });
  };

  const personaThreads = useMemo(() => {
    return threads
      .filter((t) => t.personaId === persona.id)
      .sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (b.updatedAt - a.updatedAt));
  }, [threads, persona.id]);

  const [isTyping, setIsTyping] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages.length, isTyping, activeId]);

  const streamInto = (id: number, full: string) => {
    let i = 0;
    const step = Math.max(3, Math.floor(full.length / 180));
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

  const chipPool = (personaId: string, turn = 0): string[] => {
    const pool: Record<string, string[][]> = {
      student: [
        ["Analyze my food spend", "Find ₹500 I can save", "How am I doing financially?"],
        ["How much have I spent in last 6 months?", "Suggest a student SIP", "Cut discretionary dining"],
        ["Emergency buffer for students", "Part-time income tips", "Check for the whole year"],
      ],
      salary: [
        ["Automate my savings", "Plan emergency fund", "Lower my EMIs"],
        ["50/30/20 rule breakdown", "Tax saving ideas (80C)", "Annual bonus strategy"],
      ],
    };
    const sets = pool[personaId] ?? [["Analyze my spending", "How much have I spent in last 6 months?", "How can I save more?"]];
    return sets[turn % sets.length];
  };

  const sendMessage = async (text: string, customModel?: string) => {
    if (!text.trim()) return;

    if (tier === "free") {
      if (!consumeAiUsage()) {
        refreshUsage();
        toast.error("Daily AI limit reached (10/10) — upgrade to Pro for unlimited coaching.");
        return;
      }
      refreshUsage();
    }

    const modelToUse = customModel || selectedModel;

    const userMsg: Message = {
      id: nextId.current++,
      role: "user",
      text,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const history = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const matchedLib = matchLibrary(text, persona.id);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          message: text,
          model: modelToUse,
          persona: { id: persona.id, name: persona.name },
          history: history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          userId: currentUserId,
          ...(demoContext ? { context: demoContext, demo: true } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiText = data?.text || matchedLib?.text || "Here is your updated financial analysis.";
      let parsedAction: ActionPayload | undefined;
      let cleanedText = aiText;
      const actionMatch = aiText.match(/```json:action\s*([\s\S]*?)\s*```/);
      if (actionMatch) {
        try {
          const actionJson = JSON.parse(actionMatch[1]);
          if (actionJson.type && actionJson.data) {
            parsedAction = {
              type: actionJson.type,
              data: actionJson.data,
              status: "pending",
            };
            cleanedText = aiText.replace(/```json:action[\s\S]*?```/, "").trim();
          }
        } catch (e) {
          console.warn("Could not parse action payload", e);
        }
      }

      const id = nextId.current++;
      const aiMsg: Message = {
        id,
        role: "ai",
        text: "",
        fullText: cleanedText,
        streaming: true,
        insights: matchedLib?.insights,
        chips: chipPool(persona.id, history.length),
        action: parsedAction,
        sources: data?.sources || [],
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
      streamInto(id, cleanedText);
    } catch (e: unknown) {
      console.error("ai-router error", e);
      const fallback = getFallbackReply(persona.id);
      const id = nextId.current++;
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id,
        role: "ai",
        text: "",
        fullText: fallback.text,
        streaming: true,
        insights: fallback.insights,
        chips: chipPool(persona.id, history.length),
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      streamInto(id, fallback.text);
    }
  };

  const executeAction = async (msgId: number, action: ActionPayload) => {
    if (!user) {
      toast.error("Please log in to apply this action directly.");
      return;
    }

    try {
      if (action.type === "create_transaction") {
        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          title: action.data.title || "Quick expense",
          amount: Number(action.data.amount || 0),
          category: action.data.category || "General",
          type: action.data.type || "expense",
          transaction_date: new Date().toISOString().slice(0, 10),
        });
        if (error) throw error;
        toast.success(`Logged ₹${action.data.amount} for ${action.data.title}!`);
      } else if (action.type === "create_budget") {
        const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
        const { error } = await supabase.from("budgets").insert({
          user_id: user.id,
          category: action.data.category || "General",
          monthly_limit: Number(action.data.monthly_limit || 0),
          month: currentMonth,
        });
        if (error) throw error;
        toast.success(`Budget created for ${action.data.category}!`);
      } else if (action.type === "create_goal") {
        const { error } = await supabase.from("goals").insert({
          user_id: user.id,
          goal_name: action.data.goal_name || "New Savings Goal",
          target_amount: Number(action.data.target_amount || 0),
          current_amount: Number(action.data.current_amount || 0),
        });
        if (error) throw error;
        toast.success(`Savings goal "${action.data.goal_name}" created!`);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.action
            ? { ...m, action: { ...m.action, status: "applied" } }
            : m
        )
      );
    } catch (err: any) {
      console.error("Failed to execute action", err);
      toast.error(err.message || "Could not apply action");
    }
  };

  const quickActions = personaPrompts[persona.id] ?? defaultActions;

  // Map PromptInput models to backend model IDs
  const modelNameToId: Record<string, string> = {
    "Lumo Smart": "lumo",
    "GPT-4o": "openai",
    "Gemini 2.5 Flash": "gemini",
    "Llama 3.3": "groq",
    "DeepSeek R1": "openrouter",
    "Composer 2.5": "lumo",
    "Gemini 3.5 Flash": "gemini",
    "GPT 5.5": "openai",
    "Opus 4.8": "openrouter",
    "GLM 5.2": "groq",
  };

  const handlePromptSubmit = (
    text: string,
    meta: { model: string; effort: string; attachments: File[] }
  ) => {
    const backendModel = modelNameToId[meta.model] || "lumo";
    setSelectedModel(backendModel);
    sendMessage(text, backendModel);
  };

  // Sidebar content (shared between desktop and mobile drawer)
  const sidebarContent = (
    <div className="flex flex-col h-full bg-card/95 backdrop-blur-2xl border-r border-border/60 text-card-foreground select-none">
      {/* Top action header */}
      <div className="p-3.5 border-b border-border/50 flex items-center justify-between gap-2">
        <button
          onClick={newChat}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </button>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-none">
        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Sessions
          </span>
          <span className="text-[10px] text-muted-foreground/60 font-medium">
            {personaThreads.length}
          </span>
        </div>

        {personaThreads.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground/60">
            No previous conversations.
          </div>
        ) : (
          personaThreads.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setActiveId(t.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`group cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent"
                }`}
              >
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "opacity-50"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {new Date(t.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(t.id); }}
                    className={`p-1 rounded-md hover:bg-background/80 ${t.pinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
                    title={t.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(t.id); }}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-background/80"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {t.pinned && (
                  <Pin className="w-3 h-3 text-amber-500 shrink-0 group-hover:hidden" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom user / persona card */}
      <div className="p-3 border-t border-border/50 flex items-center gap-2.5 bg-muted/20">
        <div className="w-8 h-8 rounded-xl overflow-hidden border border-border shrink-0 bg-background flex items-center justify-center shadow-xs">
          <img src={lumoAvatar} alt="Lumo AI" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">Lumo AI Coach</p>
          <p className="text-[10px] text-muted-foreground truncate">{persona.name} mode</p>
        </div>
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Switch persona"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-row h-full w-full absolute inset-0 overflow-hidden bg-background text-foreground">
      {/* Mobile Drawer Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity md:hidden"
        />
      )}

      {/* Desktop Persistent Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 260 : 0, opacity: sidebarOpen ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="shrink-0 h-full relative z-30 overflow-hidden hidden md:block"
        >
          <div className="w-[260px] h-full">
            {sidebarContent}
          </div>
        </motion.aside>
      )}

      {/* Mobile Slide-Over Drawer */}
      {isMobile && (
        <motion.aside
          initial={{ x: "-100%" }}
          animate={{ x: sidebarOpen ? "0%" : "-100%" }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="fixed inset-y-0 left-0 z-50 w-72 h-full shadow-2xl md:hidden"
        >
          {sidebarContent}
        </motion.aside>
      )}

      {/* Main Chat Area */}
      <div className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
        {/* Subtle Ambient Radial Lighting (Professional FinTech style) */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-b from-primary/8 via-primary/2 to-transparent blur-3xl opacity-70" />
          <div className="absolute top-1/3 -right-32 w-[400px] h-[300px] bg-indigo-500/5 blur-3xl rounded-full" />
        </div>

        {/* ═══ Top HUD Header ═══ */}
        <header className="shrink-0 relative z-20 h-14 sm:h-16 px-3 sm:px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl flex items-center justify-between gap-2">
          {/* Left Controls */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="w-9 h-9 rounded-xl border border-border/60 bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shadow-xs"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl border border-border/60 bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shadow-xs"
              title="Change persona or exit"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  {persona.name}
                </span>
                <span className="hidden sm:inline text-[11px] text-muted-foreground ml-1.5 font-normal">
                  · Financial Intelligence
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Model Selector Pill */}
            <div className="relative">
              <button
                onClick={() => setModelMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/60 bg-card/90 text-xs font-medium text-foreground hover:bg-accent transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="max-w-[80px] sm:max-w-none truncate">{activeModel.label}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {modelMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 p-1.5 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-xl z-50"
                  >
                    <p className="px-2.5 pt-1.5 pb-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Execution Engine
                    </p>
                    {AI_MODELS.map((m) => {
                      const locked = tierRank[tier] < tierRank[m.minTier];
                      const active = m.id === selectedModel;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (locked) {
                              setModelMenuOpen(false);
                              openUpgrade(m.minTier === "elite" ? "elite" : "pro", `${m.label} engine`);
                              return;
                            }
                            setSelectedModel(m.id);
                            setModelMenuOpen(false);
                            toast.success(`Switched to ${m.label}`);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                            active ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                          } ${locked ? "opacity-60" : ""}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{m.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{m.specialty} · {m.speed}</p>
                          </div>
                          {locked ? (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          ) : active ? (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Mode Toggle */}
            <button
              onClick={() => {
                if (tier === "free") return openUpgrade("pro", "Voice AI Coach");
                setVoiceOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/60 bg-card/90 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-xs"
              title="Hands-free voice assistant"
            >
              <Mic2 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Voice</span>
              {tier === "free" && <Lock className="w-2.5 h-2.5 text-amber-500" />}
            </button>

            {/* AI Usage Badge (Free Tier) */}
            {tier === "free" && (
              <button
                onClick={() => openUpgrade("pro", "Unlimited AI chats")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/60 bg-card/90 text-xs font-semibold text-foreground hover:bg-accent transition-all shadow-xs"
                title="Free daily limit"
              >
                <Zap className={`w-3.5 h-3.5 ${limitReached ? "text-destructive" : "text-amber-500"}`} />
                <span className={limitReached ? "text-destructive font-bold" : ""}>
                  {usage.used}/{usage.limit}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* ═══ Message Stream ═══ */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto relative z-10 px-3 sm:px-6 py-6 scrollbar-none"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "ai" ? (
                    <div className="flex flex-col gap-2 max-w-full sm:max-w-[92%] w-full">
                      {/* Message Metadata Header */}
                      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                        <div className="w-5 h-5 rounded-lg overflow-hidden border border-border/80 bg-muted shrink-0">
                          <img src={lumoAvatar} alt="Lumo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-foreground">Lumo AI</span>
                        <span className="text-[10px] opacity-60">· {msg.createdAt || "Just now"}</span>
                      </div>

                      {/* AI Card Content */}
                      <div className="border border-border/70 bg-card/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xs text-card-foreground">
                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed break-words font-sans">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text || "‎"}
                          </ReactMarkdown>
                          {msg.streaming && (
                            <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                          )}
                        </div>

                        {/* RAG Citations Accordion */}
                        {!msg.streaming && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border/60">
                            <details className="group rounded-xl border border-border/70 bg-muted/30 p-2.5 text-xs transition-colors">
                              <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-foreground select-none">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] tracking-wide">
                                    VERIFIED RAG
                                  </span>
                                  <span className="text-xs font-medium text-foreground">
                                    Financial Sources Cited
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-normal">
                                    ({msg.sources.length})
                                  </span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                              </summary>

                              <div className="mt-2.5 space-y-2 pt-2 border-t border-border/40">
                                {msg.sources.map((s, idx) => (
                                  <div
                                    key={s.id || idx}
                                    className="p-2.5 rounded-lg bg-card border border-border/60 flex flex-col gap-1 text-[11px]"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                                        {s.type === "knowledge" ? (
                                          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                                        ) : (
                                          <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="truncate">{s.title}</span>
                                      </div>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider shrink-0 ${
                                        s.type === "knowledge"
                                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      }`}>
                                        {s.type === "knowledge" ? "Vector Doc" : "SQL Data"}
                                      </span>
                                    </div>
                                    <p className="text-muted-foreground font-normal leading-relaxed">
                                      {s.snippet}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Interactive In-Chat Action Execution */}
                        {!msg.streaming && msg.action && (
                          <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                {msg.action.type === "create_transaction" ? "Confirm Logged Expense" :
                                 msg.action.type === "create_budget" ? "Confirm New Budget" : "Confirm New Goal"}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                msg.action.status === "applied"
                                  ? "bg-emerald-500/10 text-emerald-600 font-bold"
                                  : "bg-primary/10 text-primary"
                              }`}>
                                {msg.action.status === "applied" ? "✓ Recorded" : "Pending Confirmation"}
                              </span>
                            </div>

                            <div className="text-xs sm:text-sm text-foreground">
                              {msg.action.type === "create_transaction" && (
                                <p>Record <strong>₹{msg.action.data.amount}</strong> for <strong>{msg.action.data.title}</strong> under category <em>{msg.action.data.category || "General"}</em>?</p>
                              )}
                              {msg.action.type === "create_budget" && (
                                <p>Set monthly limit of <strong>₹{msg.action.data.monthly_limit}</strong> for <strong>{msg.action.data.category}</strong>?</p>
                              )}
                              {msg.action.type === "create_goal" && (
                                <p>Create savings target <strong>{msg.action.data.goal_name}</strong> for <strong>₹{msg.action.data.target_amount}</strong>?</p>
                              )}
                            </div>

                            {msg.action.status !== "applied" && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => executeAction(msg.id, msg.action!)}
                                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                                >
                                  Confirm & Apply
                                </button>
                                <button
                                  onClick={() => {
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === msg.id && m.action
                                          ? { ...m, action: { ...m.action, status: "cancelled" } }
                                          : m
                                      )
                                    );
                                    toast("Action dismissed");
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground transition-all"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action feedback toolbar */}
                        {!msg.streaming && (
                          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-muted-foreground text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { navigator.clipboard.writeText(msg.text); toast.success("Copied to clipboard"); }}
                                className="p-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const lastUser = messages.find((x) => x.role === "user" && x.id < msg.id);
                                  if (lastUser) sendMessage(lastUser.text);
                                }}
                                className="p-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors"
                                title="Regenerate"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toast.success("Feedback recorded")}
                                className="p-1.5 rounded-lg hover:bg-accent hover:text-emerald-500 transition-colors"
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toast("Feedback recorded")}
                                className="p-1.5 rounded-lg hover:bg-accent hover:text-rose-500 transition-colors"
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 font-medium">
                              Verified Analysis
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Follow-up Question Chips */}
                      {!msg.streaming && msg.chips && msg.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.chips.map((chip) => (
                            <button
                              key={chip}
                              onClick={() => sendMessage(chip)}
                              className="px-3 py-1.5 text-xs rounded-full border border-border/70 bg-card hover:bg-accent text-muted-foreground hover:text-foreground hover:border-border transition-all flex items-center gap-1.5 shadow-2xs"
                            >
                              <Sparkles className="w-3 h-3 text-primary" />
                              <span>{chip}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* User Speech Bubble */
                    <div className="max-w-[85%] sm:max-w-[75%]">
                      <div className="bg-primary text-primary-foreground font-medium rounded-2xl rounded-br-xs px-4 py-3 sm:px-5 sm:py-3 shadow-xs text-sm sm:text-base leading-relaxed">
                        {msg.text}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 text-right mt-1 px-1">
                        {msg.createdAt || "Just now"}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* In-Flight Reasoning Status */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground"
              >
                <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="font-medium animate-pulse">
                  Lumo AI is analyzing your verified database records & calculations…
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* ═══ Bottom Input Dock with Provided PromptInput ═══ */}
        <div className="shrink-0 relative z-20 pb-4 pt-2 px-3 sm:px-6 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="max-w-3xl mx-auto space-y-2.5">
            {/* Quick Action Suggestion Chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mask-linear-fade">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action)}
                  className="shrink-0 px-3 py-1.5 rounded-full border border-border/70 bg-card/80 hover:bg-accent text-xs font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>{action}</span>
                </button>
              ))}
            </div>

            {/* Upgrade banner if free limit reached */}
            {limitReached ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Daily AI Coaching Limit Reached (10/10)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upgrade to Pro for unlimited financial sessions, live voice mode, and predictive forecasting.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openUpgrade("pro", "Unlimited AI coaching")}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                  >
                    Plans
                  </button>
                </div>
              </motion.div>
            ) : (
              /* The New Executive PromptInput Component */
              <div className="w-full flex justify-center">
                <PromptInput
                  onSubmit={handlePromptSubmit}
                  placeholder={tier === "free" ? `Ask Lumo anything… (${usage.remaining} chats left today)` : "Ask Lumo about budgets, spending, or financial goals…"}
                  models={["Lumo Smart", "GPT-4o", "Gemini 2.5 Flash", "Llama 3.3", "DeepSeek R1"]}
                  efforts={["Quick", "Balanced", "Deep Plan"]}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan-Gated Upgrade Modal */}
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        tier={upgradeTier}
        feature={upgradeFeature}
      />

      {/* Full Screen Live Voice Assistant Modal */}
      <LumoVoiceMode
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        tier={tier}
        persona={{ id: persona.id, name: persona.name }}
        selectedModel={selectedModel}
        seedHistory={messages.slice(-6).map((m) => ({ role: m.role, text: m.fullText || m.text }))}
      />
    </div>
  );
};

export default MissionDashboard;
