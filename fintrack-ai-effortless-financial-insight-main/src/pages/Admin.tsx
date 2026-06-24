// Founder Admin Panel — hidden /admin route.
// Only users with role='admin' can access. All data is pulled live from Supabase.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, AreaChart, Area,
} from "recharts";
import { Shield, Users, IndianRupee, Activity, Bot, Megaphone, Heart, AlertTriangle, ArrowUpRight, ArrowDownRight, Trash2, UserCog, Pause, Play } from "lucide-react";

// ── Plan resolution ────────────────────────────────────────────────────────
const PLAN_PRICE: Record<string, number> = { free: 0, basic: 0, pro: 499, elite: 1499 };
const planOf = (p: any): string => (p?.current_plan ?? "free").toLowerCase();

// ── Cost model for AI providers (₹ per 1k tokens, rough internal estimate) ─
const PROVIDER_COST: Record<string, number> = {
  lumo: 0.05, gemini: 0.18, gpt: 1.6, claude: 2.4, voice: 0.4,
};

// ── Types ──────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  current_plan: string | null;
  suspended: boolean | null;
  created_at: string;
  updated_at: string;
}

interface AiLog {
  id: string;
  user_id: string | null;
  provider: string | null;
  total_tokens: number | null;
  created_at: string;
  status: string | null;
}

interface Sub {
  user_id: string;
  plan_name: string | null;
  amount: number | null;
  billing_cycle: string | null;
  status: string;
  created_at: string;
}

interface Feedback {
  id: string;
  kind: string;
  subject: string;
  message: string;
  email: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: string;
  audience: string;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
}

// ── Reusable bits ──────────────────────────────────────────────────────────
const Stat = ({ label, value, hint, trend }: { label: string; value: string; hint?: string; trend?: number }) => (
  <Card className="p-5 bg-white border border-slate-200/70">
    <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    {trend !== undefined && (
      <div className={`mt-2 inline-flex items-center gap-1 text-xs ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(trend).toFixed(1)}% vs prior period
      </div>
    )}
  </Card>
);

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const dayKey = (d: string) => d.slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [automationLogs, setAutomationLogs] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [health, setHealth] = useState<{ db: boolean; ai: boolean; razorpay: boolean }>({ db: false, ai: false, razorpay: false });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setBusy(true);
    try {
      const [p, a, s, ar, al, fb, an] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,current_plan,suspended,created_at,updated_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("ai_usage_logs").select("id,user_id,provider,total_tokens,created_at,status").order("created_at", { ascending: false }).limit(2000),
        supabase.from("subscriptions").select("user_id,plan_name,amount,billing_cycle,status,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("automation_rules").select("id,enabled,trigger_count,name,tier").limit(1000),
        supabase.from("automation_logs").select("id,result,created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      setProfiles((p.data as Profile[]) ?? []);
      setAiLogs((a.data as AiLog[]) ?? []);
      setSubs((s.data as Sub[]) ?? []);
      setAutomationRules(ar.data ?? []);
      setAutomationLogs(al.data ?? []);
      setFeedback((fb.data as Feedback[]) ?? []);
      setAnnouncements((an.data as Announcement[]) ?? []);
    } finally {
      setBusy(false);
    }
  };

  const pingHealth = async () => {
    const dbOk = !(await supabase.from("profiles").select("id", { count: "exact", head: true })).error;
    let aiOk = false;
    try {
      const { error } = await supabase.functions.invoke("ai-router", { body: { ping: true } });
      aiOk = !error;
    } catch { aiOk = false; }
    // Razorpay status — we expose nothing public; assume configured if we have an active sub
    const razorpay = subs.some(s => s.status === "active");
    setHealth({ db: dbOk, ai: aiOk, razorpay });
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);
  useEffect(() => { if (isAdmin) pingHealth(); /* eslint-disable-next-line */ }, [isAdmin, subs.length]);

  // Derived metrics ─────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = Date.now();
    const days30 = 30 * 86400_000;
    const days7 = 7 * 86400_000;
    const totalUsers = profiles.length;
    const activeUsers = profiles.filter(p => now - new Date(p.updated_at).getTime() < days7).length;
    const payingUsers = profiles.filter(p => ["pro", "elite"].includes(planOf(p))).length;

    const activeSubs = subs.filter(s => s.status === "active");
    const monthlyAmt = activeSubs.reduce((sum, s) => {
      const a = Number(s.amount ?? PLAN_PRICE[(s.plan_name ?? "").toLowerCase()] ?? 0);
      return sum + (s.billing_cycle === "yearly" ? a / 12 : a);
    }, 0);

    const aiTokens = aiLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0);
    const aiCost = aiLogs.reduce((sum, l) => {
      const p = (l.provider ?? "lumo").toLowerCase();
      return sum + ((l.total_tokens ?? 0) / 1000) * (PROVIDER_COST[p] ?? 0.1);
    }, 0);

    const newLast30 = profiles.filter(p => now - new Date(p.created_at).getTime() < days30).length;
    const newPrev30 = profiles.filter(p => {
      const t = new Date(p.created_at).getTime();
      return now - t >= days30 && now - t < 2 * days30;
    }).length;
    const growth = newPrev30 ? ((newLast30 - newPrev30) / newPrev30) * 100 : (newLast30 > 0 ? 100 : 0);

    const conversion = totalUsers ? (payingUsers / totalUsers) * 100 : 0;
    const cancelled = subs.filter(s => s.status === "canceled").length;
    const churn = subs.length ? (cancelled / subs.length) * 100 : 0;

    return {
      totalUsers, activeUsers, payingUsers,
      mrr: monthlyAmt, arr: monthlyAmt * 12,
      aiTokens, aiCost, growth, conversion, churn,
      aiCostPerUser: totalUsers ? aiCost / totalUsers : 0,
    };
  }, [profiles, aiLogs, subs]);

  const providerBreakdown = useMemo(() => {
    const m = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const l of aiLogs) {
      const p = (l.provider ?? "lumo").toLowerCase();
      const cur = m.get(p) ?? { tokens: 0, cost: 0, calls: 0 };
      const tok = l.total_tokens ?? 0;
      cur.tokens += tok;
      cur.cost += (tok / 1000) * (PROVIDER_COST[p] ?? 0.1);
      cur.calls += 1;
      m.set(p, cur);
    }
    return [...m.entries()].map(([provider, v]) => ({ provider, ...v }));
  }, [aiLogs]);

  const planBreakdown = useMemo(() => {
    const m: Record<string, number> = { basic: 0, pro: 0, elite: 0, free: 0 };
    profiles.forEach(p => { const k = planOf(p); m[k] = (m[k] ?? 0) + 1; });
    return m;
  }, [profiles]);

  const series = useMemo(() => {
    // 30-day time-series for users, revenue, AI cost
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const userMap = new Map<string, number>();
    profiles.forEach(p => { const k = dayKey(p.created_at); userMap.set(k, (userMap.get(k) ?? 0) + 1); });
    const subMap = new Map<string, number>();
    subs.forEach(s => {
      const k = dayKey(s.created_at);
      const a = Number(s.amount ?? PLAN_PRICE[(s.plan_name ?? "").toLowerCase()] ?? 0);
      subMap.set(k, (subMap.get(k) ?? 0) + a);
    });
    const aiMap = new Map<string, number>();
    aiLogs.forEach(l => {
      const k = dayKey(l.created_at);
      const p = (l.provider ?? "lumo").toLowerCase();
      const cost = ((l.total_tokens ?? 0) / 1000) * (PROVIDER_COST[p] ?? 0.1);
      aiMap.set(k, (aiMap.get(k) ?? 0) + cost);
    });

    let cumUsers = profiles.filter(p => dayKey(p.created_at) < days[0]).length;
    return days.map(d => {
      cumUsers += userMap.get(d) ?? 0;
      return {
        date: d.slice(5),
        users: cumUsers,
        revenue: subMap.get(d) ?? 0,
        aiCost: Math.round(aiMap.get(d) ?? 0),
        signups: userMap.get(d) ?? 0,
      };
    });
  }, [profiles, subs, aiLogs]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p =>
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.full_name ?? "").toLowerCase().includes(q),
    );
  }, [profiles, search]);

  // Admin actions ───────────────────────────────────────────────────────────
  const audit = async (action: string, targetUserId: string, details: Record<string, unknown> = {}) => {
    if (!user) return;
    await supabase.from("admin_audit_log").insert({ admin_id: user.id, target_user_id: targetUserId, action, details: details as never });
  };

  const setPlan = async (p: Profile, plan: string) => {
    const { error } = await supabase.from("profiles").update({ current_plan: plan }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await audit("plan_change", p.id, { from: p.current_plan, to: plan });
    toast.success(`${p.email ?? "User"} → ${plan}`);
    refresh();
  };

  const toggleSuspend = async (p: Profile) => {
    const next = !p.suspended;
    const { error } = await supabase.from("profiles").update({ suspended: next }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await audit(next ? "suspend" : "unsuspend", p.id);
    toast.success(next ? "User suspended" : "User restored");
    refresh();
  };

  const deleteUser = async (p: Profile) => {
    if (!confirm(`Delete profile for ${p.email}? This cannot be undone.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await audit("delete_profile", p.id);
    toast.success("Profile deleted");
    refresh();
  };

  // Announcements composer
  const [draft, setDraft] = useState({ title: "", body: "", severity: "info", audience: "all" });
  const publishAnnouncement = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return toast.error("Title and body required");
    const { error } = await supabase.from("announcements").insert({ ...draft, created_by: user?.id });
    if (error) return toast.error(error.message);
    setDraft({ title: "", body: "", severity: "info", audience: "all" });
    toast.success("Announcement published");
    refresh();
  };
  const toggleAnnouncement = async (a: Announcement) => {
    await supabase.from("announcements").update({ active: !a.active }).eq("id", a.id);
    refresh();
  };

  const setFeedbackStatus = async (f: Feedback, status: string) => {
    await supabase.from("feedback").update({ status }).eq("id", f.id);
    refresh();
  };

  // ── Gates ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
          <h1 className="mt-4 text-xl font-semibold">403 — Unauthorized</h1>
          <p className="mt-2 text-sm text-slate-500">You don't have permission to view this page.</p>
          <Link to="/app" className="mt-6 inline-block text-sm text-slate-900 underline">Return to dashboard</Link>
        </Card>
      </div>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Founder Admin</div>
              <div className="text-[11px] text-slate-500 leading-tight">TrackMint — internal only</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">DB {health.db ? "🟢" : "🔴"}</Badge>
            <Badge variant="secondary" className="text-[10px]">AI {health.ai ? "🟢" : "🔴"}</Badge>
            <Badge variant="secondary" className="text-[10px]">Razorpay {health.razorpay ? "🟢" : "🟡"}</Badge>
            <Button size="sm" variant="outline" onClick={() => { refresh(); pingHealth(); }} disabled={busy}>
              {busy ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-7 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subs">Plans</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="announce">Announce</TabsTrigger>
          </TabsList>

          {/* OVERVIEW ─────────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Total Users" value={metrics.totalUsers.toLocaleString()} trend={metrics.growth} />
              <Stat label="Active (7d)" value={metrics.activeUsers.toLocaleString()} hint={`${((metrics.activeUsers / Math.max(1, metrics.totalUsers)) * 100).toFixed(0)}% of base`} />
              <Stat label="Paying Users" value={metrics.payingUsers.toLocaleString()} hint={`${metrics.conversion.toFixed(1)}% conversion`} />
              <Stat label="MRR" value={inr(metrics.mrr)} hint={`ARR ${inr(metrics.arr)}`} />
              <Stat label="AI Tokens" value={metrics.aiTokens.toLocaleString()} hint={`${aiLogs.length} calls`} />
              <Stat label="AI Cost (est.)" value={inr(metrics.aiCost)} hint={`${inr(metrics.aiCostPerUser)}/user`} />
              <Stat label="Conversion" value={`${metrics.conversion.toFixed(1)}%`} />
              <Stat label="Churn" value={`${metrics.churn.toFixed(1)}%`} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="text-sm font-semibold mb-3">User Growth (30d cumulative)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f172a" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#0f172a" fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <div className="text-sm font-semibold mb-3">Revenue & AI Cost (30d)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={series}>
                    <CartesianGrid stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" dot={false} />
                    <Line type="monotone" dataKey="aiCost" stroke="#ef4444" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* USERS ───────────────────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-3 items-center">
              <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
              <div className="text-xs text-slate-500">{filteredProfiles.length} of {profiles.length} users</div>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Plan</th>
                      <th className="text-left p-3">Joined</th>
                      <th className="text-left p-3">Last Active</th>
                      <th className="text-left p-3">AI Calls</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.slice(0, 200).map(p => {
                      const calls = aiLogs.filter(l => l.user_id === p.id).length;
                      const plan = planOf(p);
                      return (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="p-3">{p.full_name || "—"}</td>
                          <td className="p-3 text-slate-600">{p.email}</td>
                          <td className="p-3">
                            <Badge variant={plan === "elite" ? "default" : plan === "pro" ? "secondary" : "outline"}>{plan}</Badge>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="p-3 text-slate-500">{new Date(p.updated_at).toLocaleDateString()}</td>
                          <td className="p-3">{calls}</td>
                          <td className="p-3">
                            {p.suspended ? <Badge variant="destructive">suspended</Badge> : <Badge variant="outline">active</Badge>}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Select value={plan} onValueChange={v => setPlan(p, v)}>
                                <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="elite">Elite</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" title={p.suspended ? "Unsuspend" : "Suspend"} onClick={() => toggleSuspend(p)}>
                                {p.suspended ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4 text-amber-600" />}
                              </Button>
                              <Button size="icon" variant="ghost" title="Delete profile" onClick={() => deleteUser(p)}>
                                <Trash2 className="w-4 h-4 text-rose-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProfiles.length === 0 && (
                      <tr><td colSpan={8} className="p-6 text-center text-slate-400 text-sm">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* PLANS / SUBS ───────────────────────────────────────────────── */}
          <TabsContent value="subs" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Free / Basic" value={(planBreakdown.basic + planBreakdown.free).toLocaleString()} />
              <Stat label="Pro" value={planBreakdown.pro.toLocaleString()} />
              <Stat label="Elite" value={planBreakdown.elite.toLocaleString()} />
              <Stat label="MRR" value={inr(metrics.mrr)} />
              <Stat label="ARR" value={inr(metrics.arr)} />
            </div>
            <Card className="p-5">
              <div className="text-sm font-semibold mb-3">Signups per day (30d)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series}>
                  <CartesianGrid stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="signups" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* AI ANALYTICS ───────────────────────────────────────────────── */}
          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Total Calls" value={aiLogs.length.toLocaleString()} />
              <Stat label="Total Tokens" value={metrics.aiTokens.toLocaleString()} />
              <Stat label="Total Cost (est.)" value={inr(metrics.aiCost)} />
              <Stat label="Cost / User" value={inr(metrics.aiCostPerUser)} />
            </div>
            <Card className="p-5">
              <div className="text-sm font-semibold mb-3">Usage by provider</div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="text-left py-2">Provider</th><th className="text-right py-2">Calls</th><th className="text-right py-2">Tokens</th><th className="text-right py-2">Cost</th></tr>
                </thead>
                <tbody>
                  {providerBreakdown.map(p => (
                    <tr key={p.provider} className="border-t border-slate-100">
                      <td className="py-2 capitalize">{p.provider}</td>
                      <td className="py-2 text-right">{p.calls.toLocaleString()}</td>
                      <td className="py-2 text-right">{p.tokens.toLocaleString()}</td>
                      <td className="py-2 text-right">{inr(p.cost)}</td>
                    </tr>
                  ))}
                  {providerBreakdown.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">No AI calls logged yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <Card className="p-5">
              <div className="text-sm font-semibold mb-3">AI cost trend (30d)</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={series}>
                  <CartesianGrid stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="aiCost" stroke="#ef4444" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* AUTOMATION ─────────────────────────────────────────────────── */}
          <TabsContent value="automation" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Active Automations" value={automationRules.filter(r => r.enabled).length.toLocaleString()} hint={`${automationRules.length} total`} />
              <Stat label="Triggers (all-time)" value={automationRules.reduce((s, r) => s + (r.trigger_count ?? 0), 0).toLocaleString()} />
              <Stat label="Logged runs" value={automationLogs.length.toLocaleString()} />
              <Stat
                label="Success rate"
                value={`${automationLogs.length ? ((automationLogs.filter(l => l.result === "success").length / automationLogs.length) * 100).toFixed(1) : "0"}%`}
              />
            </div>
            <Card className="p-5">
              <div className="text-sm font-semibold mb-3">Top automations by triggers</div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Tier</th><th className="text-right py-2">Triggers</th><th className="text-right py-2">Enabled</th></tr>
                </thead>
                <tbody>
                  {[...automationRules].sort((a, b) => (b.trigger_count ?? 0) - (a.trigger_count ?? 0)).slice(0, 15).map(r => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2">{r.name}</td>
                      <td className="py-2 capitalize text-slate-500">{r.tier ?? "free"}</td>
                      <td className="py-2 text-right">{(r.trigger_count ?? 0).toLocaleString()}</td>
                      <td className="py-2 text-right">{r.enabled ? "✅" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* FEEDBACK ───────────────────────────────────────────────────── */}
          <TabsContent value="feedback" className="space-y-4">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left p-3">When</th>
                      <th className="text-left p-3">Kind</th>
                      <th className="text-left p-3">Subject</th>
                      <th className="text-left p-3">From</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map(f => (
                      <tr key={f.id} className="border-t border-slate-100 align-top">
                        <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(f.created_at).toLocaleString()}</td>
                        <td className="p-3"><Badge variant="outline" className="capitalize">{f.kind}</Badge></td>
                        <td className="p-3">
                          <div className="font-medium">{f.subject}</div>
                          <div className="text-slate-500 text-xs mt-0.5 line-clamp-2 max-w-md">{f.message}</div>
                        </td>
                        <td className="p-3 text-slate-500">{f.email ?? "—"}</td>
                        <td className="p-3">
                          <Select value={f.status} onValueChange={v => setFeedbackStatus(f, v)}>
                            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                    {feedback.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">No feedback yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ANNOUNCEMENTS ──────────────────────────────────────────────── */}
          <TabsContent value="announce" className="space-y-6">
            <Card className="p-5 space-y-3">
              <div className="text-sm font-semibold">Compose announcement</div>
              <Input placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
              <Textarea placeholder="Body (markdown supported)" value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} rows={4} />
              <div className="flex gap-3">
                <Select value={draft.severity} onValueChange={v => setDraft({ ...draft, severity: v })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={draft.audience} onValueChange={v => setDraft({ ...draft, audience: v })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={publishAnnouncement} className="ml-auto">
                  <Megaphone className="w-4 h-4 mr-2" /> Publish
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Severity</th>
                    <th className="text-left p-3">Audience</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map(a => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-3">
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-md">{a.body}</div>
                      </td>
                      <td className="p-3 capitalize">{a.severity}</td>
                      <td className="p-3 capitalize">{a.audience}</td>
                      <td className="p-3 text-slate-500">{new Date(a.starts_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Button size="sm" variant={a.active ? "default" : "outline"} onClick={() => toggleAnnouncement(a)}>
                          {a.active ? "Live" : "Inactive"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {announcements.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">No announcements yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
