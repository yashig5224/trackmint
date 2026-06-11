import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, RefreshCw, Pause, Play, Trash2, ShieldCheck,
  Wallet, CreditCard, TrendingUp, TrendingDown, Loader2, X, Check, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  BANK_PROVIDERS, SAMPLE_BANKS, generateSyncedTransactions,
  generateBalance, maskAccountNumber,
} from "@/lib/bankProviders";

interface BankConnection {
  id: string;
  provider: string;
  bank_name: string;
  account_type: string;
  account_mask: string | null;
  currency: string | null;
  current_balance: number | null;
  available_balance: number | null;
  status: string;
  sync_frequency: string;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

const currency = (n: number | null | undefined, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 })
    .format(Number(n || 0));

const relTime = (iso: string | null) => {
  if (!iso) return "Never synced";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const accountIcon = (t: string) =>
  t === "credit_card" ? CreditCard : Wallet;

export default function BankingPanel() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setConnections((data as BankConnection[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`bank-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "bank_connections", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const totals = useMemo(() => {
    const active = connections.filter(c => c.status === "active");
    const assets  = active.filter(c => c.account_type !== "credit_card");
    const credit  = active.filter(c => c.account_type === "credit_card");
    const totalBal = assets.reduce((s, c) => s + Number(c.current_balance || 0), 0);
    const totalAvail = assets.reduce((s, c) => s + Number(c.available_balance || 0), 0);
    const creditUsed = credit.reduce((s, c) => s + Math.abs(Number(c.current_balance || 0)), 0);
    return { totalBal, totalAvail, creditUsed, activeCount: active.length };
  }, [connections]);

  const runSync = async (conn: BankConnection) => {
    if (!user) return;
    setSyncing(conn.id);
    const started = new Date().toISOString();
    try {
      const txs = generateSyncedTransactions({
        bankName: conn.bank_name,
        accountType: conn.account_type,
        daysBack: 30,
      });

      const rows = txs.map(t => ({
        user_id: user.id,
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        payment_method: t.payment_method,
        transaction_date: t.transaction_date,
        recurring: t.recurring,
        note: t.note,
        bank_connection_id: conn.id,
        source: `bank:${conn.provider}`,
      }));

      const { error: insErr } = await supabase.from("transactions").insert(rows);
      if (insErr) throw insErr;

      const bal = generateBalance(conn.account_type);
      await supabase.from("bank_connections").update({
        current_balance: bal.current,
        available_balance: bal.available,
        last_synced_at: new Date().toISOString(),
        last_error: null,
        status: "active",
      }).eq("id", conn.id);

      await supabase.from("bank_sync_logs").insert({
        user_id: user.id,
        connection_id: conn.id,
        status: "success",
        transactions_imported: rows.length,
        started_at: started,
        finished_at: new Date().toISOString(),
      });

      toast.success(`Synced ${rows.length} transactions from ${conn.bank_name}`);
    } catch (e: any) {
      await supabase.from("bank_sync_logs").insert({
        user_id: user.id,
        connection_id: conn.id,
        status: "error",
        error_message: e?.message ?? "Sync failed",
        started_at: started,
        finished_at: new Date().toISOString(),
      });
      await supabase.from("bank_connections")
        .update({ status: "error", last_error: e?.message ?? "Sync failed" })
        .eq("id", conn.id);
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
      load();
    }
  };

  const togglePause = async (conn: BankConnection) => {
    const next = conn.status === "paused" ? "active" : "paused";
    await supabase.from("bank_connections").update({ status: next }).eq("id", conn.id);
    toast.success(next === "paused" ? "Sync paused" : "Sync resumed");
  };

  const disconnect = async (conn: BankConnection, alsoDeleteData: boolean) => {
    if (!user) return;
    if (alsoDeleteData) {
      await supabase.from("transactions").delete()
        .eq("user_id", user.id).eq("bank_connection_id", conn.id);
    }
    await supabase.from("bank_connections").delete().eq("id", conn.id);
    toast.success(alsoDeleteData ? "Disconnected and data removed" : "Bank disconnected");
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="glass-card bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-100 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-600">Banking</p>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900">Connected Accounts</h3>
            <p className="text-sm text-gray-600 mt-1">
              Link your bank securely via OAuth or RBI Account Aggregator. We never store credentials.
            </p>
          </div>
          <button
            onClick={() => setShowConnect(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition shadow-md"
          >
            <Plus className="w-4 h-4" /> Connect Bank
          </button>
        </div>

        {connections.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Stat label="Total Balance"   value={currency(totals.totalBal)} icon={Wallet} tint="emerald" />
            <Stat label="Available"       value={currency(totals.totalAvail)} icon={TrendingUp} tint="sky" />
            <Stat label="Credit Used"     value={currency(totals.creditUsed)} icon={CreditCard} tint="rose" />
            <Stat label="Active Accounts" value={String(totals.activeCount)} icon={Building2} tint="indigo" />
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading accounts…</div>
      ) : connections.length === 0 ? (
        <EmptyState onClick={() => setShowConnect(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {connections.map(conn => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              syncing={syncing === conn.id}
              onSync={() => runSync(conn)}
              onPauseToggle={() => togglePause(conn)}
              onDisconnect={(deleteData) => disconnect(conn, deleteData)}
              onFrequencyChange={async (f) => {
                await supabase.from("bank_connections").update({ sync_frequency: f }).eq("id", conn.id);
                toast.success(`Sync set to ${f}`);
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showConnect && (
          <ConnectModal
            onClose={() => setShowConnect(false)}
            onConnected={() => { setShowConnect(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

const Stat = ({ label, value, icon: Icon, tint }: any) => {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    rose: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return (
    <div className="bg-white/70 backdrop-blur border border-white rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tints[tint]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[11px] text-gray-500 font-medium">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
};

const EmptyState = ({ onClick }: { onClick: () => void }) => (
  <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center mb-4 shadow-lg">
      <Building2 className="w-7 h-7 text-white" />
    </div>
    <h4 className="font-display text-lg font-bold text-gray-900">No banks connected yet</h4>
    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
      Link your accounts to automatically sync transactions, detect subscriptions, and power AI insights.
    </p>
    <button
      onClick={onClick}
      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
    >
      <Plus className="w-4 h-4" /> Connect your first bank
    </button>
  </div>
);

const ConnectionCard = ({ conn, syncing, onSync, onPauseToggle, onDisconnect, onFrequencyChange }: any) => {
  const Icon = accountIcon(conn.account_type);
  const [confirm, setConfirm] = useState(false);
  const statusColor =
    conn.status === "active"   ? "bg-emerald-100 text-emerald-700" :
    conn.status === "paused"   ? "bg-amber-100 text-amber-700" :
    conn.status === "error"    ? "bg-rose-100 text-rose-700" :
    "bg-gray-100 text-gray-600";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{conn.bank_name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {conn.account_type.replace("_", " ")} • {conn.account_mask}
              </p>
            </div>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${statusColor}`}>
            {conn.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-[11px] text-gray-500">{conn.account_type === "credit_card" ? "Outstanding" : "Current"}</p>
            <p className="text-base font-bold text-gray-900 tabular-nums">
              {currency(conn.current_balance, conn.currency || "INR")}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-[11px] text-gray-500">Available</p>
            <p className="text-base font-bold text-gray-900 tabular-nums">
              {currency(conn.available_balance, conn.currency || "INR")}
            </p>
          </div>
        </div>

        {conn.last_error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {conn.last_error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>Last sync: {relTime(conn.last_synced_at)}</span>
          <select
            value={conn.sync_frequency}
            onChange={(e) => onFrequencyChange(e.target.value)}
            className="text-xs bg-gray-50 rounded-lg px-2 py-1 border border-gray-200"
          >
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50/50">
        <button
          onClick={onSync}
          disabled={syncing || conn.status === "paused"}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold disabled:opacity-50 hover:bg-gray-800"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        <button
          onClick={onPauseToggle}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50"
        >
          {conn.status === "paused" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {conn.status === "paused" ? "Resume" : "Pause"}
        </button>
        <button
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-medium hover:bg-rose-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-lg font-bold text-gray-900">Disconnect {conn.bank_name}?</h4>
              <p className="text-sm text-gray-600 mt-2">
                You can keep imported transactions for reporting, or remove them entirely.
              </p>
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => { onDisconnect(false); setConfirm(false); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200"
                >
                  Disconnect, keep data
                </button>
                <button
                  onClick={() => { onDisconnect(true); setConfirm(false); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
                >
                  Disconnect & delete imported data
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  className="w-full px-4 py-2 rounded-xl text-gray-500 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ConnectModal = ({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"provider" | "bank" | "consent" | "done">("provider");
  const [provider, setProvider] = useState(BANK_PROVIDERS[0]);
  const [bank, setBank] = useState(SAMPLE_BANKS[0]);
  const [accountType, setAccountType] = useState("savings");
  const [working, setWorking] = useState(false);

  const finalize = async () => {
    if (!user) return;
    setWorking(true);
    const bal = generateBalance(accountType);
    const { data, error } = await supabase.from("bank_connections").insert({
      user_id: user.id,
      provider: provider.id,
      bank_name: bank.name,
      account_type: accountType,
      account_mask: maskAccountNumber(),
      currency: provider.region === "india" ? "INR" : "USD",
      current_balance: bal.current,
      available_balance: bal.available,
      status: "active",
      sync_frequency: "daily",
      last_synced_at: new Date().toISOString(),
      consent_handle: `consent_${crypto.randomUUID()}`,
      consent_expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    }).select().single();

    if (error || !data) {
      toast.error("Could not link account");
      setWorking(false);
      return;
    }

    // First sync immediately
    const txs = generateSyncedTransactions({ bankName: bank.name, accountType, daysBack: 60, count: 24 });
    await supabase.from("transactions").insert(txs.map(t => ({
      user_id: user.id,
      title: t.title, amount: t.amount, type: t.type, category: t.category,
      payment_method: t.payment_method, transaction_date: t.transaction_date,
      recurring: t.recurring, note: t.note,
      bank_connection_id: data.id, source: `bank:${provider.id}`,
    })));
    await supabase.from("bank_sync_logs").insert({
      user_id: user.id, connection_id: data.id, status: "success",
      transactions_imported: txs.length, finished_at: new Date().toISOString(),
    });

    setWorking(false);
    setStep("done");
    toast.success(`${bank.name} connected — ${txs.length} transactions imported`);
    setTimeout(onConnected, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-display text-lg font-bold text-gray-900">Connect a bank</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === "provider" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Choose how you want to link your account. We use bank-grade OAuth or RBI Account Aggregator consent — your credentials never touch our servers.</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">India</p>
                <div className="grid gap-2">
                  {BANK_PROVIDERS.filter(p => p.region === "india").map(p => (
                    <ProviderRow key={p.id} p={p} selected={provider.id === p.id} onSelect={() => setProvider(p)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 mt-4">Global</p>
                <div className="grid gap-2">
                  {BANK_PROVIDERS.filter(p => p.region === "global").map(p => (
                    <ProviderRow key={p.id} p={p} selected={provider.id === p.id} onSelect={() => setProvider(p)} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep("bank")}
                className="w-full mt-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
              >
                Continue with {provider.name}
              </button>
            </div>
          )}

          {step === "bank" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select your bank and account type.</p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SAMPLE_BANKS.map(b => (
                    <button
                      key={b.name}
                      onClick={() => setBank(b)}
                      className={`text-left p-3 rounded-2xl border transition ${
                        bank.name === b.name ? "border-gray-900 ring-2 ring-gray-900/10 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${b.colors} mb-2`} />
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account type</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { id: "savings", label: "Savings" },
                    { id: "current", label: "Current" },
                    { id: "credit_card", label: "Credit Card" },
                    { id: "business", label: "Business" },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setAccountType(t.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border ${
                        accountType === t.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep("provider")} className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200">Back</button>
                <button onClick={() => setStep("consent")} className="flex-1 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800">Continue</button>
              </div>
            </div>
          )}

          {step === "consent" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-900">Secure consent</p>
                </div>
                <ul className="text-xs text-emerald-900/80 space-y-1.5">
                  <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5" /> Read-only access to transactions & balances</li>
                  <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5" /> Credentials never leave your bank's site</li>
                  <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5" /> Revoke anytime — 1-year consent window</li>
                  <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5" /> RBI / GDPR compliant via {provider.name}</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                You'll be redirected to {provider.name} to authorize <strong>{bank.name}</strong>. After approval, we'll fetch your last 60 days of transactions.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep("bank")} className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200" disabled={working}>Back</button>
                <button
                  onClick={finalize}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {working ? "Authorizing…" : "Authorize & Connect"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="font-display text-xl font-bold text-gray-900">Bank connected</h4>
              <p className="text-sm text-gray-500 mt-1">Pulling your transactions now…</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProviderRow = ({ p, selected, onSelect }: any) => (
  <button
    onClick={onSelect}
    disabled={!p.enabled}
    className={`w-full text-left p-3 rounded-2xl border transition ${
      selected ? "border-gray-900 ring-2 ring-gray-900/10 bg-gray-50"
               : "border-gray-200 hover:border-gray-300"
    } ${!p.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
        <p className="text-xs text-gray-500">{p.description}</p>
      </div>
      {!p.enabled && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Soon</span>}
    </div>
  </button>
);
