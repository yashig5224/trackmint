import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Sparkles, TrendingUp, Wallet, Bell, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { lumoAvatar } from "@/assets/personas";

type Msg = { id: number; role: "user" | "ai"; text: string; chart?: number[] };

const SCRIPT: Msg[] = [
  { id: 1, role: "user", text: "How much did I spend on food this week?" },
  { id: 2, role: "ai", text: "You spent ₹4,820 on food this week — 22% above your usual baseline. Mostly weekend dining.", chart: [30, 45, 28, 60, 75, 90, 70] },
  { id: 3, role: "user", text: "Can I afford a Goa trip in March?" },
  { id: 4, role: "ai", text: "Yes — at your current savings pace you'll have ₹38,400 free by March. A 3-day Goa trip fits comfortably." },
];

const NOTIFS = [
  { icon: Wallet, tint: "from-[hsl(25,100%,90%)] to-[hsl(15,100%,92%)]", text: "Starbucks", sub: "-₹350 · just now", color: "text-[hsl(20,80%,40%)]", side: "left", top: "8%" },
  { icon: TrendingUp, tint: "from-[hsl(150,80%,90%)] to-[hsl(170,80%,92%)]", text: "+₹2,400 saved", sub: "this week", color: "text-[hsl(150,70%,32%)]", side: "right", top: "14%" },
  { icon: Bell, tint: "from-[hsl(260,80%,92%)] to-[hsl(280,80%,94%)]", text: "Netflix detected", sub: "Recurring ₹649/mo", color: "text-[hsl(270,70%,45%)]", side: "left", top: "62%" },
  { icon: Sparkles, tint: "from-[hsl(220,100%,92%)] to-[hsl(200,100%,94%)]", text: "Lumo insight", sub: "Cut dining 18%", color: "text-[hsl(220,80%,45%)]", side: "right", top: "70%" },
  { icon: ArrowDownRight, tint: "from-[hsl(340,80%,93%)] to-[hsl(320,80%,95%)]", text: "Amazon", sub: "-₹1,299 · today", color: "text-[hsl(340,70%,42%)]", side: "right", top: "40%" },
  { icon: ArrowUpRight, tint: "from-[hsl(150,80%,92%)] to-[hsl(170,80%,94%)]", text: "Salary credited", sub: "+₹85,000", color: "text-[hsl(150,70%,32%)]", side: "left", top: "36%" },
];

const HeroPhone = () => {
  const [shown, setShown] = useState<Msg[]>([SCRIPT[0]]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (step >= SCRIPT.length) {
      const reset = setTimeout(() => { setShown([SCRIPT[0]]); setStep(1); }, 7000);
      return () => clearTimeout(reset);
    }
    const next = SCRIPT[step];
    const delay = next.role === "ai" ? 900 : 1600;
    const t1 = setTimeout(() => { if (next.role === "ai") setTyping(true); }, delay - 600);
    const t2 = setTimeout(() => {
      setTyping(false);
      setShown((p) => [...p, next]);
      setStep((s) => s + 1);
    }, delay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step]);

  return (
    <div className="relative h-[520px] sm:h-[600px] lg:h-[660px] flex items-center justify-center">
      {/* Halo */}
      <div className="absolute inset-0 m-auto w-[440px] h-[440px] rounded-full bg-gradient-to-br from-[hsl(220,100%,90%,0.55)] via-[hsl(260,100%,92%,0.45)] to-[hsl(150,80%,90%,0.45)] blur-3xl" />

      {/* Phone */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-20"
      >
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
          <div className="relative w-[290px] sm:w-[320px] h-[580px] sm:h-[620px] rounded-[3rem] bg-gradient-to-b from-[hsl(230,30%,92%)] to-[hsl(250,30%,88%)] p-[6px] shadow-[0_40px_100px_-30px_rgba(120,90,220,0.45),0_20px_50px_-20px_rgba(80,80,180,0.25)]">
            <div className="absolute inset-[6px] rounded-[2.7rem] bg-black/5" />
            <div className="relative w-full h-full rounded-[2.7rem] bg-gradient-to-b from-white to-[hsl(220,40%,98%)] overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[hsl(230,20%,15%)] rounded-b-2xl z-30" />

              {/* Status bar */}
              <div className="relative z-10 px-6 pt-3 pb-2 flex items-center justify-between text-[10px] font-semibold text-foreground/70">
                <span>9:41</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1.5 rounded-sm bg-foreground/60" />
                  <span className="w-3 h-1.5 rounded-sm bg-foreground/60" />
                  <span className="w-4 h-2 rounded-sm border border-foreground/60" />
                </span>
              </div>

              {/* Chat header */}
              <div className="relative z-10 px-4 pt-3 pb-3 flex items-center gap-2.5 border-b border-foreground/5">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(200,90%,85%)] to-[hsl(280,80%,88%)] p-[2px]">
                  <img src={lumoAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-1 rounded-full border border-[hsl(150,80%,55%)]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[hsl(150,80%,55%)] border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold tracking-tight">Lumo AI</div>
                  <div className="text-[9px] text-foreground/55">Your finance coach · online</div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[hsl(150,80%,92%)] to-[hsl(170,80%,90%)] text-[9px] font-semibold text-[hsl(150,70%,30%)]">
                  AI
                </div>
              </div>

              {/* Messages */}
              <div className="relative z-10 px-3 py-3 space-y-2 h-[400px] sm:h-[430px] overflow-hidden">
                <AnimatePresence initial={false}>
                  {shown.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] px-3 py-2 text-[11px] leading-snug ${
                          m.role === "user"
                            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-[hsl(220,90%,58%)] to-[hsl(260,80%,62%)] text-white shadow-[0_6px_20px_-8px_rgba(120,90,220,0.5)]"
                            : "rounded-2xl rounded-bl-md bg-[hsl(220,30%,97%)] text-foreground border border-white"
                        }`}
                      >
                        <div>{m.text}</div>
                        {m.chart && (
                          <div className="mt-2 flex items-end gap-1 h-8">
                            {m.chart.map((h, i) => (
                              <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                                className="flex-1 rounded-t bg-gradient-to-t from-[hsl(220,90%,70%)] to-[hsl(260,85%,75%)]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {typing && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-start"
                    >
                      <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-[hsl(220,30%,97%)] border border-white flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 rounded-full bg-foreground/40"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Suggestion chips */}
              <div className="relative z-10 px-3 pb-2 flex gap-1.5 overflow-hidden">
                {["Where am I overspending?", "Plan a trip", "Save more"].map((t) => (
                  <span key={t} className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-foreground/10 text-[9px] text-foreground/65 shadow-sm">
                    {t}
                  </span>
                ))}
              </div>

              {/* Input bar */}
              <div className="absolute bottom-0 inset-x-0 px-3 pb-4 pt-2 bg-gradient-to-t from-white via-white to-transparent">
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-foreground/10 shadow-sm">
                  <input
                    readOnly
                    placeholder="Ask Lumo anything…"
                    className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-foreground/40"
                  />
                  <Mic className="w-3.5 h-3.5 text-foreground/40" />
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(220,90%,58%)] to-[hsl(280,80%,62%)] flex items-center justify-center">
                    <Send className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating transaction notifications (no emojis) */}
      {NOTIFS.map((n, i) => {
        const Icon = n.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`absolute z-30 hidden sm:block ${n.side === "left" ? "-left-4 lg:-left-10" : "-right-4 lg:-right-10"}`}
            style={{ top: n.top }}
          >
            <motion.div
              animate={{ y: [0, -8 - (i % 3) * 2, 0] }}
              transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
              className="rounded-2xl bg-white/90 backdrop-blur-xl border border-white shadow-[0_14px_34px_-12px_rgba(120,90,220,0.28)] px-3 py-2.5 min-w-[150px]"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${n.tint} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${n.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold truncate">{n.text}</div>
                  <div className="text-[10px] text-foreground/55 truncate">{n.sub}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Orbit ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 m-auto w-[440px] h-[440px] rounded-full border border-dashed border-[hsl(260,40%,80%,0.35)] hidden lg:block pointer-events-none"
      />
    </div>
  );
};

export default HeroPhone;
