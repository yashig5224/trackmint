import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AIAssistant from "@/components/ai/AIAssistant";
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

const navItems = [
  { icon: "◻", label: "Overview", id: "overview" },
  { icon: "↕", label: "Transactions", id: "transactions" },
  { icon: "◔", label: "Budgets", id: "budgets" },
  { icon: "◎", label: "Goals", id: "goals" },
  { icon: "◈", label: "Reports", id: "reports" },
  { icon: "◇", label: "AI Coach", id: "chat" },
];

const aiSuggestions = [
  "Your food spending is 12% higher than last month. Consider meal prepping on weekends.",
  "You're on track to reach your Emergency Fund goal by August 2026!",
  "Tip: Cancel your unused Spotify subscription to save ₹1,188/year.",
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border p-4 shrink-0">
        <Link to="/" className="font-display text-lg font-bold tracking-tight mb-8 px-2">
          FinTrack<span className="text-muted-foreground font-normal">AI</span>
        </Link>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-medium">JD</span>
            </div>
            <div>
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-muted-foreground">john@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            FinTrack<span className="text-muted-foreground font-normal">AI</span>
          </Link>
          <div className="flex gap-2 overflow-x-auto">
            {navItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                  activeTab === item.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8 max-w-6xl">
          {/* Overview */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">Good morning, John</h1>
              <p className="text-muted-foreground text-sm mb-8">Here's your financial overview</p>

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Balance", value: "₹1,24,500", change: "+12.5%", positive: true },
                  { label: "Monthly Income", value: "₹55,000", change: "+8%", positive: true },
                  { label: "Monthly Expenses", value: "₹27,940", change: "-5.2%", positive: true },
                  { label: "Monthly Savings", value: "₹27,060", change: "+23%", positive: true },
                ].map((card) => (
                  <div key={card.label} className="p-5 rounded-xl border border-border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                    <p className="font-display text-xl font-bold">{card.value}</p>
                    <p className="text-xs text-success mt-1">{card.change}</p>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 rounded-xl border border-border p-5">
                  <p className="text-sm font-medium mb-4">Income vs Expenses</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(152, 69%, 41%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(152, 69%, 41%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,92%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(0,0%,91%)", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="income" stroke="hsl(152, 69%, 41%)" fill="url(#ig)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)" fill="url(#eg)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-border p-5">
                  <p className="text-sm font-medium mb-2">Spending by Category</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" strokeWidth={0}>
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

              {/* Weekly + AI insights row */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <div className="rounded-xl border border-border p-5">
                  <p className="text-sm font-medium mb-4">This Week's Spending</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyData}>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(0,0%,91%)", fontSize: "12px" }} />
                      <Bar dataKey="amount" fill="hsl(0,0%,9%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-border p-5">
                  <p className="text-sm font-medium mb-4">✨ AI Insights</p>
                  <div className="space-y-3">
                    {aiSuggestions.map((tip, i) => (
                      <div key={i} className="p-3 rounded-lg bg-secondary text-xs leading-relaxed text-muted-foreground">
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="rounded-xl border border-border p-5">
                <p className="text-sm font-medium mb-4">Recent Transactions</p>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{tx.name}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                      </div>
                      <p className={`text-sm font-medium ${tx.amount > 0 ? "text-success" : ""}`}>
                        {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Transactions tab */}
          {activeTab === "transactions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-2xl font-bold mb-6">Transactions</h1>
              <div className="rounded-xl border border-border divide-y divide-border">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium">{tx.name}</p>
                      <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                    </div>
                    <p className={`text-sm font-medium ${tx.amount > 0 ? "text-success" : ""}`}>
                      {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Budgets tab */}
          {activeTab === "budgets" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-2xl font-bold mb-6">Budgets</h1>
              <div className="space-y-4">
                {budgets.map((b) => (
                  <div key={b.category} className="rounded-xl border border-border p-5">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium">{b.category}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}
                      </p>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min((b.spent / b.limit) * 100, 100)}%`,
                          background: b.color,
                        }}
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

          {/* Goals tab */}
          {activeTab === "goals" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-2xl font-bold mb-6">Savings Goals</h1>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map((g) => {
                  const pct = Math.round((g.saved / g.target) * 100);
                  return (
                    <div key={g.name} className="rounded-xl border border-border p-5">
                      <p className="text-sm font-medium mb-1">{g.name}</p>
                      <p className="font-display text-2xl font-bold">{pct}%</p>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3">
                        <div className="h-full rounded-full bg-foreground transition-all duration-1000" style={{ width: `${pct}%` }} />
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

          {/* Reports tab */}
          {activeTab === "reports" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-2xl font-bold mb-6">Reports</h1>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border p-5">
                  <p className="text-sm font-medium mb-4">Monthly Trend</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={areaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,92%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="income" stroke="hsl(152,69%,41%)" fill="hsl(152,69%,41%)" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" stroke="hsl(0,72%,51%)" fill="hsl(0,72%,51%)" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-border p-5">
                  <p className="text-sm font-medium mb-4">Category Distribution</p>
                  <ResponsiveContainer width="100%" height={250}>
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

          {/* AI Coach tab */}
          {activeTab === "chat" && (
            <AIAssistant />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
