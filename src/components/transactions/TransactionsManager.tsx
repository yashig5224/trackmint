import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Sparkles, Filter, Download, Trash2, ArrowUpRight,
  ArrowDownRight, Wallet, Calendar, Receipt, ChevronDown, Check,
  CreditCard, FileText, ArrowUpDown
} from "lucide-react";
import { getCategoryIcon } from "@/assets/icons";

export interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string | null;
  payment_method?: string | null;
  note?: string | null;
  recurring?: boolean | null;
  transaction_date: string;
}

interface TransactionsManagerProps {
  transactions: TransactionItem[];
  onAdd: () => void;
  onImport: () => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const CATEGORIES = [
  "All",
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Salary",
  "Investment",
  "Other",
];

export default function TransactionsManager({
  transactions,
  onAdd,
  onImport,
  onDelete,
  currency = "INR",
}: TransactionsManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState<"all" | "expense" | "income">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Summary statistics
  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") income += amt;
      else expenses += amt;
    });
    const net = income - expenses;
    const avg = transactions.length > 0 ? (income + expenses) / transactions.length : 0;
    return { income, expenses, net, avg, count: transactions.length };
  }, [transactions]);

  // Filtering & Sorting
  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = (t.title || "").toLowerCase().includes(q);
          const matchCat = (t.category || "").toLowerCase().includes(q);
          const matchNote = (t.note || "").toLowerCase().includes(q);
          const matchAmt = String(t.amount).includes(q);
          if (!matchTitle && !matchCat && !matchNote && !matchAmt) return false;
        }

        // Type filter
        if (selectedType !== "all" && t.type !== selectedType) return false;

        // Category filter
        if (selectedCategory !== "All" && (t.category || "Other") !== selectedCategory) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        }
        if (sortBy === "date_asc") {
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        }
        if (sortBy === "amount_desc") {
          return Number(b.amount) - Number(a.amount);
        }
        if (sortBy === "amount_asc") {
          return Number(a.amount) - Number(b.amount);
        }
        return 0;
      });
  }, [transactions, search, selectedCategory, selectedType, sortBy]);

  // Group by Month/Year for chronological clarity
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionItem[]> = {};
    filtered.forEach((t) => {
      const d = new Date(t.transaction_date);
      const groupKey = isNaN(d.getTime())
        ? "Other"
        : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(t);
    });
    return Object.entries(groups);
  }, [filtered]);

  const fmt = (n: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n || 0);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Date", "Title", "Category", "Type", "Amount", "Note"];
    const rows = filtered.map((t) => [
      t.transaction_date,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      `"${t.category || "General"}"`,
      t.type,
      t.amount,
      `"${(t.note || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trackmint_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header & Primary Actions ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track, filter, and extract verified transactions from your bank statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={onImport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-semibold transition-all shadow-xs active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Import Statement</span>
          </button>

          <button
            onClick={onAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* ═══ Executive Financial KPI Metrics Bar ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Expenses */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {fmt(stats.expenses)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">All logged expenses</p>
        </div>

        {/* Total Income */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Inflow</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {fmt(stats.income)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">Salary & credits</p>
        </div>

        {/* Net Flow */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Net Cash Flow</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`font-display text-xl sm:text-2xl font-bold ${stats.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {stats.net >= 0 ? "+" : ""}{fmt(stats.net)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">
            {stats.net >= 0 ? "Positive cash reserve" : "Net negative spend"}
          </p>
        </div>

        {/* Total Activity */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Entries</span>
            <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {stats.count}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">
            Avg {fmt(stats.avg)} / txn
          </p>
        </div>
      </div>

      {/* ═══ Bank Statement AI Extraction Banner ═══ */}
      <div
        onClick={onImport}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 p-4 sm:p-5 hover:border-primary/40 transition-all shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Upload Bank / Credit Card Statement</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wide">
                  AI Auto-Scan
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drop your PDF, CSV, or Image statement. Lumo automatically parses dates, amounts, merchants, and categories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              Select Statement &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Search & Filter Controls ═══ */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, merchant, category, or ₹ amount…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border/80 bg-muted/40 self-start md:self-auto">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === "all"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType("expense")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === "expense"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setSelectedType("income")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === "income"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income
            </button>
          </div>

          {/* Sort & Export */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-border/80 bg-card text-foreground text-xs font-medium outline-none focus:border-primary/50 cursor-pointer shadow-xs"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>

            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="px-3 py-2 rounded-xl border border-border/80 bg-card hover:bg-accent text-foreground text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills (Horizontal scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Transaction List / Grouped View ═══ */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl border border-border/80 bg-card text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">No transactions found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {search || selectedCategory !== "All" || selectedType !== "all"
              ? "Try adjusting your filters or search keywords."
              : "Add your first transaction manually or import a bank statement."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onImport}
              className="px-4 py-2 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold transition-colors"
            >
              Import Bank Statement
            </button>
            <button
              onClick={onAdd}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors"
            >
              Add Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedTransactions.map(([groupName, groupItems]) => (
            <div key={groupName} className="space-y-2.5">
              {/* Month Group Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {groupItems.length} {groupItems.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* Transactions in Month */}
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                {groupItems.map((t) => {
                  const isIncome = t.type === "income";
                  const dateFormatted = new Date(t.transaction_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <motion.div
                      key={t.id}
                      layout
                      className="group flex items-center gap-3.5 p-3.5 sm:p-4 hover:bg-muted/40 transition-colors"
                    >
                      {/* Category Icon */}
                      <div className="w-11 h-11 rounded-xl bg-muted/70 border border-border/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={getCategoryIcon(t.category)}
                          alt={t.category || "General"}
                          className="w-8 h-8 object-contain"
                          loading="lazy"
                        />
                      </div>

                      {/* Title & Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm sm:text-base text-foreground truncate">
                            {t.title}
                          </p>
                          {t.recurring && (
                            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              Recurring
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/80">{t.category || "General"}</span>
                          <span>&bull;</span>
                          <span>{dateFormatted}</span>
                          {t.note && (
                            <>
                              <span className="hidden md:inline">&bull;</span>
                              <span className="hidden md:inline truncate max-w-[200px] text-muted-foreground/70">
                                {t.note}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount & Type */}
                      <div className="text-right shrink-0">
                        <p
                          className={`font-display text-sm sm:text-base font-bold ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {isIncome ? "+" : "-"}{fmt(Number(t.amount))}
                        </p>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground/70 block">
                          {t.type}
                        </span>
                      </div>

                      {/* Delete Action Button */}
                      <button
                        onClick={() => onDelete(t.id)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                        title="Delete transaction"
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
