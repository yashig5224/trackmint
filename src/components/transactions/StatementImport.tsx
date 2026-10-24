import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, X, Check, AlertCircle, Loader2, Sparkles,
  Trash2, History as HistoryIcon, Image as ImageIcon, FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Parsed = {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string;
  balance: number | null;
  recurring: boolean;
  _dup?: boolean;
  _skip?: boolean;
};

const CATEGORIES = [
  "Food", "Shopping", "Travel", "Bills", "Entertainment",
  "Health", "Education", "Salary", "Investment", "Transfer", "Other"
];

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  onImported: () => void;
  existing: { transaction_date: string; amount: number; title: string }[];
  currency?: string;
}

export default function StatementImport({
  open,
  onClose,
  userId,
  onImported,
  existing,
  currency = "INR",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"upload" | "parsing" | "preview" | "saving" | "done">("upload");
  const [rows, setRows] = useState<Parsed[]>([]);
  const [meta, setMeta] = useState<{ bank?: string; period?: string }>({});
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    (supabase.from("statement_imports") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }: any) => {
        if (data) setHistory(data);
      })
      .catch(() => {});
  }, [open, userId, stage]);

  const reset = () => {
    setFile(null);
    setStage("upload");
    setRows([]);
    setMeta({});
    setSummary(null);
  };

  const handleFile = async (f: File) => {
    const nameLower = f.name.toLowerCase();
    const isPdf = f.type === "application/pdf" || nameLower.endsWith(".pdf");
    const isCsv = f.type === "text/csv" || nameLower.endsWith(".csv") || nameLower.endsWith(".txt");
    const isImg = f.type.startsWith("image/") || nameLower.endsWith(".png") || nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg") || nameLower.endsWith(".webp");

    if (!isPdf && !isCsv && !isImg) {
      toast.error("Please upload a PDF, CSV, or Image (PNG/JPG) statement");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size (20 MB)");
      return;
    }

    setFile(f);
    setStage("parsing");

    try {
      const base64 = await fileToBase64(f);
      const mime = f.type || (isPdf ? "application/pdf" : isCsv ? "text/plain" : "image/jpeg");

      const { data, error } = await supabase.functions.invoke("parse-statement", {
        body: {
          fileBase64: base64,
          fileName: f.name,
          mimeType: mime,
          userId,
        },
      });

      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const parsed = ((data as any).transactions || []) as Parsed[];
      if (!parsed || parsed.length === 0) {
        throw new Error("No readable transactions found in this document. Please verify the file.");
      }

      // Duplicate detection against existing user records
      const existingKeys = new Set(existing.map((e) => keyFor(e.transaction_date, e.amount, e.title)));
      const flagged = parsed.map((r) => ({
        ...r,
        _dup: existingKeys.has(keyFor(r.date, r.amount, r.merchant || r.description)),
        _skip: false,
      }));

      setRows(flagged);
      setMeta({ bank: (data as any).bank, period: (data as any).period });
      setStage("preview");
      toast.success(`Extracted ${parsed.length} transactions from ${f.name}!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse statement");
      setStage("upload");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const updateRow = (i: number, patch: Partial<Parsed>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const importNow = async () => {
    setStage("saving");
    try {
      // 1. Storage upload (soft failure)
      let uploadedPath: string | null = null;
      try {
        const path = `${userId}/${Date.now()}-${file!.name}`;
        const upRes = await supabase.storage.from("statements").upload(path, file!, {
          contentType: file!.type || "application/pdf",
          upsert: false,
        });
        if (!upRes.error) uploadedPath = path;
      } catch (storageErr) {
        console.warn("Storage upload non-fatal:", storageErr);
      }

      const toImport = rows.filter((r) => !r._skip && !r._dup);
      const skipped = rows.filter((r) => r._skip).length;
      const duplicates = rows.filter((r) => r._dup).length;
      const insights = buildSummary(toImport);

      // 2. Insert statement_imports tracking record if table exists
      let impId: string | null = null;
      try {
        const { data: imp } = await (supabase.from("statement_imports") as any)
          .insert({
            user_id: userId,
            file_name: file!.name,
            file_path: uploadedPath,
            file_size: file!.size,
            source_type: file!.name.toLowerCase().endsWith(".csv") ? "csv" : file!.type.startsWith("image/") ? "image" : "pdf",
            bank_hint: meta.bank || null,
            transaction_count: toImport.length,
            skipped_count: skipped,
            duplicate_count: duplicates,
            status: "completed",
            summary: insights,
          })
          .select()
          .single();
        if (imp?.id) impId = imp.id;
      } catch (impErr) {
        console.warn("statement_imports optional table non-fatal:", impErr);
      }

      // 3. Batch insert verified transactions
      if (toImport.length > 0) {
        const payload = toImport.map((r) => ({
          user_id: userId,
          title: r.merchant || r.description.slice(0, 80) || "Statement Transaction",
          amount: Number(r.amount),
          type: r.type === "transfer" ? "expense" : r.type,
          category: r.category || "General",
          note: r.description || null,
          recurring: r.recurring || false,
          transaction_date: r.date,
          ...(impId ? { statement_import_id: impId } : {}),
        }));

        for (let i = 0; i < payload.length; i += 100) {
          const slice = payload.slice(i, i + 100);
          const { error } = await (supabase.from("transactions") as any).insert(slice);
          if (error) throw error;
        }
      }

      setSummary({ ...insights, imported: toImport.length, skipped, duplicates });
      setStage("done");
      onImported();
      toast.success(`Successfully imported ${toImport.length} transactions!`);
    } catch (e: any) {
      toast.error(e.message || "Import failed. Please try again.");
      setStage("preview");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card text-card-foreground border border-border/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Smart Statement Import
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Upload bank PDF, CSV, or screenshot — AI extracts dates, amounts, and auto-categorizes every transaction.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-none">
          {stage === "upload" && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragging
                    ? "border-primary bg-primary/5 shadow-inner"
                    : "border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Drop your statement here, or click to browse
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Supports HDFC, ICICI, SBI, Axis, Kotak, IDFC, Paytm, PhonePe, Google Pay, and international banks.
                </p>

                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                    <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF Statements
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> CSV Exports
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-500" /> Image / Screenshots
                  </span>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf,text/csv,.csv,image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {history.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <HistoryIcon className="w-3.5 h-3.5" /> Recent Statement Imports
                  </h4>
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{h.file_name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(h.created_at).toLocaleDateString()} &bull; {h.transaction_count} txns
                              {h.bank_hint && ` &bull; ${h.bank_hint}`}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                          Completed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === "parsing" && (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Analyzing statement with AI…
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Extracting dates, identifying merchants, filtering debit/credits, and categorizing spending.
                </p>
              </div>
            </div>
          )}

          {stage === "preview" && (
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold border border-primary/20">
                  {rows.length} transactions extracted
                </span>
                {meta.bank && (
                  <span className="px-3 py-1.5 rounded-xl bg-card border border-border font-medium text-foreground">
                    Bank: {meta.bank}
                  </span>
                )}
                {meta.period && (
                  <span className="px-3 py-1.5 rounded-xl bg-card border border-border font-medium text-foreground">
                    Period: {meta.period}
                  </span>
                )}
                {rows.some((r) => r._dup) && (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                    {rows.filter((r) => r._dup).length} existing duplicates detected
                  </span>
                )}
              </div>

              {/* Transactions Table */}
              <div className="border border-border/80 rounded-2xl overflow-hidden bg-card">
                <div className="max-h-[50vh] overflow-y-auto scrollbar-none">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 sticky top-0 z-10 border-b border-border/70 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Import?</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Merchant / Description</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-muted/30 transition-colors ${
                            r._dup ? "opacity-60 bg-amber-500/5" : ""
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={!r._skip && !r._dup}
                              onChange={(e) => updateRow(idx, { _skip: !e.target.checked, _dup: false })}
                              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-medium whitespace-nowrap">{r.date}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={r.merchant || r.description}
                              onChange={(e) => updateRow(idx, { merchant: e.target.value })}
                              className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none font-medium text-foreground truncate"
                            />
                            {r._dup && (
                              <span className="text-[10px] text-amber-500 font-semibold block">
                                Matches existing entry
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-display font-bold whitespace-nowrap">
                            {new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(r.amount)}
                          </td>
                          <td className="p-3">
                            <select
                              value={r.category}
                              onChange={(e) => updateRow(idx, { category: e.target.value })}
                              className="bg-card border border-border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                r.type === "income"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {r.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {stage === "saving" && (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
              <h3 className="font-display text-lg font-bold text-foreground">
                Saving verified transactions…
              </h3>
              <p className="text-xs text-muted-foreground">
                Writing rows directly to your TrackMint account.
              </p>
            </div>
          )}

          {stage === "done" && summary && (
            <div className="py-8 space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Statement Successfully Imported!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Added {summary.imported} transactions into your active tracking history.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2 text-left">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Imported</span>
                  <p className="text-lg font-bold text-foreground mt-1">{summary.imported} txns</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Inflow</span>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{fmt(summary.income, currency)}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Outflow</span>
                  <p className="text-lg font-bold text-rose-600 mt-1">{fmt(summary.expenses, currency)}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Duplicates</span>
                  <p className="text-lg font-bold text-amber-600 mt-1">{summary.duplicates} skipped</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
          <button
            onClick={() => { reset(); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
          >
            {stage === "done" ? "Close" : "Cancel"}
          </button>

          {stage === "preview" && (
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-3.5 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
              >
                Re-upload
              </button>
              <button
                onClick={importNow}
                disabled={rows.filter((r) => !r._skip && !r._dup).length === 0}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-40"
              >
                Import {rows.filter((r) => !r._skip && !r._dup).length} Transactions
              </button>
            </div>
          )}

          {stage === "done" && (
            <button
              onClick={() => { reset(); onClose(); }}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              View Updated Transactions
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      resolve(s.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
}

function keyFor(date: string, amount: number, title: string) {
  return `${date}|${Math.round(amount * 100)}|${title.toLowerCase().slice(0, 30)}`;
}

function fmt(n: number, c: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);
}

function buildSummary(txns: Parsed[]) {
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expenses) / income) * 100)) : 0;
  const largest = txns.reduce((m, t) => Math.max(m, t.amount), 0);
  const catMap: Record<string, number> = {};
  const merchMap: Record<string, number> = {};
  for (const t of txns) {
    if (t.type !== "expense") continue;
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    const m = t.merchant || t.description;
    if (m) merchMap[m] = (merchMap[m] || 0) + t.amount;
  }
  const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMerchant = Object.entries(merchMap).sort((a, b) => b[1] - a[1])[0]?.[0];
  const subscriptions = txns.filter((t) => t.recurring).map((t) => t.merchant || t.description).slice(0, 8);
  return { income, expenses, savingsRate, largest, topCategory, topMerchant, subscriptions };
}
