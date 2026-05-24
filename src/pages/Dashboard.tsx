import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Sparkles, Target, Wallet, TrendingUp, CreditCard, ChevronRight, LayoutDashboard, Search, Bell, MessageSquare, Crown, Lock, ArrowRight } from "lucide-react";
import { getCategoryIcon, NAV_ICONS } from "@/assets/icons";
import LumoMascot from "@/components/lumo/LumoMascot";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/payments/UpgradeModal";

// Mock Data
const areaData = [
  { month: "Jan", income: 45000, expense: 32000 },
  { month: "Feb", income: 48000, expense: 35000 },
  { month: "Mar", income: 45000, expense: 28000 },
  { month: "Apr", income: 52000, expense: 38000 },
  { month: "May", income: 50000, expense: 30000 },
  { month: "Jun", income: 55000, expense: 34000 },
  { month: "Jul", income: 58000, expense: 36000 },
];

const categoryData = [
  { name: "Food", value: 8240, color: "hsl(217, 91%, 60%)" },
  { name: "Transport", value: 4500, color: "hsl(262, 83%, 58%)" },
  { name: "Shopping", value: 6200, color: "hsl(330, 81%, 60%)" },
  { name: "Bills", value: 5800, color: "hsl(152, 69%, 41%)" },
];

const transactions = [
  { id: 1, name: "Uber Ride", category: "Transport", amount: -340, date: "Today, 2:30 PM" },
  { id: 2, name: "Salary Credit", category: "Salary", amount: 55000, date: "Yesterday" },
  { id: 3, name: "Swiggy Order", category: "Food", amount: -520, date: "Yesterday" },
  { id: 4, name: "Netflix Subscription", category: "Entertainment", amount: -649, date: "2 days ago" },
];

const goals = [
  { name: "Emergency Fund", target: 200000, saved: 136000, icon: "🏦", color: "from-blue-500 to-cyan-400" },
  { name: "Europe Trip", target: 150000, saved: 45000, icon: "✈️", color: "from-purple-500 to-pink-500" },
  { name: "MacBook Pro", target: 120000, saved: 90000, icon: "💻", color: "from-emerald-500 to-teal-400" },
];

const aiInsights = [
  { title: "Subscription Waste Detected", desc: "You haven't used Netflix in 3 weeks. Cancel to save ₹649/mo.", type: "warning" },
  { title: "Great Savings Streak", desc: "You saved 12% more than last week. Keep it up!", type: "success" },
  { title: "Upcoming Bill", desc: "Electricity bill of ₹2,100 is due in 3 days.", type: "info" },
];

const sidebarItems = [
  { img: NAV_ICONS.overview, label: "Overview", id: "overview" },
  { img: NAV_ICONS.transactions, label: "Transactions", id: "transactions" },
  { img: NAV_ICONS.goals, label: "Goals", id: "goals" },
  { img: NAV_ICONS.reports, label: "Reports", id: "reports" },
  { img: null, icon: MessageSquare, label: "AI Coach", id: "chat" },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<"pro" | "elite">("pro");
  const navigate = useNavigate();
  const { tier, isPro } = useSubscription();

  const openUpgrade = (t: "pro" | "elite" = "pro") => {
    setUpgradeTier(t);
    setUpgradeOpen(true);
  };

  const handleTabClick = (id: string) => {
    if (id === "chat") {
      navigate("/coach");
    } else {
      setActiveTab(id);
    }
  };

  const planLabel = tier === "elite" ? "Elite AI+" : tier === "pro" ? "Pro" : "Free";
  const planAccent =
    tier === "elite"
      ? "from-violet-500 to-fuchsia-500"
      : tier === "pro"
      ? "from-indigo-500 to-blue-500"
      : "from-slate-700 to-slate-900";

  return (
    <div className="min-h-screen bg-[#fafafa] flex overflow-hidden selection:bg-primary/10 relative">
      {/* Background Soft Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 mix-blend-multiply blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-100/50 mix-blend-multiply blur-[120px] pointer-events-none" />

      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-border/40 bg-white/60 backdrop-blur-xl z-20 transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between p-6">
          {!sidebarCollapsed && (
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">FinTrack</span>
            </Link>
          )}
          {sidebarCollapsed && (
             <Link to="/" className="mx-auto">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center shadow-md">
               <Sparkles className="w-4 h-4 text-white" />
             </div>
           </Link>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
                  sidebarCollapsed ? "justify-center p-2" : "px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-purple-100 via-blue-50 to-cyan-50 text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                {item.img ? (
                  <img src={item.img} alt="" className="w-9 h-9 object-contain shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-blue-700" />
                  </div>
                )}
                {!sidebarCollapsed && <span className="text-sm font-medium z-10">{item.label}</span>}
                {isActive && !sidebarCollapsed && <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-500" />}
              </button>
            );
          })}
        </nav>

        {/* Upgrade CTA */}
        {!isPro && !sidebarCollapsed && (
          <div className="px-4 pb-3">
            <motion.button
              onClick={() => openUpgrade("pro")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30 group"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)] pointer-events-none" />
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-y-0 -inset-x-1 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
              />
              <div className="relative flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Upgrade to Pro</span>
              </div>
              <p className="relative text-[11px] text-white/80 leading-snug">Unlock unlimited AI, forecasts & heatmaps.</p>
            </motion.button>
          </div>
        )}

        <div className="p-4 border-t border-border/40 mt-auto">
          <Link to="/billing" className="flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-100/80 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 flex items-center justify-center border border-white shadow-sm shrink-0">
              <span className="text-gray-700 text-sm font-bold">JD</span>
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
                <p className="text-xs text-gray-500 truncate">{planLabel} Member</p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 flex flex-col h-screen relative z-10">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 bg-white/40 backdrop-blur-md border-b border-white/20 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-gray-500 bg-white rounded-full shadow-sm">
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full border border-gray-100 shadow-sm">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search transactions..." className="bg-transparent text-sm outline-none w-48 placeholder:text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/billing"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md bg-gradient-to-r ${planAccent} relative overflow-hidden group`}
            >
              {tier === "elite" && <Crown className="w-3.5 h-3.5" />}
              {tier === "pro" && <Sparkles className="w-3.5 h-3.5" />}
              {tier === "free" && <Sparkles className="w-3.5 h-3.5" />}
              <span className="relative">{planLabel} Plan</span>
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-y-0 -inset-x-1 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
              />
            </Link>
            <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm relative text-gray-500 hover:text-gray-900 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="lg:hidden w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 flex items-center justify-center border border-white shadow-sm shrink-0">
              <span className="text-gray-700 text-sm font-bold">JD</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 safe-area-bottom">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div 
                key="overview" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.4 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                {/* Premium Upgrade Banner */}
                {!isPro && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-500/20"
                  >
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
                    {/* particles */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ y: 0, opacity: 0 }}
                        animate={{ y: [-10, -40, -10], opacity: [0, 0.6, 0] }}
                        transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.3 }}
                        style={{ left: `${10 + i * 11}%`, bottom: "20%" }}
                        className="absolute text-white/60 text-xs"
                      >
                        ✦
                      </motion.span>
                    ))}
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="flex items-start gap-4 max-w-xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur text-[10px] font-semibold uppercase tracking-wider mb-2 border border-white/20">
                            <Sparkles className="w-3 h-3" /> Limited offer
                          </div>
                          <h3 className="text-xl sm:text-2xl font-display font-bold leading-tight">
                            Unlock advanced AI forecasting, spending heatmaps & elite financial intelligence.
                          </h3>
                          <p className="text-sm text-white/80 mt-2">Pro plan from ₹299/mo. Cancel anytime.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          onClick={() => openUpgrade("pro")}
                          className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold shadow-lg hover:scale-[1.03] transition-transform inline-flex items-center gap-1.5"
                        >
                          Upgrade Now <ArrowRight className="w-4 h-4" />
                        </button>
                        <Link
                          to="/pricing"
                          className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/25 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                        >
                          Compare Plans
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Greeting & Weekly Score */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-gray-900 mb-2 tracking-tight">Good evening, John.</h1>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      You saved 12% more this week. You're on a 5-week streak!
                    </p>
                  </div>
                  <div className="glass-card bg-white/80 p-4 rounded-2xl flex items-center gap-4 shadow-sm border-white">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Financial Score</p>
                      <p className="text-2xl font-display font-bold text-gray-900">850 <span className="text-sm font-normal text-emerald-600">+12</span></p>
                    </div>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Balance", value: "₹1,24,500", change: "+12.5%", color: "blue", icon: Wallet },
                    { label: "Monthly Income", value: "₹55,000", change: "+8%", color: "emerald", icon: TrendingUp },
                    { label: "Monthly Expenses", value: "₹27,940", change: "-5.2%", color: "purple", icon: CreditCard },
                    { label: "Active Goals", value: "3 Goals", change: "On Track", color: "pink", icon: Target },
                  ].map((kpi, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={kpi.label} 
                      className="glass-card bg-white/60 p-6 rounded-[24px] border-white/50 hover:bg-white transition-colors cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <kpi.icon className={`w-5 h-5 text-${kpi.color}-500`} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-white rounded-full shadow-sm text-gray-600">{kpi.change}</span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium mb-1">{kpi.label}</p>
                      <p className="text-2xl font-display font-bold text-gray-900">{kpi.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Cashflow Chart */}
                  <div className="lg:col-span-2 glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Cashflow Overview</h3>
                        <p className="text-sm text-gray-500">Income vs Expenses over time</p>
                      </div>
                      <select className="bg-white border border-gray-100 text-sm rounded-xl px-3 py-1.5 outline-none shadow-sm cursor-pointer">
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                      </select>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                          />
                          <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                          <Area type="monotone" dataKey="expense" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Smart Summaries & Category */}
                  <div className="space-y-6 flex flex-col">
                    <div className="glass-card bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8 rounded-[32px] text-white flex-1 flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[40px] pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-5 h-5 text-blue-300" />
                          <span className="font-medium text-blue-100">AI Intelligence</span>
                        </div>
                        <h3 className="text-xl font-display font-bold leading-snug mb-4">
                          You have ₹8,500 sitting idle. Invest it in an index fund to reach your Europe Trip goal 2 months faster.
                        </h3>
                      </div>
                      <button className="bg-white text-gray-900 px-5 py-2.5 rounded-xl text-sm font-medium w-max hover:bg-gray-50 transition-colors">
                        Explore Strategy
                      </button>
                    </div>

                    <div className="glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                      <h3 className="font-bold text-gray-900 mb-6">Spending Heatmap</h3>
                      <div className="flex gap-6 items-center">
                        <div className="w-24 h-24 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" strokeWidth={0} paddingAngle={5}>
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-3">
                          {categoryData.slice(0,3).map(cat => (
                            <div key={cat.name} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-gray-600">{cat.name}</span>
                              </div>
                              <span className="font-medium text-gray-900">{Math.round((cat.value / 24740)*100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Goals & Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gamified Goals */}
                  <div className="glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Active Missions</h3>
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
                    </div>
                    <div className="space-y-4">
                      {goals.map((goal, i) => {
                        const progress = (goal.saved / goal.target) * 100;
                        return (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={goal.name} 
                            className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col gap-3 group hover:border-gray-200 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform`}>
                                  {goal.icon}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{goal.name}</h4>
                                  <p className="text-xs text-gray-500">₹{goal.saved.toLocaleString()} / ₹{goal.target.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${progress}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                className={`h-full bg-gradient-to-r ${goal.color}`}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        History <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {transactions.map((tx, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={tx.id} 
                          className="flex items-center justify-between p-3 hover:bg-white rounded-2xl transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                              <img src={getCategoryIcon(tx.category)} alt="" className="w-10 h-10 object-contain" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{tx.name}</p>
                              <p className="text-xs text-gray-500">{tx.category} • {tx.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                              {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "transactions" && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-6xl mx-auto space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-gray-900 tracking-tight">Transactions</h1>
                    <p className="text-gray-500 mt-1">AI-tagged activity across your accounts.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-2xl border border-white shadow-sm">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input className="bg-transparent text-sm outline-none w-48 placeholder:text-gray-400" placeholder="Search…" />
                    </div>
                    <button className="px-4 py-2.5 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800 shadow-sm">+ Add</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Income", value: "₹55,000", tone: "emerald" },
                    { label: "Expenses", value: "₹27,940", tone: "rose" },
                    { label: "Net Savings", value: "₹27,060", tone: "blue" },
                    { label: "AI Tagged", value: "98%", tone: "purple" },
                  ].map((s) => (
                    <div key={s.label} className="glass-card bg-white/70 p-5 rounded-3xl border-white/50">
                      <p className="text-xs uppercase tracking-widest font-bold text-gray-400">{s.label}</p>
                      <p className="text-2xl font-display font-bold text-gray-900 mt-2">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {["All", "Income", "Food", "Transport", "Shopping", "Bills", "Entertainment"].map((c, i) => (
                    <button key={c} className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${i === 0 ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-100 hover:border-gray-200"}`}>{c}</button>
                  ))}
                </div>

                <div className="glass-card bg-white/70 p-2 sm:p-4 rounded-[28px] border-white/50">
                  <div className="divide-y divide-gray-100">
                    {[...transactions, ...transactions].map((tx, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 hover:bg-white/80 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                            <img src={getCategoryIcon(tx.category)} alt="" className="w-10 h-10 object-contain" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tx.name}</p>
                            <p className="text-xs text-gray-500">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                            <Sparkles className="w-3 h-3" /> AI · 96%
                          </span>
                          <p className={`font-bold ${tx.amount > 0 ? "text-emerald-600" : "text-gray-900"}`}>
                            {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "goals" && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-6xl mx-auto space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-gray-900 tracking-tight">Your Goals</h1>
                    <p className="text-gray-500 mt-1">Dream big. Save smart. Track every milestone.</p>
                  </div>
                  <button className="px-4 py-2.5 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800 shadow-sm w-max">+ New Goal</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { name: "MacBook Fund", target: 150000, saved: 102000, icon: "💻", color: "from-blue-500 to-cyan-400" },
                    { name: "Dubai Trip", target: 90000, saved: 32000, icon: "🏝️", color: "from-amber-500 to-pink-500" },
                    { name: "Emergency Savings", target: 200000, saved: 178000, icon: "🛟", color: "from-emerald-500 to-teal-400" },
                    { name: "SIP Growth", target: 500000, saved: 215000, icon: "📈", color: "from-violet-500 to-purple-500" },
                    { name: "Bike Purchase", target: 180000, saved: 60000, icon: "🏍️", color: "from-rose-500 to-orange-400" },
                    { name: "Wedding Fund", target: 800000, saved: 240000, icon: "💍", color: "from-pink-500 to-fuchsia-500" },
                  ].map((g, i) => {
                    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
                    const r = 42;
                    const C = 2 * Math.PI * r;
                    return (
                      <motion.div
                        key={g.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass-card bg-white/80 p-6 rounded-[28px] border-white/50 relative overflow-hidden group"
                      >
                        <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${g.color} opacity-15 blur-2xl group-hover:opacity-30 transition-opacity`} />
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-24 shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                              <circle cx="50" cy="50" r={r} stroke="#f1f5f9" strokeWidth="8" fill="none" />
                              <motion.circle
                                cx="50" cy="50" r={r}
                                stroke="url(#grad)" strokeWidth="8" strokeLinecap="round" fill="none"
                                strokeDasharray={C}
                                initial={{ strokeDashoffset: C }}
                                whileInView={{ strokeDashoffset: C - (C * pct) / 100 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.4, ease: "easeOut" }}
                              />
                              <defs>
                                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" />
                                  <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">{g.icon}</div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-display font-bold text-gray-900">{g.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">₹{g.saved.toLocaleString()} of ₹{g.target.toLocaleString()}</p>
                            <p className="text-2xl font-display font-bold text-gray-900 mt-2">{pct}%</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-6xl mx-auto space-y-6"
              >
                <div>
                  <h1 className="font-display text-3xl font-bold text-gray-900 tracking-tight">Reports & Insights</h1>
                  <p className="text-gray-500 mt-1">AI-powered breakdown of your financial behavior.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Cashflow Trend</h3>
                    <p className="text-sm text-gray-500 mb-6">Last 7 months</p>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="rIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="rExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                          <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)" }} formatter={(v: number) => [`₹${v.toLocaleString()}`, ""]} />
                          <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#rIncome)" />
                          <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#rExpense)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Category Mix</h3>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0} paddingAngle={4}>
                            {categoryData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {categoryData.map((c) => (
                        <div key={c.name} className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                            <span className="text-gray-600">{c.name}</span>
                          </div>
                          <span className="font-medium text-gray-900">₹{c.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass-card bg-white/70 p-6 sm:p-8 rounded-[32px] border-white/50">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Weekly Spend</h3>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { d: "Mon", v: 1200 }, { d: "Tue", v: 800 }, { d: "Wed", v: 1600 },
                          { d: "Thu", v: 940 }, { d: "Fri", v: 2100 }, { d: "Sat", v: 2800 }, { d: "Sun", v: 1500 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)" }} />
                          <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { title: "Food spending up 18%", desc: "You spent 18% more on food this month than last.", tone: "rose" },
                      { title: "Saved ₹5,400 more", desc: "You're outperforming your previous month savings.", tone: "emerald" },
                      { title: "Improving consistently", desc: "5-week positive savings streak. Keep going!", tone: "blue" },
                    ].map((it, i) => (
                      <motion.div
                        key={it.title}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="glass-card bg-white/80 p-5 rounded-3xl border-white/50 flex gap-4"
                      >
                        <div className={`w-10 h-10 rounded-xl bg-${it.tone}-50 flex items-center justify-center`}>
                          <Sparkles className={`w-5 h-5 text-${it.tone}-500`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{it.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{it.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-border/40 z-40 safe-area-bottom px-6 py-2">
        <nav className="flex justify-between items-center max-w-sm mx-auto">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center gap-1 p-2 transition-all ${
                  isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className={`relative ${isActive ? "scale-110" : ""}`}>
                  {isActive && <div className="absolute inset-0 bg-gray-100 rounded-full scale-150 -z-10" />}
                  {item.img ? (
                    <img src={item.img} alt="" className="w-7 h-7 object-contain" />
                  ) : item.icon ? (
                    <item.icon className="w-5 h-5" />
                  ) : null}
                </div>
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Floating Lumo mini-assistant */}
      <Link
        to="/coach"
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-50 group"
        aria-label="Ask Lumo"
      >
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-sky-300/60 via-violet-300/60 to-emerald-200/60 blur-xl opacity-70 group-hover:opacity-100 transition" />
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/85 backdrop-blur-xl border border-white shadow-[0_18px_45px_-12px_rgba(99,102,241,0.5)] flex items-end justify-center overflow-hidden">
            <LumoMascot trigger="idle" size={64} autoSequence={false} />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
        </div>
      </Link>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} tier={upgradeTier} />
    </div>
  );
};

export default Dashboard;
