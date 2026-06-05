// FinTrack AI — Premium Investor-Grade Report Engine (v3)
// Every figure derived from real Supabase data. No placeholders.
// 11 themed pages with branded gradient layout, modern charts,
// AI executive analysis, deep intelligence sections and a 90-day action plan.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeHealthScore, type FactorScore } from "./financialHealth";
import { computeForecast } from "./forecastEngine";
import { supabase } from "@/integrations/supabase/client";

function txt(d: Doc, text: string, x: number, y: number, options?: any) {
  d.setCharSpace(0);
  d.text(text, x, y, options);
}

function resetText(d: Doc) {
  d.setCharSpace(0);
}

export type ReportKind = "monthly" | "goals" | "ai_insights" | "spending" | "elite_forecast";

export interface ReportTx {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string | null;
  transaction_date: string;
  recurring?: boolean | null;
  payment_method?: string | null;
}
export interface ReportGoal {
  id?: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
}
export interface ReportBudget {
  id?: string;
  category: string;
  monthly_limit: number;
  spent_amount: number;
  month: string;
}

export interface ReportInput {
  kind: ReportKind;
  userName: string;
  userId?: string;
  currency: string;
  monthlyIncome: number;
  transactions: ReportTx[];
  goals: ReportGoal[];
  budgets?: ReportBudget[];
  stats: { income: number; expenses: number; balance: number; savings: number; savingsRate: number };
  categoryData: Array<{ name: string; value: number }>;
  trendData: Array<{ name: string; income: number; expense: number }>;
  tier: "free" | "pro" | "elite";
}

// ─── design tokens ──────────────────────────────────────────────────────────
type RGB = [number, number, number];
const INK: RGB = [15, 23, 42];
const SUBINK: RGB = [51, 65, 85];
const MUTED: RGB = [100, 116, 139];
const SOFT: RGB = [148, 163, 184];
const LINE: RGB = [203, 213, 225];
const SURFACE: RGB = [248, 250, 252];
const PAPER: RGB = [255, 255, 255];

const PRIMARY: RGB = [99, 102, 241]; // indigo
const ACCENT: RGB = [139, 92, 246]; // violet
const PINK: RGB = [217, 70, 239]; // fuchsia
const TEAL: RGB = [20, 184, 166];
const SKY: RGB = [14, 165, 233];
const GOOD: RGB = [16, 185, 129];
const BAD: RGB = [239, 68, 68];
const WARN: RGB = [245, 158, 11];
const DEEP: RGB = [30, 27, 75];

const CAT_HEX: Record<string, RGB> = {
  Food: [245, 158, 11],
  Shopping: [236, 72, 153],
  Travel: [59, 130, 246],
  Bills: [139, 92, 246],
  Entertainment: [6, 182, 212],
  Health: [16, 185, 129],
  Education: [99, 102, 241],
  Salary: [34, 197, 94],
  Investment: [14, 165, 233],
  Other: [148, 163, 184],
  Transport: [251, 113, 133],
  Rent: [120, 113, 198],
  Groceries: [234, 88, 12],
};
const palette = (i: number): RGB => {
  const arr: RGB[] = [PRIMARY, ACCENT, PINK, GOOD, WARN, SKY, TEAL, [236, 72, 153], [99, 102, 241], SOFT];
  return arr[i % arr.length];
};

const fmt = (n: number, c = "INR") => {
  const value = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

  return c === "INR" ? `₹${value}` : value;
};
const pct = (n: number) => `${Math.round(n)}%`;
const safe = (n: number) => (Number.isFinite(n) ? n : 0);

// ─── primitives ─────────────────────────────────────────────────────────────
type Doc = jsPDF;
const W = (d: Doc) => d.internal.pageSize.getWidth();
const H = (d: Doc) => d.internal.pageSize.getHeight();

function gradFill(d: Doc, x: number, y: number, w: number, h: number, stops: RGB[], vertical = false) {
  const bands = 120;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const seg = t * (stops.length - 1);
    const idx = Math.floor(seg);
    const local = seg - idx;
    const a = stops[idx];
    const b = stops[Math.min(stops.length - 1, idx + 1)];
    const r = a[0] + (b[0] - a[0]) * local;
    const g = a[1] + (b[1] - a[1]) * local;
    const bl = a[2] + (b[2] - a[2]) * local;
    d.setFillColor(r, g, bl);
    if (vertical) d.rect(x, y + (h / bands) * i, w, h / bands + 0.6, "F");
    else d.rect(x + (w / bands) * i, y, w / bands + 0.6, h, "F");
  }
}

function panel(d: Doc, x: number, y: number, w: number, h: number, title?: string) {
  // White card background
  d.setFillColor(...PAPER);
  d.roundedRect(x, y, w, h, 10, 10, "F");

  // Stronger border for print readability
  d.setDrawColor(...LINE);
  d.setLineWidth(0.8);

  d.roundedRect(x, y, w, h, 10, 10, "S");

  // Section title
  if (title) {
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(...MUTED);

    d.text(title.toUpperCase(), x + 12, y + 14);
  }
}
function brandedHeader(d: Doc, title: string, subtitle: string, tier: string) {
  gradFill(d, 0, 0, W(d), 36, [DEEP, PRIMARY, ACCENT, PINK]);
  // logo mark
  d.setFillColor(...PAPER);
  d.roundedRect(20, 16, 24, 24, 6, 6, "F");
  d.setTextColor(...PRIMARY);
  d.setFontSize(13);
  d.setFont("helvetica", "bold");
  d.text("FT", 32, 31, { align: "center" });
  d.setTextColor(...PAPER);
  d.setFontSize(13);
  d.setFont("helvetica", "bold");
  d.text("FinTrack AI", 52, 27);
  d.setFontSize(7.5);
  d.setFont("helvetica", "normal");
  d.text("Personal Financial Operating System", 52, 36);
  // tier pill
  const pill = tier === "elite" ? "ELITE AI+" : tier === "pro" ? "PRO AI" : "STARTER";
  const pw = d.getTextWidth(pill) + 16;
  d.setFillColor(255, 255, 255);
  d.setGState(new (d as never as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 0.18 }));
  d.roundedRect(W(d) - pw - 20, 18, pw, 18, 9, 9, "F");
  d.setGState(new (d as never as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 1 }));
  d.setFillColor(...PAPER);
  d.roundedRect(W(d) - pw - 20, 18, pw, 18, 9, 9, "S");
  d.setTextColor(...PAPER);
  d.setFontSize(8);
  d.setFont("helvetica", "bold");
  d.text(pill, W(d) - pw / 2 - 20, 29.5, { align: "center" });
  // title
  d.setTextColor(...INK);
  d.setFontSize(20);
  d.setFont("helvetica", "bold");
  d.text(title, 20, 56);
  d.setFontSize(9);
  d.setFont("helvetica", "normal");
  d.setTextColor(...MUTED);
  d.text(subtitle, 20, 72);
  // divider
  d.setDrawColor(...LINE);
  d.setLineWidth(0.4);
  d.line(20, 80, W(d) - 20, 80);
}

function pageFooter(d: Doc) {
  const total = d.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    d.setPage(i);
    if (i === 1) continue; // cover handled separately
    d.setDrawColor(...LINE);
    d.setLineWidth(0.3);
    d.line(20, H(d) - 24, W(d) - 20, H(d) - 24);
    d.setFontSize(8.5);
    d.setFont("helvetica", "normal");
    d.setTextColor(...MUTED);
    d.text("FinTrack AI · Confidential financial intelligence", 20, H(d) - 14);
    d.text(`Page ${i} of ${total}`, W(d) - 20, H(d) - 14, { align: "right" });
    // tiny brand dot
    d.setFillColor(...PRIMARY);
    d.circle(W(d) / 2, H(d) - 16, 1.8, "F");
  }
}

function sectionLabel(d: Doc, kicker: string, title: string, y: number) {
  d.setFontSize(8.5);
  d.setFont("helvetica", "bold");
  d.setTextColor(...PRIMARY);
  d.text(kicker.toUpperCase(), 20, y);
  d.setFontSize(15);
  d.setFont("helvetica", "bold");
  d.setTextColor(...INK);
  d.text(title, 20, y + 12);
  d.setDrawColor(...PRIMARY);
  d.setLineWidth(1.4);
  d.line(20, y + 16, 36, y + 16);
  return y + 26;
}

function kpiCard(
  d: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub: string,
  accent: RGB,
) {
  d.setFillColor(...PAPER);

  d.roundedRect(x, y, w, h, 10, 10, "F");

  d.setDrawColor(...LINE);
  d.setLineWidth(0.8);

  d.roundedRect(x, y, w, h, 10, 10, "S");

  d.setFillColor(...accent);

  d.roundedRect(x, y, w, 4, 2, 2, "F");

  d.setFontSize(8);
  d.setFont("helvetica", "bold");
  d.setTextColor(...MUTED);

  d.text(label.toUpperCase(), x + 10, y + 18);

  d.setFontSize(22);
  d.setFont("helvetica", "bold");
  d.setTextColor(...INK);

  d.text(value, x + 10, y + 38);

  d.setFontSize(8);
  d.setFont("helvetica", "normal");
  d.setTextColor(...MUTED);

  d.text(sub, x + 10, y + h - 8);
}

function kpiRow(d: Doc, y: number, items: { label: string; value: string; sub?: string; tone?: RGB }[]) {
  const gap = 8;
  const totalW = W(d) - 40;
  const cw = (totalW - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) =>
    kpiCard(d, 20 + i * (cw + gap), y, cw, 62, it.label, it.value, it.sub || "", it.tone || PRIMARY),
  );
  return y + 70;
}

function paragraph(
  d: Doc,
  x: number,
  y: number,
  w: number,
  text: string,
  opts: { size?: number; color?: RGB; bold?: boolean; lh?: number } = {},
) {
  const size = opts.size || 9;
  d.setFontSize(size);
  d.setFont("helvetica", opts.bold ? "bold" : "normal");
  d.setTextColor(...(opts.color || SUBINK));
  const lines = d.splitTextToSize(text, w);
  d.text(lines, x, y);
  return y + lines.length * (opts.lh || size * 1.35);
}

function bullet(d: Doc, x: number, y: number, w: number, items: string[], tone: RGB = PRIMARY) {
  items.forEach((it) => {
    d.setFillColor(...tone);
    d.circle(x + 2, y - 2.5, 1.4, "F");
    y = paragraph(d, x + 9, y, w - 9, it, { size: 9 }) + 4;
  });
  return y;
}

// ─── charts ─────────────────────────────────────────────────────────────────
function gridFrame(d: Doc, x: number, y: number, w: number, h: number, padL = 28, padR = 12, padT = 16, padB = 20) {
  return { ix: x + padL, iy: y + padT, iw: w - padL - padR, ih: h - padT - padB };
}

function drawAxes(d: Doc, ix: number, iy: number, iw: number, ih: number, max: number, min: number, labels: string[]) {
  d.setDrawColor(...LINE);
  d.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const yy = iy + (ih / 4) * g;
    d.line(ix, yy, ix + iw, yy);
    const val = max - ((max - min) / 4) * g;
    d.setFontSize(6);
    d.setTextColor(...SOFT);
    d.text(shortNum(val), ix - 4, yy + 2, { align: "right" });
  }
  labels.forEach((l, i) => {
    const xx = ix + (iw / Math.max(1, labels.length - 1)) * i;
    d.setFontSize(6);
    d.setTextColor(...MUTED);
    d.text(l, xx, iy + ih + 10, { align: "center" });
  });
}

function shortNum(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(Math.round(n));
}

function areaChart(
  d: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  values: number[],
  labels: string[],
  color: RGB,
  label: string,
) {
  panel(d, x, y, w, h);
  const { ix, iy, iw, ih } = gridFrame(d, x, y, w, h);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  drawAxes(d, ix, iy, iw, ih, max, min, labels);
  if (values.length < 2) return;
  // build polygon points
  const pts: [number, number][] = values.map((v, i) => {
    const xx = ix + (iw / Math.max(1, values.length - 1)) * i;
    const yy = iy + ih - ((v - min) / Math.max(1, max - min)) * ih;
    return [xx, yy];
  });
  // fill (faux gradient via stacked translucent triangles)
  d.setGState(new (d as never as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 0.18 }));
  d.setFillColor(...color);
  for (let i = 0; i < pts.length - 1; i++) {
    d.triangle(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 1][0], iy + ih, "F");
    d.triangle(pts[i][0], pts[i][1], pts[i + 1][0], iy + ih, pts[i][0], iy + ih, "F");
  }
  d.setGState(new (d as never as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 1 }));
  // line
  d.setDrawColor(...color);
  d.setLineWidth(1.3);
  for (let i = 0; i < pts.length - 1; i++) d.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  pts.forEach(([xx, yy]) => {
    d.setFillColor(...color);
    d.circle(xx, yy, 1.2, "F");
  });
  // legend
  d.setFillColor(...color);
  d.circle(x + 14, y + 10, 1.6, "F");
  d.setFontSize(8.5);
  d.setTextColor(...MUTED);
  d.text(label, x + 18, y + 12);
}

function multiLine(
  d: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  series: { color: RGB; values: number[]; label: string }[],
  labels: string[],
) {
  panel(d, x, y, w, h);
  const { ix, iy, iw, ih } = gridFrame(d, x, y, w, h);
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  drawAxes(d, ix, iy, iw, ih, max, min, labels);
  series.forEach((s) => {
    d.setDrawColor(...s.color);
    d.setLineWidth(1.4);
    for (let i = 0; i < s.values.length - 1; i++) {
      const x1 = ix + (iw / Math.max(1, s.values.length - 1)) * i;
      const x2 = ix + (iw / Math.max(1, s.values.length - 1)) * (i + 1);
      const y1 = iy + ih - ((s.values[i] - min) / Math.max(1, max - min)) * ih;
      const y2 = iy + ih - ((s.values[i + 1] - min) / Math.max(1, max - min)) * ih;
      d.line(x1, y1, x2, y2);
    }
    s.values.forEach((v, i) => {
      const xx = ix + (iw / Math.max(1, s.values.length - 1)) * i;
      const yy = iy + ih - ((v - min) / Math.max(1, max - min)) * ih;
      d.setFillColor(...s.color);
      d.circle(xx, yy, 1.3, "F");
    });
  });
  // legend
  let lx = x + 14;
  series.forEach((s) => {
    d.setFillColor(...s.color);
    d.circle(lx, y + 10, 1.6, "F");
    d.setFontSize(8.5);
    d.setTextColor(...MUTED);
    d.text(s.label, lx + 4, y + 12);
    lx += d.getTextWidth(s.label) + 16;
  });
}

function dualBars(
  d: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  data: { label: string; income: number; expense: number }[],
) {
  panel(d, x, y, w, h);
  const { ix, iy, iw, ih } = gridFrame(d, x, y, w, h);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  drawAxes(
    d,
    ix,
    iy,
    iw,
    ih,
    max,
    0,
    data.map((d) => d.label),
  );
  const slot = iw / Math.max(1, data.length);
  const bw = Math.min(11, slot / 3);
  data.forEach((dd, i) => {
    const cx = ix + slot * i + slot / 2;
    const incH = (dd.income / max) * ih;
    const expH = (dd.expense / max) * ih;
    d.setFillColor(...GOOD);
    d.roundedRect(cx - bw - 1.5, iy + ih - incH, bw, incH, 1.5, 1.5, "F");
    d.setFillColor(...BAD);
    d.roundedRect(cx + 1.5, iy + ih - expH, bw, expH, 1.5, 1.5, "F");
  });
  d.setFillColor(...GOOD);
  d.circle(x + 14, y + 10, 1.6, "F");
  d.setFontSize(8.5);
  d.setTextColor(...MUTED);
  d.text("Income", x + 18, y + 12);
  d.setFillColor(...BAD);
  d.circle(x + 52, y + 10, 1.6, "F");
  d.text("Expense", x + 56, y + 12);
}

function donut(d: Doc, cx: number, cy: number, r: number, data: { name: string; value: number }[]) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    d.setDrawColor(...LINE);
    d.setLineWidth(10);
    d.circle(cx, cy, r, "S");
    return;
  }
  let start = -Math.PI / 2;
  data.forEach((dd, i) => {
    const angle = (dd.value / total) * Math.PI * 2;
    const steps = Math.max(10, Math.ceil(angle * 22));
    const col = CAT_HEX[dd.name] || palette(i);
    d.setDrawColor(...col);
    d.setLineWidth(11);
    for (let s = 0; s < steps; s++) {
      const t1 = start + (angle * s) / steps;
      const t2 = start + (angle * (s + 1)) / steps;
      d.line(cx + Math.cos(t1) * r, cy + Math.sin(t1) * r, cx + Math.cos(t2) * r, cy + Math.sin(t2) * r);
    }
    start += angle;
  });
  d.setFillColor(...PAPER);
  d.circle(cx, cy, r - 8, "F");
}

function scoreGauge(d: Doc, cx: number, cy: number, r: number, score: number, grade: string) {
  // arc from -135° to 135°
  const start = Math.PI * 0.75 * -1; // bottom-left
  const end = Math.PI * 0.75;
  const span = end - start;
  const col: RGB = score >= 85 ? GOOD : score >= 70 ? [34, 197, 94] : score >= 50 ? WARN : BAD;
  // bg track
  const segs = 50;
  d.setLineWidth(9);
  d.setDrawColor(...LINE);
  for (let i = 0; i < segs; i++) {
    const t1 = start + (span * i) / segs;
    const t2 = start + (span * (i + 1)) / segs;
    d.line(
      cx + Math.cos(t1 - Math.PI / 2) * r,
      cy + Math.sin(t1 - Math.PI / 2) * r,
      cx + Math.cos(t2 - Math.PI / 2) * r,
      cy + Math.sin(t2 - Math.PI / 2) * r,
    );
  }
  // value
  const filled = Math.max(0, Math.min(1, score / 100));
  const fillSegs = Math.round(segs * filled);
  d.setDrawColor(...col);
  for (let i = 0; i < fillSegs; i++) {
    const t1 = start + (span * i) / segs;
    const t2 = start + (span * (i + 1)) / segs;
    d.line(
      cx + Math.cos(t1 - Math.PI / 2) * r,
      cy + Math.sin(t1 - Math.PI / 2) * r,
      cx + Math.cos(t2 - Math.PI / 2) * r,
      cy + Math.sin(t2 - Math.PI / 2) * r,
    );
  }
  // text
  d.setTextColor(...INK);
  d.setFont("helvetica", "bold");
  d.setFontSize(28);
  d.text(String(Math.round(score)), cx, cy + 4, { align: "center" });
  d.setFontSize(8);
  d.setFont("helvetica", "normal");
  d.setTextColor(...MUTED);
  d.text("/ 100", cx, cy + 14, { align: "center" });
  d.setFont("helvetica", "bold");
  d.setFontSize(10);
  d.setTextColor(...col);
  d.text(grade.toUpperCase(), cx, cy + 28, { align: "center" });
}

function progressBar(d: Doc, x: number, y: number, w: number, ratio: number, tone: RGB, height = 5) {
  d.setFillColor(...LINE);
  d.roundedRect(x, y, w, height, height / 2, height / 2, "F");
  d.setFillColor(...tone);
  d.roundedRect(x, y, w * Math.max(0, Math.min(1, ratio)), height, height / 2, height / 2, "F");
}

// ─── analytics derivations ──────────────────────────────────────────────────
function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function inRange(txs: ReportTx[], days: number, offset = 0) {
  const end = isoDaysAgo(offset);
  const start = isoDaysAgo(offset + days);
  return txs.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
}

function weeklyTrend(txs: ReportTx[], weeks: number) {
  const out: { name: string; income: number; expense: number; net: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const s = start.toISOString().slice(0, 10),
      e = end.toISOString().slice(0, 10);
    const wk = txs.filter((t) => t.transaction_date >= s && t.transaction_date <= e);
    const inc = wk.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = wk.filter((t) => t.type !== "income").reduce((a, t) => a + Number(t.amount), 0);
    out.push({ name: `W${weeks - i}`, income: inc, expense: exp, net: inc - exp });
  }
  return out;
}

function monthlyTrend(txs: ReportTx[], months: number) {
  const out: { name: string; key: string; income: number; expense: number; savings: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const m = txs.filter((t) => t.transaction_date.startsWith(key));
    const inc = m.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const exp = m.filter((t) => t.type !== "income").reduce((s, t) => s + Number(t.amount), 0);
    out.push({
      name: d.toLocaleDateString("en", { month: "short" }),
      key,
      income: inc,
      expense: exp,
      savings: inc - exp,
    });
  }
  return out;
}

function quarterlyTrend(txs: ReportTx[], quarters: number) {
  const out: { name: string; income: number; expense: number; net: number }[] = [];
  for (let i = quarters - 1; i >= 0; i--) {
    const end = new Date();
    end.setMonth(end.getMonth() - i * 3);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 2);
    start.setDate(1);
    const s = start.toISOString().slice(0, 10),
      e = end.toISOString().slice(0, 10);
    const q = txs.filter((t) => t.transaction_date >= s && t.transaction_date <= e);
    const inc = q.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = q.filter((t) => t.type !== "income").reduce((a, t) => a + Number(t.amount), 0);
    out.push({ name: `Q-${quarters - i}`, income: inc, expense: exp, net: inc - exp });
  }
  return out;
}

function yearlyTrend(txs: ReportTx[], years: number) {
  const out: { name: string; income: number; expense: number; net: number }[] = [];
  for (let i = years - 1; i >= 0; i--) {
    const yr = new Date().getFullYear() - i;
    const y = txs.filter((t) => t.transaction_date.startsWith(String(yr)));
    const inc = y.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = y.filter((t) => t.type !== "income").reduce((a, t) => a + Number(t.amount), 0);
    out.push({ name: String(yr), income: inc, expense: exp, net: inc - exp });
  }
  return out;
}

function catTotals(txs: ReportTx[], days: number, offset = 0) {
  const m = new Map<string, number>();
  inRange(txs, days, offset)
    .filter((t) => t.type !== "income")
    .forEach((t) => {
      const c = t.category || "Other";
      m.set(c, (m.get(c) || 0) + Number(t.amount));
    });
  return m;
}

function categoryDelta(txs: ReportTx[]) {
  const cur = catTotals(txs, 30);
  const prev = catTotals(txs, 30, 30);
  const all = new Set<string>([...cur.keys(), ...prev.keys()]);
  return Array.from(all).map((c) => {
    const a = cur.get(c) || 0;
    const b = prev.get(c) || 0;
    const delta = a - b;
    const growth = b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0;
    return { category: c, current: a, prior: b, delta, growth };
  });
}

function merchantStats(txs: ReportTx[]) {
  const map = new Map<string, { name: string; count: number; total: number; lastDate: string; firstDate: string }>();
  txs
    .filter((t) => t.type !== "income")
    .forEach((t) => {
      const k = (t.title || "Unknown").trim();
      const cur = map.get(k) || {
        name: k,
        count: 0,
        total: 0,
        lastDate: t.transaction_date,
        firstDate: t.transaction_date,
      };
      cur.count += 1;
      cur.total += Number(t.amount);
      if (t.transaction_date > cur.lastDate) cur.lastDate = t.transaction_date;
      if (t.transaction_date < cur.firstDate) cur.firstDate = t.transaction_date;
      map.set(k, cur);
    });
  return Array.from(map.values());
}

function detectSubs(txs: ReportTx[]) {
  const sig = new Map<string, { name: string; amount: number; months: Set<string>; total: number }>();
  txs
    .filter((t) => t.type !== "income")
    .forEach((t) => {
      const key = `${(t.title || "").toLowerCase().trim()}::${Math.round(Number(t.amount) / 10) * 10}`;
      const cur = sig.get(key) || { name: t.title || "Unknown", amount: Number(t.amount), months: new Set(), total: 0 };
      cur.months.add(t.transaction_date.slice(0, 7));
      cur.total += Number(t.amount);
      sig.set(key, cur);
    });
  return Array.from(sig.values())
    .filter((s) => s.months.size >= 2 || txs.find((t) => t.recurring && t.title === s.name))
    .sort((a, b) => b.months.size - a.months.size);
}

// ─── titles ─────────────────────────────────────────────────────────────────
function titleFor(k: ReportKind) {
  return (
    {
      monthly: "Monthly Financial Report",
      goals: "Goal Progress Report",
      ai_insights: "AI Insights Report",
      spending: "Spending Analytics Report",
      elite_forecast: "Elite Wealth Forecast",
    } as Record<ReportKind, string>
  )[k];
}
function subtitleFor(k: ReportKind) {
  return (
    {
      monthly: "A complete investor-grade snapshot of your financial life this period.",
      goals: "Every milestone toward your financial goals, with completion forecasts.",
      ai_insights: "Lumo AI's personalized observations, opportunities and warnings.",
      spending: "Where every unit of currency goes — categorized, ranked and modeled.",
      elite_forecast: "Forward-looking projections across spending, savings and wealth.",
    } as Record<ReportKind, string>
  )[k];
}

// ===== PAGES =================================================================

function pageCover(doc: Doc, input: ReportInput, score: number, grade: string) {
  gradFill(doc, 0, 0, W(doc), H(doc), [DEEP, PRIMARY, ACCENT, PINK], true);
  // subtle radial glow
  doc.setGState(new (doc as never as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 0.18 }));
  doc.setFillColor(255, 255, 255);
  doc.circle(W(doc) - 60, 80, 120, "F");
  doc.circle(60, H(doc) - 80, 140, "F");
  doc.setGState(new (doc as never as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 1 }));

  // logo
  doc.setFillColor(...PAPER);
  doc.roundedRect(40, 60, 36, 36, 9, 9, "F");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  resetText(doc);

  doc.text("FT", 58, 84, { align: "center" });
  doc.setTextColor(...PAPER);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  resetText(doc);
  doc.text("FinTrack AI", 84, 78);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  resetText(doc);
  doc.text("Personal Financial Operating System", 84, 87);

  // title
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PAPER);
  const lines = doc.splitTextToSize(titleFor(input.kind), W(doc) - 80);
  resetText(doc);
  doc.text(lines, 40, 190);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(230, 230, 255);
  paragraph(doc, 40, 230, W(doc) - 80, subtitleFor(input.kind), { size: 11, color: [230, 230, 255] });

  // meta card
  const cy = 280;
  doc.setFillColor(...PAPER);
  doc.roundedRect(40, cy, W(doc) - 80, 130, 12, 12, "F");
  const half = (W(doc) - 80) / 2;
  const metas: [string, string][] = [
    ["PREPARED FOR", input.userName || "FinTrack User"],
    ["PLAN", input.tier === "elite" ? "Elite AI+" : input.tier === "pro" ? "Pro AI" : "Starter"],
    [
      "PERIOD",
      `${new Date(Date.now() - 30 * 86_400_000).toLocaleDateString("en", { month: "short", day: "numeric" })} → ${new Date().toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`,
    ],
    ["GENERATED", new Date().toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })],
  ];
  metas.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 56 + col * half;
    const y = cy + 30 + row * 44;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    resetText(doc);
    doc.text(m[0], x, y);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(m[1], x, y + 14);
  });

  // health gauge card
  const by = 430;
  doc.setFillColor(...PAPER);
  doc.roundedRect(40, by, W(doc) - 80, 170, 12, 12, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MUTED);
  resetText(doc);
  doc.text("FINANCIAL HEALTH SCORE", 60, by + 24);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SUBINK);
  paragraph(
    doc,
    60,
    by + 40,
    W(doc) / 2 - 20,
    "A composite of 8 factors — savings rate, budget adherence, goal progress, income & spending stability, emergency fund coverage, subscription health and debt ratio.",
    { size: 9, color: MUTED },
  );
  scoreGauge(doc, W(doc) - 110, by + 90, 44, score, grade);

  // footer line
  doc.setTextColor(...PAPER);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  resetText(doc);
  doc.text("Confidential · Generated by Lumo AI · fintrack.ai", W(doc) / 2, H(doc) - 28, { align: "center" });
}

function pageHealthBreakdown(
  doc: Doc,
  input: ReportInput,
  hs: {
    score: number;
    grade: string;
    factors: FactorScore[];
    monthlyChange: number;
    trend: { date: string; score: number }[];
    recommendations: string[];
  },
) {
  brandedHeader(
    doc,
    "Financial Health Breakdown",
    "How your score is calculated across 8 weighted factors.",
    input.tier,
  );
  let y = 92;
  // hero panel with gauge
  panel(doc, 20, y, W(doc) - 40, 130);
  scoreGauge(doc, 90, y + 70, 44, hs.score, hs.grade);
  const tx = 160;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MUTED);
  resetText(doc);
  doc.text("COMPOSITE SCORE", tx, y + 24);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  resetText(doc);
  doc.text(`${hs.score}/100 · ${hs.grade}`, tx, y + 44);
  const delta = hs.monthlyChange;
  const dCol: RGB = delta >= 0 ? GOOD : BAD;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dCol);
  resetText(doc);
  doc.text(`${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} pts vs prior month`, tx, y + 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  paragraph(
    doc,
    tx,
    y + 74,
    W(doc) - tx - 40,
    "Each factor is independently scored 0–100, then combined using research-backed weights. Lower-scoring factors drive the recommendations below.",
    { size: 8, color: MUTED },
  );
  // mini trend
  if (hs.trend.length >= 2) {
    const tw = 140,
      th = 60;
    const ty = y + 60;
    const minS = Math.min(...hs.trend.map((t) => t.score));
    const maxS = Math.max(...hs.trend.map((t) => t.score));
    const range = Math.max(1, maxS - minS);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(1.2);
    for (let i = 0; i < hs.trend.length - 1; i++) {
      const x1 = W(doc) - 20 - tw + (tw / (hs.trend.length - 1)) * i;
      const x2 = W(doc) - 20 - tw + (tw / (hs.trend.length - 1)) * (i + 1);
      const y1 = ty + th - ((hs.trend[i].score - minS) / range) * th;
      const y2 = ty + th - ((hs.trend[i + 1].score - minS) / range) * th;
      doc.line(x1, y1, x2, y2);
    }
  }
  y += 142;

  // factor bars
  panel(doc, 20, y, W(doc) - 40, 270, "Score Components");
  let fy = y + 32;
  hs.factors.forEach((f) => {
    const tone: RGB = f.status === "good" ? GOOD : f.status === "warn" ? WARN : f.status === "bad" ? BAD : SOFT;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(f.label, 32, fy);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    resetText(doc);
    resetText(doc);
    doc.text(`weight ${Math.round(f.weight * 100)}%`, 130, fy);
    resetText(doc);
    doc.text(f.detail, 180, fy);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tone);
    resetText(doc);
    doc.text(`${Math.round(f.score)}`, W(doc) - 32, fy, { align: "right" });
    progressBar(doc, 32, fy + 4, W(doc) - 80, f.score / 100, tone, 6);
    fy += 22;
  });
  y += 282;

  // recommendations strip
  if (hs.recommendations.length) {
    panel(doc, 20, y, W(doc) - 40, 80, "Top Recommendations");
    bullet(doc, 32, y + 28, W(doc) - 64, hs.recommendations.slice(0, 3), PRIMARY);
  }
}

function periodCompare(input: ReportInput) {
  const cur = inRange(input.transactions, 30);
  const prev = inRange(input.transactions, 30, 30);
  const sum = (a: ReportTx[], pred: (t: ReportTx) => boolean) =>
    a.filter(pred).reduce((s, t) => s + Number(t.amount), 0);
  const curInc = sum(cur, (t) => t.type === "income");
  const curExp = sum(cur, (t) => t.type !== "income");
  const prevInc = sum(prev, (t) => t.type === "income");
  const prevExp = sum(prev, (t) => t.type !== "income");
  const curSav = curInc - curExp;
  const prevSav = prevInc - prevExp;
  return {
    curInc,
    curExp,
    curSav,
    prevInc,
    prevExp,
    prevSav,
    expDelta: curExp - prevExp,
    savDelta: curSav - prevSav,
    incDelta: curInc - prevInc,
  };
}

function pageExecutiveSummary(
  doc: Doc,
  input: ReportInput,
  hs: { score: number; grade: string },
  period: ReturnType<typeof periodCompare>,
) {
  brandedHeader(doc, "Executive Summary", "AI-written financial analysis based on your actual data.", input.tier);
  let y = 92;
  y = kpiRow(doc, y, [
    {
      label: "Income",
      value: fmt(input.stats.income, input.currency),
      sub: `${period.incDelta >= 0 ? "+" : "−"}${fmt(Math.abs(period.incDelta), input.currency)} vs prior`,
      tone: GOOD,
    },
    {
      label: "Expenses",
      value: fmt(input.stats.expenses, input.currency),
      sub: `${period.expDelta >= 0 ? "+" : "−"}${fmt(Math.abs(period.expDelta), input.currency)} vs prior`,
      tone: BAD,
    },
    {
      label: "Savings",
      value: fmt(input.stats.savings, input.currency),
      sub: `Rate ${pct(input.stats.savingsRate)}`,
      tone: input.stats.savings >= 0 ? GOOD : BAD,
    },
    {
      label: "Health Score",
      value: `${hs.score}/100`,
      sub: hs.grade,
      tone: hs.score >= 70 ? GOOD : hs.score >= 50 ? WARN : BAD,
    },
  ]);

  // AI narrative (300-500 words target)
  const narrative = buildExecutiveNarrative(input, hs, period);

  const lines = doc.splitTextToSize(narrative, W(doc) - 60);

  const narrativeHeight = Math.max(180, lines.length * 13 + 50);

  panel(doc, 20, y, W(doc) - 40, narrativeHeight, "AI Executive Overview");

  paragraph(doc, 30, y + 28, W(doc) - 60, narrative, {
    size: 9.5,
    lh: 13,
    color: SUBINK,
  });
}

function buildExecutiveNarrative(
  input: ReportInput,
  hs: { score: number; grade: string },
  p: ReturnType<typeof periodCompare>,
) {
  const name = (input.userName || "").split(" ")[0] || "there";
  const cur = input.currency;
  const cats = categoryDelta(input.transactions).sort((a, b) => b.current - a.current);
  const top = cats[0];
  const grew = [...cats].filter((c) => c.prior > 0).sort((a, b) => b.growth - a.growth)[0];
  const cut = [...cats].filter((c) => c.prior > 0).sort((a, b) => a.growth - b.growth)[0];
  const subs = detectSubs(input.transactions);
  const subTotal = subs.reduce((s, x) => s + x.amount, 0);
  const totalBudget = (input.budgets || []).reduce((s, b) => s + Number(b.monthly_limit), 0);
  const totalSpent = (input.budgets || []).reduce((s, b) => s + Number(b.spent_amount), 0);
  const budgetUse = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const breached = (input.budgets || []).filter((b) => Number(b.spent_amount) > Number(b.monthly_limit)).length;
  const goalsActive = input.goals.filter((g) => Number(g.current_amount) < Number(g.target_amount));
  const goalAvg = input.goals.length
    ? input.goals.reduce((s, g) => s + (Number(g.current_amount) / Math.max(1, Number(g.target_amount))) * 100, 0) /
      input.goals.length
    : 0;

  const parts: string[] = [];
  parts.push(
    `${name}, this period closed with ${fmt(input.stats.income, cur)} in income against ${fmt(input.stats.expenses, cur)} in expenses, producing ${fmt(input.stats.savings, cur)} in net savings (a rate of ${pct(input.stats.savingsRate)}). Compared with the prior 30 days, income moved ${p.incDelta >= 0 ? "up" : "down"} by ${fmt(Math.abs(p.incDelta), cur)} and spending moved ${p.expDelta >= 0 ? "up" : "down"} by ${fmt(Math.abs(p.expDelta), cur)}, ${p.savDelta >= 0 ? "expanding" : "compressing"} your savings buffer by ${fmt(Math.abs(p.savDelta), cur)}.`,
  );

  if (input.stats.savingsRate >= 20) {
    parts.push(
      `Your savings discipline is a clear strength — sustaining above 20% places you in the top quartile of users at your income tier and is the single most important driver of long-term net worth.`,
    );
  } else if (input.stats.savingsRate >= 10) {
    parts.push(
      `Your savings rate is in the healthy-but-improvable band. Pushing toward 20% would compound meaningfully: each 5-point lift translates to roughly ${fmt(input.stats.income * 0.05, cur)} more saved per month at current income.`,
    );
  } else {
    parts.push(
      `Savings rate is the weakest link this period and warrants direct attention. Even a small 5-point lift would free ${fmt(input.stats.income * 0.05, cur)} in monthly headroom for goals and emergency reserves.`,
    );
  }

  if (top) {
    parts.push(
      `Spending was concentrated in ${top.category} (${fmt(top.current, cur)}, ${pct((top.current / Math.max(1, input.stats.expenses)) * 100)} of total).`,
    );
    if (grew && grew.growth > 15)
      parts.push(
        `The fastest-rising category was ${grew.category}, up ${pct(grew.growth)} month-over-month — a clear signal to investigate before it compounds.`,
      );
    if (cut && cut.growth < -10)
      parts.push(
        `On the upside, ${cut.category} dropped ${pct(Math.abs(cut.growth))}, showing intentional restraint worth replicating elsewhere.`,
      );
  }

  if (input.budgets && input.budgets.length) {
    parts.push(
      `Across ${input.budgets.length} active budget${input.budgets.length > 1 ? "s" : ""} you used ${pct(budgetUse)} of the configured envelope${breached ? `, with ${breached} category${breached > 1 ? "ies" : "y"} breaching the cap` : ", staying inside every limit"}.`,
    );
  } else {
    parts.push(
      `No category budgets are currently configured. Defining envelopes for your top three spending buckets typically improves adherence by 30–40% within two cycles.`,
    );
  }

  if (goalsActive.length) {
    parts.push(
      `You are tracking ${input.goals.length} goal${input.goals.length > 1 ? "s" : ""} with an average progress of ${pct(goalAvg)}. At your current savings velocity, ${goalsActive.length} remain in active accumulation.`,
    );
  } else if (input.goals.length === 0) {
    parts.push(
      `No savings goals are defined. A 3–6 month emergency fund (≈ ${fmt(input.stats.expenses * 3, cur)} to ${fmt(input.stats.expenses * 6, cur)}) is the highest-leverage first target.`,
    );
  } else {
    parts.push(`Every defined goal has been reached — consider promoting a long-horizon investment goal next.`);
  }

  if (subs.length) {
    parts.push(
      `Subscription radar detected ${subs.length} recurring charge${subs.length > 1 ? "s" : ""} representing roughly ${fmt(subTotal, cur)} per month. Auditing the bottom-quartile services typically reclaims 10–20% of subscription spend without lifestyle impact.`,
    );
  }

  const risks: string[] = [];
  if (input.stats.savings < 0) risks.push("expenses exceeded income this period");
  if (breached > 0) risks.push(`${breached} budget overrun${breached > 1 ? "s" : ""}`);
  if (grew && grew.growth > 25) risks.push(`${grew.category} surge`);
  if (subTotal > input.stats.income * 0.15) risks.push("subscription burn above 15% of income");
  if (risks.length) parts.push(`Key risk indicators this period: ${risks.join("; ")}.`);

  parts.push(
    `Your composite Financial Health Score stands at ${hs.score}/100 (${hs.grade}). The following pages quantify each driver, model the next 30/90/365 days, and translate the analysis into a prioritized action plan.`,
  );

  return parts.join(" ");
}

function pageCashflow(doc: Doc, input: ReportInput) {
  brandedHeader(
    doc,
    "Cashflow Analysis",
    "Income, expenses and savings momentum across multiple horizons.",
    input.tier,
  );
  let y = 92;
  const weekly = weeklyTrend(input.transactions, 8);
  const monthly = monthlyTrend(input.transactions, 6);
  const quarterly = quarterlyTrend(input.transactions, 4);
  const yearly = yearlyTrend(input.transactions, 3);

  // top: monthly area
  panel(doc, 20, y, W(doc) - 40, 140, "Monthly Net Savings (6 months)");
  areaChart(
    doc,
    22,
    y + 18,
    W(doc) - 44,
    150,
    monthly.map((m) => m.savings),
    monthly.map((m) => m.name),
    GOOD,
    "Savings",
  );
  y += 152;

  // dual column: weekly net line + quarterly bars
  const hw = (W(doc) - 50) / 2;
  panel(doc, 20, y, hw, 130, "Weekly Net (8 weeks)");
  multiLine(
    doc,
    22,
    y + 16,
    hw - 4,
    140,
    [{ color: PRIMARY, label: "Net Cashflow", values: weekly.map((w) => w.net) }],
    weekly.map((w) => w.name),
  );
  panel(doc, 30 + hw, y, hw, 130, "Quarterly Income vs Expense");
  dualBars(
    doc,
    32 + hw,
    y + 16,
    hw - 4,
    140,
    quarterly.map((q) => ({ label: q.name, income: q.income, expense: q.expense })),
  );
  y += 142;

  // yearly trend
  panel(doc, 20, y, W(doc) - 40, 110, "Yearly Performance");
  dualBars(
    doc,
    22,
    y + 16,
    W(doc) - 44,
    88,
    yearly.map((yr) => ({ label: yr.name, income: yr.income, expense: yr.expense })),
  );
  y += 157;

  // narrative
  const lastSav = monthly[monthly.length - 1]?.savings || 0;
  const prevSav = monthly[monthly.length - 2]?.savings || 0;
  const delta = lastSav - prevSav;
  const avgWk = weekly.reduce((s, w) => s + w.net, 0) / Math.max(1, weekly.length);
  panel(doc, 20, y, W(doc) - 40, H(doc) - y - 40, "Cashflow Read");
  paragraph(
    doc,
    30,
    y + 26,
    W(doc) - 60,
    `Monthly savings landed at ${fmt(lastSav, input.currency)} — ${delta >= 0 ? "up" : "down"} ${fmt(Math.abs(delta), input.currency)} versus the prior month. Weekly net averaged ${fmt(avgWk, input.currency)} across the last 8 weeks, ${avgWk >= 0 ? "indicating positive accumulation velocity" : "showing a drawdown pattern worth reversing"}. ${delta >= 0 ? "Momentum is on your side — protect this trajectory by capping discretionary categories at current levels." : "Tightening the two largest discretionary categories next month is the fastest path to restoring positive momentum."}`,
    { size: 9, color: SUBINK },
  );
}

function pageCategoryIntel(doc: Doc, input: ReportInput) {
  brandedHeader(
    doc,
    "Category Intelligence",
    "Where every unit of currency flows, with trends and budget variance.",
    input.tier,
  );
  let y = 92;
  const items = [...input.categoryData].sort((a, b) => b.value - a.value);
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const deltas = categoryDelta(input.transactions);
  const cur30Total = deltas.reduce((s, d) => s + d.current, 0) || 1;

  panel(doc, 20, y, W(doc) - 40, 200, "Spending Distribution");
  donut(doc, 90, y + 110, 52, items.slice(0, 8));
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  resetText(doc);
  doc.text(fmt(total, input.currency), 90, y + 108, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  resetText(doc);
  doc.text("TOTAL", 90, y + 116, { align: "center" });
  // legend
  let ly = y + 28;
  items.slice(0, 8).forEach((it, i) => {
    const col = CAT_HEX[it.name] || palette(i);
    doc.setFillColor(...col);
    doc.roundedRect(170, ly - 5, 8, 8, 1.5, 1.5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(it.name, 184, ly);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    resetText(doc);
    doc.text(`${fmt(it.value, input.currency)} · ${pct((it.value / total) * 100)}`, W(doc) - 32, ly, {
      align: "right",
    });
    ly += 18;
  });
  y += 212;

  // intelligence cards: top / fastest-grow / most-reduced
  const fastest = [...deltas].filter((c) => c.prior > 0).sort((a, b) => b.growth - a.growth)[0];
  const reduced = [...deltas].filter((c) => c.prior > 0).sort((a, b) => a.growth - b.growth)[0];
  const top = items[0];
  const cw = (W(doc) - 60) / 3;
  (
    [
      [
        "Top Category",
        top?.name || "—",
        top ? `${fmt(top.value, input.currency)} · ${pct((top.value / cur30Total) * 100)} of spend` : "",
        PRIMARY,
      ],
      [
        "Fastest Growing",
        fastest?.category || "—",
        fastest ? `▲ ${pct(fastest.growth)} · +${fmt(fastest.delta, input.currency)}` : "Stable",
        WARN,
      ],
      [
        "Most Reduced",
        reduced?.category || "—",
        reduced ? `▼ ${pct(Math.abs(reduced.growth))} · −${fmt(Math.abs(reduced.delta), input.currency)}` : "Stable",
        GOOD,
      ],
    ] as [string, string, string, RGB][]
  ).forEach(([label, name, sub, c], i) => {
    const x = 20 + i * (cw + 10);
    panel(doc, x, y, cw, 76);
    doc.setFillColor(...c);
    doc.roundedRect(x, y, 3, 76, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    resetText(doc);
    doc.text(label.toUpperCase(), x + 12, y + 16);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(name, x + 12, y + 36);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...c);
    resetText(doc);
    doc.text(sub, x + 12, y + 56);
  });
  y += 86;

  // Budget variance table
  const budgets = input.budgets || [];

  const tableHeight = budgets.length ? Math.max(140, budgets.slice(0, 6).length * 24 + 50) : 120;

  panel(doc, 20, y, W(doc) - 40, tableHeight, "Budget Variance");
  if (!budgets.length) {
    paragraph(
      doc,
      30,
      y + 30,
      W(doc) - 60,
      "No category budgets configured. Define envelopes to unlock variance tracking and overrun alerts.",
      { color: MUTED },
    );
  } else {
    let by = y + 32;
    budgets.slice(0, 6).forEach((b) => {
      const lim = Number(b.monthly_limit);
      const sp = Number(b.spent_amount);
      const ratio = lim > 0 ? sp / lim : 0;
      const variance = sp - lim;
      const tone: RGB = ratio > 1 ? BAD : ratio > 0.85 ? WARN : GOOD;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      resetText(doc);
      doc.text(b.category, 32, by);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      resetText(doc);
      doc.text(`${fmt(sp, input.currency)} / ${fmt(lim, input.currency)}`, W(doc) - 110, by, { align: "right" });
      doc.setTextColor(...tone);
      doc.setFont("helvetica", "bold");
      resetText(doc);
      doc.text(`${variance >= 0 ? "+" : "−"}${fmt(Math.abs(variance), input.currency)}`, W(doc) - 32, by, {
        align: "right",
      });
      progressBar(doc, 32, by + 4, W(doc) - 64, Math.min(1.5, ratio), tone, 6);
      by += 26;
    });
  }
}

function pageGoalIntel(doc: Doc, input: ReportInput) {
  brandedHeader(
    doc,
    "Goal Intelligence",
    "Realistic ETAs, required contributions and completion probability.",
    input.tier,
  );
  let y = 92;
  if (input.goals.length === 0) {
    panel(doc, 20, y, W(doc) - 40, 145, "No Goals Defined");
    paragraph(
      doc,
      30,
      y + 36,
      W(doc) - 60,
      "Define an emergency fund (3–6 months of expenses) or a major savings goal to unlock pacing intelligence, ETA forecasts and completion probability scoring.",
      { color: MUTED },
    );
    return;
  }

  const fc = computeForecast({ transactions: input.transactions as never, goals: input.goals as never });
  const monthlySav = Math.max(0, input.stats.savings);
  const sharePer = input.goals.length > 0 ? monthlySav / input.goals.length : 0;

  input.goals.slice(0, 5).forEach((g: ReportGoal) => {
    const target = Number(g.target_amount);
    const current = Number(g.current_amount);
    const remaining = Math.max(0, target - current);
    const ratio = Math.min(1, current / Math.max(1, target));
    const requiredMonthly = g.deadline ? remaining / Math.max(1, monthsUntil(g.deadline)) : 0;
    // Realistic ETA — capped at 60 months when share is too small.
    let etaLabel = "Boost savings to unlock";
    let monthsETA: number | null = null;
    if (remaining === 0) etaLabel = "Achieved";
    else if (sharePer > 0) {
      monthsETA = remaining / sharePer;
      if (monthsETA > 60) etaLabel = "60+ months at current pace";
      else {
        const eta = new Date();
        eta.setMonth(eta.getMonth() + Math.ceil(monthsETA));
        etaLabel = eta.toLocaleDateString("en", { month: "short", year: "numeric" });
      }
    }
    // Probability: based on whether required-monthly fits inside per-goal share.
    let probability = 0;
    if (remaining === 0) probability = 100;
    else if (sharePer <= 0) probability = 10;
    else if (g.deadline) {
      const ratioCap = sharePer / Math.max(1, requiredMonthly);
      probability = Math.round(Math.max(5, Math.min(99, ratioCap * 100)));
    } else {
      probability = monthsETA && monthsETA <= 24 ? 85 : monthsETA && monthsETA <= 48 ? 60 : 35;
    }
    // Goal health 0-100
    const healthScore = Math.round(ratio * 50 + (probability / 100) * 50);
    // Risk
    const fcEntry = fc.goalCompletions.find((x: { name: string; risk?: string }) => x.name === g.goal_name);
    const risk = fcEntry?.risk || (probability >= 70 ? "low" : probability >= 40 ? "medium" : "high");
    const riskTone: RGB = risk === "low" ? GOOD : risk === "medium" ? WARN : BAD;

    panel(doc, 20, y, W(doc) - 40, 125);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(g.goal_name, 32, y + 20);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    resetText(doc);
    doc.text(
      `${g.category || "Goal"} · target ${fmt(target, input.currency)}${g.deadline ? ` · deadline ${g.deadline}` : ""}`,
      32,
      y + 32,
    );
    // risk pill
    doc.setFillColor(...riskTone);
    doc.roundedRect(W(doc) - 70, y + 14, 50, 14, 7, 7, "F");
    doc.setTextColor(...PAPER);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    resetText(doc);
    doc.text(`${risk.toUpperCase()} RISK`, W(doc) - 45, y + 23, { align: "center" });
    // progress bar
    progressBar(doc, 32, y + 42, W(doc) - 64, ratio, ACCENT, 6);
    doc.setFontSize(8);
    doc.setTextColor(...SUBINK);
    resetText(doc);
    doc.text(
      `${pct(ratio * 100)} complete · ${fmt(current, input.currency)} / ${fmt(target, input.currency)}`,
      32,
      y + 58,
    );
    // metrics row
    const mx = 32,
      my = y + 72;
    const colW = (W(doc) - 64) / 4;
    [
      ["ETA", etaLabel],
      [
        "Required / mo",
        requiredMonthly > 0 ? fmt(requiredMonthly, input.currency) : sharePer > 0 ? fmt(sharePer, input.currency) : "—",
      ],
      ["Probability", `${probability}%`],
      ["Goal Health", `${healthScore}/100`],
    ].forEach(([k, v], i) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED);
      resetText(doc);
      doc.text(k.toUpperCase(), mx + colW * i, my);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      resetText(doc);
      doc.text(v, mx + colW * i, my + 14);
    });
    y += 135;
  });
}

function monthsUntil(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()));
}

function pageTransactionIntel(doc: Doc, input: ReportInput) {
  brandedHeader(
    doc,
    "Transaction Intelligence",
    "Top transactions, merchant trends, recurring patterns and subscriptions.",
    input.tier,
  );
  let y = 92;

  const expenseTx = input.transactions.filter((t) => t.type !== "income");
  const top10 = [...expenseTx].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 10);
  const merchants = merchantStats(input.transactions);
  const mostFreq = [...merchants].sort((a, b) => b.count - a.count)[0];
  const highest = [...merchants].sort((a, b) => b.total - a.total)[0];
  const subs = detectSubs(input.transactions);
  const recurringCount = expenseTx.filter((t) => t.recurring).length;

  // top stats row
  y = kpiRow(doc, y, [
    {
      label: "Most Frequent Merchant",
      value: mostFreq?.name || "—",
      sub: mostFreq ? `${mostFreq.count} transactions` : "",
      tone: SKY,
    },
    {
      label: "Highest Spend Merchant",
      value: highest?.name || "—",
      sub: highest ? fmt(highest.total, input.currency) : "",
      tone: PINK,
    },
    {
      label: "Active Subscriptions",
      value: String(subs.length),
      sub: `${fmt(
        subs.reduce((s, x) => s + x.amount, 0),
        input.currency,
      )} / month`,
      tone: ACCENT,
    },
    { label: "Recurring Charges", value: String(recurringCount), sub: "flagged in last 60d", tone: WARN },
  ]);

  // top transactions table
  panel(doc, 20, y, W(doc) - 40, 160, "Top 10 Transactions");
  let ty = y + 28;
  top10.forEach((t, i) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SOFT);
    resetText(doc);
    doc.text(String(i + 1).padStart(2, "0"), 32, ty);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(t.title, 48, ty);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    resetText(doc);
    doc.text(`${t.category || "Other"} · ${t.transaction_date}`, 48, ty + 8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BAD);
    resetText(doc);
    doc.text(`−${fmt(Number(t.amount), input.currency)}`, W(doc) - 32, ty + 4, { align: "right" });
    ty += 13;
  });
  y += 172;

  // subs + merchant trends
  const cw = (W(doc) - 50) / 2;
  panel(doc, 20, y, cw, H(doc) - y - 40, "Detected Subscriptions");
  let sy = y + 28;
  if (!subs.length) {
    paragraph(doc, 30, sy + 4, cw - 20, "No recurring subscriptions detected from your transaction patterns.", {
      color: MUTED,
      size: 8,
    });
  } else {
    subs.slice(0, 7).forEach((s) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      resetText(doc);
      doc.text(s.name.slice(0, 24), 30, sy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.setFontSize(7.5);
      resetText(doc);
      doc.text(`${s.months.size} months · ~${fmt(s.amount, input.currency)}/mo`, 30, sy + 9);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...ACCENT);
      resetText(doc);
      doc.text(fmt(s.total, input.currency), 30 + cw - 16, sy + 4, { align: "right" });
      sy += 18;
    });
  }

  panel(doc, 30 + cw, y, cw, H(doc) - y - 40, "Merchant Trends (Top 8 by Spend)");
  let my = y + 28;
  [...merchants]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .forEach((m) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      resetText(doc);
      doc.text(m.name.slice(0, 22), 40 + cw, my);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.setFontSize(7.5);
      resetText(doc);
      doc.text(`${m.count} visits · avg ${fmt(m.total / m.count, input.currency)}`, 40 + cw, my + 9);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BAD);
      resetText(doc);
      doc.text(fmt(m.total, input.currency), 30 + cw * 2 - 16, my + 4, { align: "right" });
      my += 18;
    });
}

function pageForecast(doc: Doc, input: ReportInput) {
  brandedHeader(doc, "Forecast Engine", "30-day · 90-day · 12-month forward projections.", input.tier);
  let y = 92;
  const fc = computeForecast({ transactions: input.transactions as never, goals: input.goals as never });
  const m6 = monthlyTrend(input.transactions, 6);
  const avgInc = m6.reduce((s, m) => s + m.income, 0) / Math.max(1, m6.length);
  const avgExp = m6.reduce((s, m) => s + m.expense, 0) / Math.max(1, m6.length);
  const avgSav = avgInc - avgExp;

  // 30 / 90 / 12mo cards
  y = kpiRow(doc, y, [
    {
      label: "30-Day Spending",
      value: fmt(fc.nextMonthSpending.value, input.currency),
      sub: `Confidence ${Math.round(fc.nextMonthSpending.confidence * 100)}%`,
      tone: BAD,
    },
    {
      label: "30-Day Savings",
      value: fmt(fc.nextMonthSavings.value, input.currency),
      sub: `Confidence ${Math.round(fc.nextMonthSavings.confidence * 100)}%`,
      tone: fc.nextMonthSavings.value >= 0 ? GOOD : BAD,
    },
    {
      label: "90-Day Cash",
      value: fmt(fc.expectedCashBalance.value + avgSav * 2, input.currency),
      sub: "Projected balance",
      tone: PRIMARY,
    },
    { label: "12-Month Savings", value: fmt(avgSav * 12, input.currency), sub: "At current pace", tone: TEAL },
  ]);

  // savings projection chart
  const projected = [
    ...m6.map((m) => m.savings),
    fc.nextMonthSavings.value,
    fc.nextMonthSavings.value * 1.02,
    fc.nextMonthSavings.value * 1.04,
  ];
  const labels = [...m6.map((m) => m.name), "+1m", "+2m", "+3m"];
  panel(doc, 20, y, W(doc) - 40, 140, "Savings Projection (history → 90 days)");
  multiLine(
    doc,
    22,
    y + 18,
    W(doc) - 44,
    118,
    [
      {
        color: GOOD,
        label: "Historical",
        values: m6
          .map((m) => m.savings)
          .concat([NaN, NaN, NaN] as number[])
          .map((v) => (Number.isFinite(v) ? v : 0))
          .slice(0, m6.length)
          .concat([0, 0, 0]),
      },
      {
        color: PRIMARY,
        label: "Forecast",
        values: Array(m6.length - 1)
          .fill(0)
          .concat([
            m6[m6.length - 1]?.savings || 0,
            fc.nextMonthSavings.value,
            fc.nextMonthSavings.value * 1.02,
            fc.nextMonthSavings.value * 1.04,
          ]),
      },
    ],
    labels,
  );
  y += 152;

  // goal timeline
  panel(doc, 20, y, W(doc) - 40, 130, "Goal Completion Timeline");
  let gy = y + 28;
  if (!fc.goalCompletions.length) {
    paragraph(doc, 30, gy, W(doc) - 60, "Add goals to unlock per-goal completion forecasts.", { color: MUTED });
  } else {
    fc.goalCompletions.slice(0, 5).forEach((g: any) => {
      const tone: RGB = g.risk === "low" ? GOOD : g.risk === "medium" ? WARN : BAD;
      const etaTxt = !g.etaMonths
        ? "Boost savings to unlock"
        : g.etaMonths > 60
          ? "60+ months at current pace"
          : g.etaDate
            ? `ETA ${new Date(g.etaDate).toLocaleDateString("en", { month: "short", year: "numeric" })}`
            : "—";
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      resetText(doc);
      doc.text(g.name, 32, gy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      resetText(doc);
      doc.text(etaTxt, 32, gy + 10);
      doc.setFillColor(...tone);
      doc.roundedRect(W(doc) - 70, gy - 6, 50, 14, 7, 7, "F");
      doc.setTextColor(...PAPER);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      resetText(doc);
      doc.text(g.risk.toUpperCase(), W(doc) - 45, gy + 3, { align: "center" });
      gy += 22;
    });
  }
  y += 142;

  if (fc.risks.length && y < H(doc) - 60) {
    panel(doc, 20, y, W(doc) - 40, H(doc) - y - 40, "Risk Indicators");
    bullet(doc, 32, y + 28, W(doc) - 64, fc.risks.slice(0, 4), BAD);
  }
}

async function pageCoachIntel(doc: Doc, input: ReportInput) {
  brandedHeader(
    doc,
    "AI Coach Intelligence",
    "Topics, key insights and engagement metrics from your conversations with Lumo.",
    input.tier,
  );
  let y = 92;
  let history: { message: string; ai_response: string | null; created_at: string; persona: string | null }[] = [];
  let autoLogs: { action_taken: string; rule_name: string; amount_saved: number | null; created_at: string }[] = [];
  if (input.userId) {
    const [{ data: h }, { data: a }] = await Promise.all([
      supabase
        .from("ai_history")
        .select("message, ai_response, created_at, persona")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("automation_logs")
        .select("action_taken, rule_name, amount_saved, created_at")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    history = (h as typeof history) || [];
    autoLogs = (a as typeof autoLogs) || [];
  }

  // engagement KPIs
  const last30 = history.filter((h) => new Date(h.created_at) >= new Date(Date.now() - 30 * 86_400_000));
  const personasUsed = new Set(history.map((h) => h.persona).filter(Boolean));
  const avgLen = history.length
    ? Math.round(history.reduce((s, h) => s + (h.message?.length || 0), 0) / history.length)
    : 0;

  y = kpiRow(doc, y, [
    { label: "Total Conversations", value: String(history.length), sub: `${last30.length} in last 30d`, tone: PRIMARY },
    {
      label: "Personas Engaged",
      value: String(personasUsed.size || 0),
      sub: Array.from(personasUsed).slice(0, 2).join(", ") || "—",
      tone: ACCENT,
    },
    {
      label: "Avg Question Length",
      value: `${avgLen} chars`,
      sub: avgLen > 80 ? "Detailed prompts" : "Concise prompts",
      tone: TEAL,
    },
    {
      label: "Automations Run",
      value: String(autoLogs.length),
      sub: `${fmt(
        autoLogs.reduce((s, a) => s + (Number(a.amount_saved) || 0), 0),
        input.currency,
      )} saved`,
      tone: GOOD,
    },
  ]);

  // topic extraction via keyword frequency
  const topicKeywords: Record<string, string[]> = {
    Budgeting: ["budget", "limit", "envelope", "overspend"],
    Saving: ["save", "saving", "savings", "emergency"],
    Goals: ["goal", "target", "milestone", "achieve"],
    Investing: ["invest", "stock", "mutual", "etf", "portfolio", "sip"],
    Subscriptions: ["subscription", "netflix", "spotify", "recurring", "cancel"],
    Debt: ["debt", "loan", "emi", "credit card", "interest"],
    Income: ["income", "salary", "raise", "side"],
    Spending: ["spend", "expense", "spent", "where", "category"],
    Forecasting: ["forecast", "predict", "future", "next month"],
    Taxes: ["tax", "filing", "deduction", "section 80"],
  };
  const topicCounts = new Map<string, number>();
  history.forEach((h) => {
    const text = `${h.message || ""} ${h.ai_response || ""}`.toLowerCase();
    Object.entries(topicKeywords).forEach(([topic, kws]) => {
      if (kws.some((k) => text.includes(k))) topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
  });
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // two columns
  const cw = (W(doc) - 50) / 2;
  panel(doc, 20, y, cw, 160, "Top Financial Topics Discussed");
  if (!topTopics.length) {
    paragraph(
      doc,
      30,
      y + 36,
      cw - 20,
      "No coach conversations recorded yet. Open Lumo and ask a financial question to seed your personalized advisor.",
      { color: MUTED, size: 8 },
    );
  } else {
    const max = topTopics[0][1];
    let ty = y + 32;
    topTopics.forEach(([topic, count], i) => {
      const tone = palette(i);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      resetText(doc);
      doc.text(topic, 30, ty);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      resetText(doc);
      doc.text(`${count} mention${count > 1 ? "s" : ""}`, 30 + cw - 16, ty, { align: "right" });
      progressBar(doc, 30, ty + 4, cw - 20, count / max, tone, 6);
      ty += 18;
    });
  }

  // most asked questions (frequency by first 4 words pattern)
  panel(doc, 30 + cw, y, cw, 160, "Most Asked Questions");
  const qMap = new Map<string, { question: string; count: number }>();
  history.forEach((h) => {
    if (!h.message) return;
    const key = h.message.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
    const cur = qMap.get(key) || { question: h.message, count: 0 };
    cur.count += 1;
    qMap.set(key, cur);
  });
  const topQs = Array.from(qMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  let qy = y + 32;
  if (!topQs.length) {
    paragraph(doc, 40 + cw, qy + 4, cw - 20, "No questions recorded yet.", { color: MUTED, size: 8 });
  } else {
    topQs.forEach((q) => {
      doc.setFillColor(...PRIMARY);
      doc.circle(40 + cw, qy - 2, 1.4, "F");
      const lines = doc.splitTextToSize(`"${q.question.slice(0, 90)}${q.question.length > 90 ? "…" : ""}"`, cw - 30);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...SUBINK);
      resetText(doc);
      resetText(doc);
      doc.text(lines, 46 + cw, qy);
      if (q.count > 1) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...MUTED);
        resetText(doc);
        doc.text(`×${q.count}`, 40 + cw + cw - 24, qy, { align: "right" });
      }
      qy += lines.length * 11 + 6;
    });
  }
  y += 172;

  // key insights + personalized recommendations
  panel(doc, 20, y, W(doc) - 40, H(doc) - y - 40, "Key Insights & Personalized Recommendations");
  const insights: string[] = [];
  if (last30.length >= 5)
    insights.push(
      `Active engagement — ${last30.length} conversations in the last 30 days indicate strong financial intentionality.`,
    );
  else if (history.length > 0)
    insights.push(
      `Engagement is light (${last30.length} conversations / 30d). Weekly check-ins compound coaching value.`,
    );
  if (topTopics[0])
    insights.push(
      `Primary focus area: ${topTopics[0][0]} (${topTopics[0][1]} mentions). Lumo will continue prioritizing this domain.`,
    );
  if (topTopics.find(([t]) => t === "Saving" || t === "Goals") && input.stats.savingsRate < 15)
    insights.push(
      `You ask about saving and goals frequently, yet your savings rate is ${pct(input.stats.savingsRate)} — execution gap worth closing.`,
    );
  if (autoLogs.length)
    insights.push(
      `${autoLogs.length} automation${autoLogs.length > 1 ? "s have" : " has"} fired this period, saving an aggregated ${fmt(
        autoLogs.reduce((s, a) => s + (Number(a.amount_saved) || 0), 0),
        input.currency,
      )}.`,
    );
  if (personasUsed.size > 1)
    insights.push(
      `You consult ${personasUsed.size} personas — diverse coaching styles correlate with better adherence.`,
    );
  if (!insights.length)
    insights.push(
      "Once you accumulate more conversation history, this section will surface engagement patterns and gap analyses.",
    );
  bullet(doc, 30, y + 28, W(doc) - 60, insights.slice(0, 6), PRIMARY);
}

function pageActionPlan(doc: Doc, input: ReportInput, score: number) {
  brandedHeader(
    doc,
    "Financial Action Plan",
    "Prioritized roadmap for the next 90 days, derived from your data.",
    input.tier,
  );
  let y = 92;
  const subs = detectSubs(input.transactions);
  const subTotal = subs.reduce((s, x) => s + x.amount, 0);
  const top = [...input.categoryData].sort((a, b) => b.value - a.value)[0];
  const breached = (input.budgets || []).filter((b) => Number(b.spent_amount) > Number(b.monthly_limit));
  const lagging = input.goals.find((g) => Number(g.current_amount) / Math.max(1, Number(g.target_amount)) < 0.4);

  const immediate: string[] = [];
  if (subs.length)
    immediate.push(
      `Audit the ${subs.length} detected subscription${subs.length > 1 ? "s" : ""} (~${fmt(subTotal, input.currency)}/mo) — cancel anything unused in 30 days.`,
    );
  if (breached.length)
    immediate.push(
      `Reset overspent budgets: ${breached
        .slice(0, 3)
        .map((b) => b.category)
        .join(", ")}. Reduce next month's cap by 10% or raise it deliberately.`,
    );
  if (top)
    immediate.push(
      `Set a one-month cap on ${top.name} at ${fmt(top.value * 0.85, input.currency)} (15% reduction from current).`,
    );
  if (input.stats.savings > 0)
    immediate.push(
      `Automate a ${fmt(input.stats.savings * 0.2, input.currency)} transfer to savings within 7 days to lock in this month's progress.`,
    );

  const thirty: string[] = [];
  if (input.stats.savingsRate < 20)
    thirty.push(
      `Lift savings rate from ${pct(input.stats.savingsRate)} toward ${pct(Math.max(20, input.stats.savingsRate + 5))} — target ${fmt(input.stats.income * 0.05, input.currency)} additional saved.`,
    );
  if (input.goals.length === 0)
    thirty.push(
      `Open an Emergency Fund goal: target ${fmt(input.stats.expenses * 3, input.currency)} (3 months of expenses).`,
    );
  else if (lagging)
    thirty.push(
      `Accelerate "${lagging.goal_name}": increase contribution by ${fmt(Math.max(500, Number(lagging.target_amount) * 0.02), input.currency)}/month.`,
    );
  thirty.push("Enable automation rules for budget alerts on your top 3 spending categories.");
  if (input.transactions.filter((t) => t.recurring).length === 0)
    thirty.push("Flag recurring expenses in the transactions log to power subscription radar.");

  const ninety: string[] = [];
  ninety.push(
    `Lift Financial Health Score from ${score} toward ${Math.min(100, score + 15)} (focus on the 3 lowest factors first).`,
  );
  ninety.push("Build a quarterly subscription audit cadence and remove low-value services.");
  if (input.goals.length > 0) ninety.push("Add an aspirational long-horizon goal (5+ years) to compound returns.");
  ninety.push("Diversify income — explore one recurring secondary revenue stream over the quarter.");

  const sections: { title: string; tone: RGB; items: string[] }[] = [
    {
      title: "Immediate (this week)",
      tone: BAD,
      items: immediate.length ? immediate : ["No urgent actions detected — maintain current cadence."],
    },
    { title: "30-Day Actions", tone: WARN, items: thirty },
    { title: "90-Day Strategy", tone: GOOD, items: ninety },
  ];
  sections.forEach((s) => {
    const h = 34 + s.items.length * 17;
    panel(doc, 20, y, W(doc) - 40, h);
    doc.setFillColor(...s.tone);
    doc.roundedRect(20, y, 3, h, 1.5, 1.5, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    resetText(doc);
    doc.text(s.title, 32, y + 20);
    let iy = y + 36;
    s.items.forEach((it) => {
      doc.setFillColor(...s.tone);
      doc.circle(36, iy - 2.5, 1.4, "F");
      iy = paragraph(doc, 42, iy, W(doc) - 74, it, { size: 9, color: SUBINK }) + 4;
    });
    y += h + 8;
  });
}

// ===== entry =================================================================
export async function exportReport(input: ReportInput): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const hs = computeHealthScore({
    transactions: input.transactions as never,
    goals: input.goals as never,
    budgets: (input.budgets || []) as never,
  });
  const period = periodCompare(input);

  pageCover(doc, input, hs.score, hs.grade);
  doc.addPage();
  pageHealthBreakdown(doc, input, hs);
  doc.addPage();
  pageExecutiveSummary(doc, input, hs, period);
  doc.addPage();
  pageCashflow(doc, input);
  doc.addPage();
  pageCategoryIntel(doc, input);
  doc.addPage();
  pageGoalIntel(doc, input);
  doc.addPage();
  pageTransactionIntel(doc, input);
  doc.addPage();
  pageForecast(doc, input);
  doc.addPage();
  await pageCoachIntel(doc, input);
  doc.addPage();
  pageActionPlan(doc, input, hs.score);

  pageFooter(doc);
  void autoTable; // available for future tabular pages
  void safe;

  const filename = `FinTrack-${input.kind}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
