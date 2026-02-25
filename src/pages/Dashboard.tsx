import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

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
  { name: "Food", value: 8240, color: "hsl(38, 92%, 50%)" },
  { name: "Transport", value: 4500, color: "hsl(262, 83%, 58%)" },
  { name: "Shopping", value: 6200, color: "hsl(330, 81%, 60%)" },
  { name: "Bills", value: 5800, color: "hsl(217, 91%, 60%)" },
  { name: "Entertainment", value: 3200, color: "hsl(152, 69%, 41%)" },
];

const weeklyData = [
  { day: "Mon", amount: 1200 },
  { day: "Tue", amount: 800 },
  { day: "Wed", amount: 2400 },
  { day: "Thu", amount: 1800 },
  { day: "Fri", amount: 3200 },
  { day: "Sat", amount: 2800 },
  { day: "Sun", amount: 1500 },
];

const transactions = [
  { id: 1, name: "Swiggy Order", category: "Food", amount: -520, date: "Today, 2:30 PM" },
  { id: 2, name: "Salary Credit", category: "Income", amount: 55000, date: "Yesterday" },
  { id: 3, name: "Uber Ride", category: "Transport", amount: -340, date: "Yesterday" },
  { id: 4, name: "Netflix Subscription", category: "Entertainment", amount: -649, date: "2 days ago" },
  { id: 5, name: "Grocery Store", category: "Food", amount: -1240, date: "3 days ago" },
  { id: 6, name: "Electricity Bill", category: "Bills", amount: -2100, date: "4 days ago" },
  { id: 7, name: "Freelance Payment", category: "Income", amount: 12000, date: "5 days ago" },
  { id: 8, name: "Gym Membership", category: "Health", amount: -1500, date: "1 week ago" },
];

const budgets = [
  { category: "Food", limit: 10000, spent: 8240, color: "hsl(38, 92%, 50%)" },
  { category: "Transport", limit: 5000, spent: 4500, color: "hsl(262, 83%, 58%)" },
  { category: "Shopping", limit: 8000, spent: 6200, color: "hsl(330, 81%, 60%)" },
  { category: "Entertainment", limit: 4000, spent: 3200, color: "hsl(152, 69%, 41%)" },
];

const goals = [
  { name: "Emergency Fund", target: 200000, saved: 136000 },
  { name: "Vacation", target: 80000, saved: 45000 },
  { name: "New Laptop", target: 90000, saved: 72000 },
];

const aiSuggestions = [
  "Your food spending is 12% higher than last month. Consider meal prepping on weekends.",
  "You're on track to reach your Emergency Fund goal by August 2026!",
  "Tip: Cancel your unused Spotify subscription to save ₹1,188/year.",
];

// Desktop sidebar items
const sidebarItems = [
  { icon: "◻", label: "Overview", id: "overview" },
  { icon: "↕", label: "Transactions", id: "transactions" },
  { icon: "◔", label: "Budgets", id: "budgets" },
  { icon: "◎", label: "Goals", id: "goals" },
  { icon: "◈", label: "Reports", id: "reports" },
  { icon: "◇", label: "AI Coach", id: "chat" },
];

// Mobile bottom tabs
const bottomTabs = [
  { icon: "◻", label: "Overview", id: "overview" },
  { icon: "↕", label: "Transactions", id: "transactions" },
  { icon: "◎", label: "Goals", id: "goals" },
  { icon: "◈", label: "Reports", id: "reports" },
  { icon: "◇", label: "AI Coach", id: "chat" },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleTabClick = (id: string) => {
    if (id === "chat") {
      navigate("/coach");
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,98%)] flex">
      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-border/60 bg-background/80 backdrop-blur-xl transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex items-center justify-between p-4">
          {!sidebarCollapsed && (
            <Link to="/" className="font-display text-lg font-bold tracking-tight">
              FinTrack<span className="text-muted-foreground font-normal">AI</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs"
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1 mt-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
              } ${
                activeTab === item.id
                  ? "bg-foreground text-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {!sidebarCollapsed && item.label}
            </button>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-foreground flex items-center justify-center">
                <span className="text-background text-xs font-medium">JD</span>
              </div>
              <div>
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">john@example.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        {/* Mobile/Tablet Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <Link to="/" className="font-display text-lg font-bold tracking-tight">
              FinTrack<span className="text-muted-foreground font-normal">AI</span>
            </Link>
            <div className="w-8 h-8 rounded-2xl bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-medium">JD</span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ═══ Overview Tab ═══ */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Good morning, John</h1>
                <p className="text-muted-foreground text-sm mb-6 sm:mb-8">Here's your financial overview</p>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {[
                    { label: "Total Balance", value: "₹1,24,500", change: "+12.5%", positive: true },
                    { label: "Monthly Income", value: "₹55,000", change: "+8%", positive: true },
                    { label: "Monthly Expenses", value: "₹27,940", change: "-5.2%", positive: true },
                    { label: "Monthly Savings", value: "₹27,060", change: "+23%", positive: true },
                  ].map((card) => (
                    <div key={card.label} className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm">
                      <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">{card.label}</p>
                      <p className="font-display text-lg sm:text-xl font-bold">{card.value}</p>
                      <p className="text-[11px] sm:text-xs text-[hsl(152,69%,41%)] mt-1">{card.change}</p>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <p className="text-sm font-medium mb-4">Income vs Expenses</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={areaData}>
                        <defs>
                          <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(152, 69%, 41%)" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="hsl(152, 69%, 41%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(0,0%,55%)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(0,0%,92%)", fontSize: "12px", boxShadow: "0 4px 12px hsl(0,0%,0%,0.06)" }} />
                        <Area type="monotone" dataKey="income" stroke="hsl(152, 69%, 41%)" fill="url(#ig)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)" fill="url(#eg)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <p className="text-sm font-medium mb-2">Spending by Category</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                          {categoryData.map((cat, i) => (
                            <Cell key={i} fill={cat.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {categoryData.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                            <span className="text-muted-foreground">{cat.name}</span>
                          </div>
                          <span className="font-medium">₹{cat.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weekly + AI insights */}
                <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <p className="text-sm font-medium mb-4">This Week's Spending</p>
                    <ResponsiveContainer width="100%" height={170}>
                      <BarChart data={weeklyData}>
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(0,0%,55%)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(0,0%,92%)", fontSize: "12px" }} />
                        <Bar dataKey="amount" fill="hsl(0,0%,15%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <p className="text-sm font-medium mb-4">✨ AI Insights</p>
                    <div className="space-y-3">
                      {aiSuggestions.map((tip, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-[hsl(0,0%,96%)] text-xs leading-relaxed text-muted-foreground">
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent transactions */}
                <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                  <p className="text-sm font-medium mb-4">Recent Transactions</p>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-sm font-medium">{tx.name}</p>
                          <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                        </div>
                        <p className={`text-sm font-medium ${tx.amount > 0 ? "text-[hsl(152,69%,41%)]" : ""}`}>
                          {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ Transactions Tab ═══ */}
            {activeTab === "transactions" && (
              <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <h1 className="font-display text-2xl font-bold mb-6">Transactions</h1>
                <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm divide-y divide-border/40 shadow-sm">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 sm:p-5">
                      <div>
                        <p className="text-sm font-medium">{tx.name}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                      </div>
                      <p className={`text-sm font-medium ${tx.amount > 0 ? "text-[hsl(152,69%,41%)]" : ""}`}>
                        {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ Budgets Tab ═══ */}
            {activeTab === "budgets" && (
              <motion.div key="budgets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <h1 className="font-display text-2xl font-bold mb-6">Budgets</h1>
                <div className="space-y-3 sm:space-y-4">
                  {budgets.map((b) => (
                    <div key={b.category} className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium">{b.category}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-2.5 bg-[hsl(0,0%,95%)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((b.spent / b.limit) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ background: b.color }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        ₹{(b.limit - b.spent).toLocaleString()} remaining
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ Goals Tab ═══ */}
            {activeTab === "goals" && (
              <motion.div key="goals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <h1 className="font-display text-2xl font-bold mb-6">Savings Goals</h1>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {goals.map((g) => {
                    const pct = Math.round((g.saved / g.target) * 100);
                    return (
                      <div key={g.name} className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                        <p className="text-sm font-medium mb-1">{g.name}</p>
                        <p className="font-display text-2xl font-bold">{pct}%</p>
                        <div className="h-2.5 bg-[hsl(0,0%,95%)] rounded-full overflow-hidden mt-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full rounded-full bg-foreground"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ₹{g.saved.toLocaleString()} / ₹{g.target.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══ Reports Tab ═══ */}
            {activeTab === "reports" && (
              <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <h1 className="font-display text-2xl font-bold mb-6">Reports</h1>
                <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <p className="text-sm font-medium mb-4">Monthly Trend</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={areaData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(0,0%,55%)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                        <Area type="monotone" dataKey="income" stroke="hsl(152,69%,41%)" fill="hsl(152,69%,41%)" fillOpacity={0.08} strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" stroke="hsl(0,72%,51%)" fill="hsl(0,72%,51%)" fillOpacity={0.08} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <p className="text-sm font-medium mb-4">Category Distribution</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {categoryData.map((cat, i) => (
                            <Cell key={i} fill={cat.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "chat" && null}
          </AnimatePresence>
        </div>
      </main>

      {/* ═══ Mobile Bottom Tab Bar ═══ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/40 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {bottomTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors min-w-[56px]"
              >
                <span className={`text-lg transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
