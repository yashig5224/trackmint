// Lumo Voice AI — fullscreen futuristic voice assistant.
// Pro tier: voice-to-text only (transcript sent back to chat).
// Elite tier: full conversational mode with spoken AI replies via TTS.
// Uses the browser Web Speech API (SpeechRecognition + speechSynthesis) — no extra keys.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, VolumeX, Settings2, Sparkles, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanTier } from "@/hooks/useSubscription";

type Turn = { role: "user" | "ai"; text: string; id: number };
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  open: boolean;
  onClose: () => void;
  tier: PlanTier;
  persona: { id: string; name: string };
  selectedModel: string;
  // When the user finishes a voice utterance, also push it into the parent chat.
  onTranscript?: (text: string) => void;
  // Initial chat history (last few turns) to give the voice convo context.
  seedHistory?: { role: "user" | "ai"; text: string }[];
}

// Minimal typings for the browser Speech API
type AnyRecognition = any;

function getRecognition(): AnyRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = false;
  return r;
}

function pickVoice(preferredName?: string): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices?.length) return undefined;
  if (preferredName) {
    const m = voices.find((v) => v.name === preferredName);
    if (m) return m;
  }
  // Prefer a premium-sounding English voice
  return (
    voices.find((v) => /en-(US|GB)/i.test(v.lang) && /(Google|Samantha|Aria|Jenny|Natasha)/i.test(v.name)) ||
    voices.find((v) => /en-(US|GB)/i.test(v.lang)) ||
    voices[0]
  );
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, "")
    .replace(/[#>*_~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const LumoVoiceMode = ({ open, onClose, tier, persona, selectedModel, onTranscript, seedHistory = [] }: Props) => {
  const isElite = tier === "elite";
  const canUse = tier === "pro" || tier === "elite";

  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | undefined>(undefined);
  const [rate, setRate] = useState(1.0);
  const [autoSpeak, setAutoSpeak] = useState(isElite);
  const [amplitude, setAmplitude] = useState(0.4);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const recRef = useRef<AnyRecognition | null>(null);
  const nextId = useRef(1);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  // Load voices (async on some browsers)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const update = () => {
      const v = window.speechSynthesis.getVoices();
      setVoicesReady(v.length > 0);
      if (!selectedVoiceName) {
        const picked = pickVoice();
        if (picked) setSelectedVoiceName(picked.name);
      }
    };
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => { try { window.speechSynthesis.onvoiceschanged = null as any; } catch {} };
  }, [selectedVoiceName]);

  // Synthetic amplitude animator (since we don't analyse mic frequency to keep this minimal)
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.08;
      const base = state === "listening" ? 0.55 : state === "speaking" ? 0.75 : state === "thinking" ? 0.45 : 0.3;
      const wobble = Math.sin(t) * 0.15 + Math.sin(t * 2.3) * 0.08;
      setAmplitude(Math.max(0.15, base + wobble));
      raf = requestAnimationFrame(tick);
    };
    if (open) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, state]);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  const speak = useCallback((text: string) => {
    if (!isElite || !autoSpeak) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stopSpeaking();
    const clean = stripMarkdown(text).slice(0, 600);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    const voice = pickVoice(selectedVoiceName);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1;
    u.onstart = () => setState("speaking");
    u.onend = () => setState((s) => (s === "speaking" ? "idle" : s));
    u.onerror = () => setState("idle");
    window.speechSynthesis.speak(u);
  }, [isElite, autoSpeak, selectedVoiceName, rate, stopSpeaking]);

  const askLumo = useCallback(async (userText: string) => {
    setState("thinking");
    // Note: in elite mode we keep the voice conversation self-contained
    // so we don't double-fire the parent's sendMessage (which also calls ai-router).

    const history = [
      ...seedHistory.slice(-6),
      ...turnsRef.current.slice(-6).map((t) => ({ role: t.role, text: t.text })),
    ];

    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          message: userText,
          model: selectedModel,
          persona,
          history,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const aiText: string = data?.text || "I'm here. Could you say that again?";
      const id = nextId.current++;
      setTurns((p) => [...p, { id, role: "ai", text: aiText }]);
      if (isElite && autoSpeak) speak(aiText);
      else setState("idle");
    } catch (e: any) {
      console.error("voice ai-router error", e);
      toast.error("Voice AI couldn't reach Lumo. Try again.");
      setState("idle");
    }
  }, [onTranscript, seedHistory, selectedModel, persona, isElite, autoSpeak, speak]);

  const finishUtterance = useCallback((finalText: string) => {
    const text = finalText.trim();
    setPartial("");
    setTranscript("");
    if (!text) { setState("idle"); return; }
    const id = nextId.current++;
    setTurns((p) => [...p, { id, role: "user", text }]);
    if (isElite) {
      askLumo(text);
    } else {
      // Pro: voice-input only — just push to parent and close listening state
      onTranscript?.(text);
      setState("idle");
      toast.success("Sent to Lumo");
    }
  }, [isElite, askLumo, onTranscript]);

  const startListening = useCallback(() => {
    if (!canUse) return;
    stopSpeaking();
    if (recRef.current) { try { recRef.current.stop(); } catch {} }
    const rec = getRecognition();
    if (!rec) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    recRef.current = rec;
    let finalText = "";
    rec.onstart = () => setState("listening");
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setPartial(interim);
      setTranscript(finalText);
    };
    rec.onerror = (ev: any) => {
      console.error("speech error", ev?.error);
      if (ev?.error === "not-allowed") toast.error("Microphone permission denied.");
      else if (ev?.error !== "no-speech") toast.error("Voice error — try again.");
      setState("idle");
    };
    rec.onend = () => {
      finishUtterance(finalText);
    };
    try { rec.start(); } catch { }
  }, [canUse, stopSpeaking, finishUtterance]);

  const stopListening = useCallback(() => {
    try { recRef.current?.stop(); } catch { }
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      try { recRef.current?.abort?.(); } catch { }
      stopSpeaking();
      setState("idle");
      setPartial("");
      setTranscript("");
    }
  }, [open, stopSpeaking]);

  const stateLabel = useMemo(() => {
    if (!canUse) return "Voice AI is an Elite feature";
    switch (state) {
      case "listening": return "Listening…";
      case "thinking": return "Lumo is thinking…";
      case "speaking": return "Lumo is speaking…";
      default: return isElite ? "Tap to talk with Lumo" : "Tap to dictate to Lumo";
    }
  }, [state, canUse, isElite]);

  const voices = (typeof window !== "undefined" && window.speechSynthesis?.getVoices()) || [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50/80 to-violet-100/70 backdrop-blur-2xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          {/* Floating ambient blobs */}
          <motion.div
            aria-hidden
            className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-indigo-300/40 blur-3xl"
            animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-full bg-violet-300/40 blur-3xl"
            animate={{ x: [0, -30, 20, 0], y: [0, -20, 10, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 px-5 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest font-semibold text-indigo-600">Lumo Voice AI</div>
                <div className="text-[11px] text-slate-500">
                  {isElite ? "Elite · Live conversation" : tier === "pro" ? "Pro · Voice dictation" : "Locked"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isElite && (
                <button
                  onClick={() => setAutoSpeak((s) => !s)}
                  className="w-9 h-9 rounded-xl bg-white/70 border border-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition"
                  title={autoSpeak ? "Mute voice replies" : "Unmute voice replies"}
                >
                  {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => setSettingsOpen((s) => !s)}
                className="w-9 h-9 rounded-xl bg-white/70 border border-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition"
                title="Voice settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/70 border border-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute top-16 right-5 z-20 w-80 p-4 rounded-2xl bg-white/90 backdrop-blur border border-white shadow-xl"
              >
                <div className="text-sm font-semibold text-slate-900 mb-3">Voice settings</div>
                <label className="text-xs text-slate-500">Voice</label>
                <select
                  value={selectedVoiceName ?? ""}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="mt-1 w-full text-sm rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                  disabled={!voicesReady}
                >
                  {voices.filter((v) => /en/i.test(v.lang)).map((v) => (
                    <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>
                  ))}
                </select>
                <label className="text-xs text-slate-500 mt-3 block">Speed · {rate.toFixed(1)}x</label>
                <input
                  type="range" min={0.7} max={1.4} step={0.1} value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full"
                />
                {isElite && (
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
                    Enable spoken replies
                  </label>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center — Orb + waveform */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-2xl text-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
              {/* Outer glow rings */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, hsla(244,84%,62%,0.18), transparent 60%)",
                  }}
                  animate={{
                    scale: 1 + amplitude * 0.4 + i * 0.12,
                    opacity: state === "idle" ? 0.4 - i * 0.1 : 0.7 - i * 0.15,
                  }}
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                />
              ))}
              {/* Orb core */}
              <motion.div
                className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full shadow-[0_30px_80px_-20px_rgba(99,102,241,0.6)] overflow-hidden"
                style={{
                  background:
                    "conic-gradient(from 180deg, #818cf8, #a78bfa, #38bdf8, #818cf8)",
                }}
                animate={{ rotate: 360, scale: 1 + amplitude * 0.06 }}
                transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, scale: { type: "spring", stiffness: 100, damping: 15 } }}
              >
                <div className="absolute inset-2 rounded-full bg-white/40 backdrop-blur-md" />
                <div className="absolute inset-6 rounded-full bg-gradient-to-br from-white/80 to-indigo-100/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {state === "thinking" ? (
                    <Loader2 className="w-10 h-10 text-indigo-700 animate-spin" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-indigo-700" />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Waveform */}
            <div className="flex items-end gap-1.5 h-16">
              {Array.from({ length: 28 }).map((_, i) => {
                const phase = (i / 28) * Math.PI * 2;
                const h = state === "idle"
                  ? 8 + Math.sin(phase) * 4
                  : 14 + Math.abs(Math.sin(phase + amplitude * 5)) * 36 * amplitude;
                return (
                  <motion.span
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 to-violet-500"
                    animate={{ height: h }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  />
                );
              })}
            </div>

            <div className="min-h-[3rem]">
              <div className="text-lg sm:text-xl font-display font-semibold text-slate-900">{stateLabel}</div>
              {(partial || transcript) && (
                <div className="mt-1 text-sm text-slate-600 max-w-xl">
                  <span className="text-slate-900">{transcript}</span>
                  <span className="text-slate-400"> {partial}</span>
                </div>
              )}
            </div>

            {/* Big mic button */}
            <div className="flex items-center gap-4">
              {state === "speaking" && (
                <button
                  onClick={stopSpeaking}
                  className="px-4 h-12 rounded-2xl bg-white/80 border border-white shadow text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Stop speaking
                </button>
              )}
              <motion.button
                onClick={state === "listening" ? stopListening : startListening}
                disabled={!canUse || state === "thinking"}
                whileTap={{ scale: 0.94 }}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-[0_15px_40px_-10px_rgba(99,102,241,0.7)] transition-colors disabled:opacity-50 ${
                  state === "listening"
                    ? "bg-gradient-to-br from-rose-500 to-pink-600"
                    : "bg-gradient-to-br from-indigo-600 to-violet-600"
                }`}
                aria-label={state === "listening" ? "Stop listening" : "Start listening"}
              >
                {state === "listening" && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-rose-400/40"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                )}
                {state === "listening" ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </motion.button>
              {turns.length > 0 && (
                <button
                  onClick={() => setTurns([])}
                  className="px-4 h-12 rounded-2xl bg-white/80 border border-white shadow text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Clear
                </button>
              )}
            </div>

            {!canUse && (
              <div className="text-xs text-slate-500 max-w-sm">
                Voice AI unlocks on Pro (dictation) and Elite (full live conversation with spoken replies).
              </div>
            )}
          </div>

          {/* Live transcript log */}
          {turns.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl max-h-44 overflow-y-auto rounded-2xl bg-white/70 backdrop-blur border border-white shadow-md p-3 z-10">
              <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-widest text-slate-500">
                <MessageSquare className="w-3.5 h-3.5" /> Live conversation
              </div>
              <div className="space-y-1.5">
                {turns.slice(-6).map((t) => (
                  <div key={t.id} className="text-sm">
                    <span className={`font-semibold ${t.role === "user" ? "text-slate-900" : "text-indigo-700"}`}>
                      {t.role === "user" ? "You" : "Lumo"}:
                    </span>{" "}
                    <span className="text-slate-700">{stripMarkdown(t.text).slice(0, 180)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LumoVoiceMode;
