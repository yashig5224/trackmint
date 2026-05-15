import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Receipt, Target, BarChart3, Settings, Plus, LogOut, Sparkles,
  TrendingUp, TrendingDown, Wallet, Trash2, X, Trophy, Brain
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Tab = "overview" | "transactions" | "goals" | "reports" | "settings";

interface Tx {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string | null;
  payment_method: string | null;
  note: string | null;
  recurring: boolean | null;
  transaction_date: string;
}

interface Goal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
}

const CATEGORIES = ["Food", "Shopping", "Travel", "Bills", "Entertainment", "Health", "Education", "Salary", "Investment", "Other"];
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Shopping: "#ec4899", Travel: "#3b82f6", Bills: "#8b5cf6",
  Entertainment: "#06b6d4", Health: "#10b981", Education: "#6366f1",
  Salary: "#22c55e", Investment: "#0ea5e9", Other: "#94a3b8",
};
const fmt = (n: number, c = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

const UserApp = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const currency = profile?.currency || "INR";

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(([tx, gl]) => {
      if (tx.data) setTransactions(tx.data as Tx[]);
      if (gl.data) setGoals(gl.data as Goal[]);
    });
  }, [user]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expenses;
    const monthlyIncome = Number(profile?.monthly_income || 0);
    const savings = monthlyIncome - expenses;
    const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((savings / monthlyIncome) * 100))) : 0;
    return { income, expenses, balance, savings, savingsRate };
  }, [transactions, profile]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      const c = t.category || "Other";
      map[c] = (map[c] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const trendData = useMemo(() => {
    // Last 7 days net
    const days: { name: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTx = transactions.filter(t => t.transaction_date === key);
      days.push({
        name: d.toLocaleDateString("en", { weekday: "short" }),
        income: dayTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        expense: dayTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return days;
  }, [transactions]);

  const insights = useMemo(() => {
    const out: string[] = [];
    const name = profile?.full_name?.split(" ")[0] || "there";
    if (stats.savingsRate >= 30) out.push(`${name}, you're saving ${stats.savingsRate}% of your income — outstanding!`);
    else if (stats.savingsRate > 0) out.push(`${name}, your savings rate is ${stats.savingsRate}%. Aim for 30%+ this month.`);
    const topCat = [...categoryData].sort((a, b) => b.value - a.value)[0];
    if (topCat) out.push(`Your largest expense category is ${topCat.name} at ${fmt(topCat.value, currency)}.`);
    const recurring = transactions.filter(t => t.recurring).length;
    if (recurring > 0) out.push(`You have ${recurring} recurring expenses being tracked.`);
    if (out.length === 0) out.push(`Welcome ${name}! Add your first transaction to unlock personalized insights.`);
    return out;
  }, [stats, categoryData, transactions, profile, currency]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning"; if (h < 18) return "Good afternoon"; return "Good evening";
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-100 bg-white/60 backdrop-blur-xl p-6 fixed inset-y-0 left-0">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
          <span className="font-display text-lg font-bold">FinTrack AI</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {([
            { id: "overview", label: "Overview", Icon: Home },
            { id: "transactions", label: "Transactions", Icon: Receipt },
            { id: "goals", label: "Goals", Icon: Target },
            { id: "reports", label: "Reports", Icon: BarChart3 },
            { id: "settings", label: "Settings", Icon: Settings },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${tab === id ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <Link to="/coach" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 mt-4 border border-dashed border-gray-200">
            <Brain className="w-4 h-4 text-blue-500" /> Lumo AI Coach
          </Link>
        </nav>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </aside>

      <main className="flex-1 lg:ml-64 pb-24 lg:pb-12">
        {/* Top header */}
        <header className="px-4 sm:px-8 pt-6 sm:pt-10 pb-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{greeting()},</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">{profile?.full_name || "Friend"} 👋</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-white border border-gray-100 text-xs font-semibold text-gray-700 shadow-sm">
                Lvl {profile?.level ?? 1} • {profile?.xp ?? 0} XP
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {tab === "overview" && (
                  <Overview stats={stats} insights={insights} trendData={trendData} categoryData={categoryData} currency={currency} persona={profile?.selected_persona} />
                )}
                {tab === "transactions" && (
                  <Transactions
                    transactions={transactions}
                    onAdd={() => setShowTxForm(true)}
                    onDelete={async (id) => {
                      await supabase.from("transactions").delete().eq("id", id);
                      setTransactions(prev => prev.filter(t => t.id !== id));
                      toast.success("Deleted");
                    }}
                    currency={currency}
                  />
                )}
                {tab === "goals" && (
                  <Goals
                    goals={goals}
                    onAdd={() => setShowGoalForm(true)}
                    onDelete={async (id) => {
                      await supabase.from("goals").delete().eq("id", id);
                      setGoals(prev => prev.filter(g => g.id !== id));
                    }}
                    onContribute={async (id, amount) => {
                      const g = goals.find(x => x.id === id); if (!g) return;
                      const newAmt = Math.min(Number(g.target_amount), Number(g.current_amount) + amount);
                      await supabase.from("goals").update({ current_amount: newAmt }).eq("id", id);
                      setGoals(prev => prev.map(x => x.id === id ? { ...x, current_amount: newAmt } : x));
                      toast.success("Contribution added");
                    }}
                    currency={currency}
                  />
                )}
                {tab === "reports" && (
                  <Reports transactions={transactions} categoryData={categoryData} trendData={trendData} stats={stats} currency={currency} />
                )}
                {tab === "settings" && (
                  <SettingsPanel profile={profile} onSaved={refreshProfile} onSignOut={handleSignOut} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-2 py-2 flex items-center justify-around">
        {([
          { id: "overview", Icon: Home },
          { id: "transactions", Icon: Receipt },
          { id: "goals", Icon: Target },
          { id: "reports", Icon: BarChart3 },
          { id: "settings", Icon: Settings },
        ] as const).map(({ id, Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl ${tab === id ? "text-gray-900" : "text-gray-400"}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] capitalize font-semibold">{id}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {showTxForm && (
          <TxForm onClose={() => setShowTxForm(false)} onSave={async (data) => {
            if (!user) return;
            const { data: inserted, error } = await supabase.from("transactions").insert({ ...data, user_id: user.id }).select().single();
            if (error) { toast.error(error.message); return; }
            setTransactions(prev => [inserted as Tx, ...prev]);
            setShowTxForm(false);
            toast.success("Transaction added");
          }} />
        )}
        {showGoalForm && (
          <GoalForm onClose={() => setShowGoalForm(false)} onSave={async (data) => {
            if (!user) return;
            const { data: inserted, error } = await supabase.from("goals").insert({ ...data, user_id: user.id }).select().single();
            if (error) { toast.error(error.message); return; }
            setGoals(prev => [inserted as Goal, ...prev]);
            setShowGoalForm(false);
            toast.success("Goal created");
          }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== Sections =====

const StatCard = ({ label, value, change, positive, Icon }: { label: string; value: string; change?: string; positive?: boolean; Icon: any }) => (
  <motion.div whileHover={{ y: -2 }} className="glass-card bg-white border border-gray-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">{label}</p>
        <p className="font-display text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Icon className="w-5 h-5 text-gray-700" /></div>
    </div>
    {change && (
      <p className={`text-xs mt-3 font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>{change}</p>
    )}
  </motion.div>
);

const Overview = ({ stats, insights, trendData, categoryData, currency, persona }: any) => (
  <div className="space-y-6">
    {persona && (
      <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 text-sm flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <span><strong className="capitalize">{persona}</strong> mode active — Lumo AI is tuned to your style.</span>
      </div>
    )}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Balance" value={fmt(stats.balance, currency)} Icon={Wallet} change={stats.balance >= 0 ? "Healthy" : "Spending high"} positive={stats.balance >= 0} />
      <StatCard label="Income" value={fmt(stats.income, currency)} Icon={TrendingUp} />
      <StatCard label="Expenses" value={fmt(stats.expenses, currency)} Icon={TrendingDown} />
      <StatCard label="Savings Rate" value={`${stats.savingsRate}%`} Icon={Trophy} positive={stats.savingsRate >= 30} change={stats.savingsRate >= 30 ? "Above target" : "Push for 30%"} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-6 lg:col-span-2 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-gray-900">7-Day Cashflow</h3>
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9" }} />
              <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Spending Mix</h3>
        {categoryData.length === 0 ? (
          <p className="text-sm text-gray-400">Add expenses to see your breakdown.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {categoryData.map((c: any, i: number) => <Cell key={i} fill={CATEGORY_COLORS[c.name] || "#94a3b8"} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>

    <div className="glass-card bg-gradient-to-br from-blue-50/60 to-white border border-blue-100 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="font-display text-lg font-bold text-gray-900">AI Insights</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((i: string, idx: number) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />{i}
          </li>
        ))}
      </ul>
      <Link to="/coach" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700">
        Talk to Lumo AI <Sparkles className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
);

const Transactions = ({ transactions, onAdd, onDelete, currency }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="font-display text-xl font-bold text-gray-900">All Transactions</h2>
      <button onClick={onAdd} className="bg-gray-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 shadow-md">
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
    {transactions.length === 0 ? (
      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-12 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No transactions yet. Add your first to get started.</p>
      </div>
    ) : (
      <div className="space-y-2">
        {transactions.map((t: Tx) => (
          <motion.div key={t.id} layout className="glass-card bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: (CATEGORY_COLORS[t.category || "Other"] || "#94a3b8") + "22", color: CATEGORY_COLORS[t.category || "Other"] || "#94a3b8" }}>
              {(t.category || "O").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{t.title}</p>
              <p className="text-xs text-gray-400">{t.category || "Uncategorized"} • {new Date(t.transaction_date).toLocaleDateString()}</p>
            </div>
            <p className={`font-display font-bold ${t.type === "income" ? "text-emerald-600" : "text-gray-900"}`}>
              {t.type === "income" ? "+" : "-"}{fmt(Number(t.amount), currency)}
            </p>
            <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);

const Goals = ({ goals, onAdd, onDelete, onContribute, currency }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="font-display text-xl font-bold text-gray-900">Your Goals</h2>
      <button onClick={onAdd} className="bg-gray-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 shadow-md">
        <Plus className="w-4 h-4" /> New Goal
      </button>
    </div>
    {goals.length === 0 ? (
      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-12 text-center">
        <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No goals yet. Set your first savings goal.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((g: Goal) => {
          const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
          return (
            <motion.div key={g.id} layout whileHover={{ y: -2 }} className="glass-card bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-400">{g.category || "Goal"}</p>
                  <h3 className="font-display text-lg font-bold text-gray-900 mt-1">{g.goal_name}</h3>
                </div>
                <button onClick={() => onDelete(g.id)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-display text-2xl font-bold text-gray-900">{fmt(Number(g.current_amount), currency)}</p>
                <p className="text-sm text-gray-400">of {fmt(Number(g.target_amount), currency)}</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-blue-500 to-purple-500" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{pct}% complete</p>
                <button onClick={() => {
                  const v = prompt("Add contribution amount:");
                  const n = Number(v); if (n > 0) onContribute(g.id, n);
                }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Contribute</button>
              </div>
            </motion.div>
          );
        })}
      </div>
    )}
  </div>
);

const Reports = ({ transactions, categoryData, trendData, stats, currency }: any) => (
  <div className="space-y-6">
    <h2 className="font-display text-xl font-bold text-gray-900">Reports & Analytics</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Daily Income vs Expense</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={trendData}>
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9" }} />
              <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Category Breakdown</h3>
        {categoryData.length === 0 ? <p className="text-sm text-gray-400">Not enough data yet.</p> : (
          <div className="space-y-3">
            {categoryData.sort((a: any, b: any) => b.value - a.value).map((c: any) => {
              const total = categoryData.reduce((s: number, x: any) => s + x.value, 0);
              const pct = Math.round((c.value / total) * 100);
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{c.name}</span>
                    <span className="text-gray-500">{fmt(c.value, currency)} • {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[c.name] || "#94a3b8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    <div className="glass-card bg-gradient-to-br from-purple-50/60 to-white border border-purple-100 rounded-3xl p-6">
      <h3 className="font-display text-lg font-bold text-gray-900 mb-3">Highlights</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        <li>• Total transactions tracked: <strong>{transactions.length}</strong></li>
        <li>• Net cashflow: <strong>{fmt(stats.balance, currency)}</strong></li>
        <li>• Top category: <strong>{categoryData[0]?.name || "—"}</strong></li>
      </ul>
    </div>
  </div>
);

const SettingsPanel = ({ profile, onSaved, onSignOut }: any) => {
  const [name, setName] = useState(profile?.full_name || "");
  const [income, setIncome] = useState(profile?.monthly_income || 0);
  const [currency, setCurrency] = useState(profile?.currency || "INR");
  const [persona, setPersona] = useState(profile?.selected_persona || "salary");
  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: name, monthly_income: Number(income), currency, selected_persona: persona,
    }).eq("id", profile.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); onSaved(); }
  };
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-gray-900">Settings</h2>
      <div className="glass-card bg-white border border-gray-100 rounded-3xl p-6 space-y-4 max-w-xl">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Monthly Income</label>
            <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900 bg-white">
              {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">AI Persona</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900 bg-white">
            {["student", "salary", "investor", "hustler", "minimalist", "family", "luxury", "crypto"].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={save} className="bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800">Save Changes</button>
          <button onClick={onSignOut} className="border border-gray-200 px-5 py-3 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50">Sign Out</button>
        </div>
      </div>
    </div>
  );
};

// ===== Modals =====
const TxForm = ({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) => {
  const [form, setForm] = useState({ title: "", amount: "", type: "expense", category: "Food", payment_method: "Card", recurring: false, transaction_date: new Date().toISOString().slice(0, 10), note: "" });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold">New Transaction</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, amount: Number(form.amount) }); }} className="space-y-3">
          <input required placeholder="Title (e.g. Starbucks)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900" />
          <input required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200 bg-white">
              <option value="expense">Expense</option><option value="income">Income</option>
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200 bg-white">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
          <input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Recurring
          </label>
          <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold mt-2">Add Transaction</button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const GoalForm = ({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) => {
  const [form, setForm] = useState({ goal_name: "", target_amount: "", current_amount: "0", deadline: "", category: "Savings" });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold">New Goal</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, target_amount: Number(form.target_amount), current_amount: Number(form.current_amount), deadline: form.deadline || null }); }} className="space-y-3">
          <input required placeholder="Goal name (e.g. Dubai Trip)" value={form.goal_name} onChange={(e) => setForm({ ...form, goal_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900" />
          <input required type="number" placeholder="Target amount" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
          <input type="number" placeholder="Already saved" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
          <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
          <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold mt-2">Create Goal</button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default UserApp;
