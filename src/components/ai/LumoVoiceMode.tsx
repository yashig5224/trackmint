// Lumo Voice AI — production voice assistant lifecycle.
// Browser STT + browser TTS, routed through the server-side ai-router.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Clock3,
  Crown,
  Loader2,
  Lock,
  Mic,
  MicOff,
  MessageSquare,
  Radio,
  RefreshCw,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/hooks/useSubscription";
import { lumoAvatar } from "@/assets/personas";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

type SpeechRecognitionResultLike = { isFinal: boolean; 0?: { transcript?: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: { length: number; [index: number]: SpeechRecognitionResultLike } };
type SpeechRecognitionErrorLike = { error?: string };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onspeechend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type VoiceRole = "user" | "ai";

type Turn = {
  id: number;
  role: VoiceRole;
  text: string;
  timestamp: number;
  provider?: string;
  providerLabel?: string;
  model?: string;
  latencyMs?: number;
  tokens?: number | null;
};

type VoiceError = {
  title: string;
  detail: string;
  hint?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  tier: PlanTier;
  persona: { id: string; name: string };
  selectedModel: string;
  onTranscript?: (text: string) => void;
  seedHistory?: { role: "user" | "ai"; text: string }[];
}

const lumoVoiceProfile = {
  name: "Lumo",
  avatar: lumoAvatar || "/lumo-avatar.png",
  voiceType: "warm-ai",
  accent: "neutral",
  animationMode: "reactive",
};

const PRO_DAILY_VOICE_SECONDS = 10 * 60;
const VOICE_USAGE_KEY = "lumo_voice_usage_v2";

const providerGlow: Record<string, string> = {
  lumo: "from-[hsl(228_88%_66%)] via-[hsl(266_86%_70%)] to-[hsl(196_86%_62%)]",
  gpt: "from-[hsl(158_70%_44%)] via-[hsl(178_70%_42%)] to-[hsl(205_83%_56%)]",
  gemini: "from-[hsl(198_90%_58%)] via-[hsl(232_84%_64%)] to-[hsl(267_82%_68%)]",
  claude: "from-[hsl(24_90%_62%)] via-[hsl(344_84%_64%)] to-[hsl(266_78%_68%)]",
};

const modelLabels: Record<string, string> = {
  auto: "Auto Router",
  lumo: "Lumo Core",
  gpt: "GPT-class",
  gemini: "Gemini Pro",
  claude: "Claude Sonnet",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatClock(ts: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}

function readVoiceUsage() {
  try {
    const raw = localStorage.getItem(VOICE_USAGE_KEY);
    if (!raw) return { date: todayKey(), seconds: 0 };
    const parsed = JSON.parse(raw) as { date?: string; seconds?: number };
    if (parsed.date !== todayKey()) return { date: todayKey(), seconds: 0 };
    return { date: todayKey(), seconds: Math.max(0, Number(parsed.seconds || 0)) };
  } catch {
    return { date: todayKey(), seconds: 0 };
  }
}

function saveVoiceUsage(next: { date: string; seconds: number }) {
  try {
    localStorage.setItem(VOICE_USAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private browsing; voice still works.
  }
}

function secondsToLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, "")
    .replace(/[#>*_~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function pickWarmVoice(preferredName?: string): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  if (preferredName) {
    const preferred = voices.find((voice) => voice.name === preferredName);
    if (preferred) return preferred;
  }

  return (
    voices.find((voice) => /en-(US|GB|IN)/i.test(voice.lang) && /(Samantha|Jenny|Aria|Natasha|Serena|Matilda|Google)/i.test(voice.name)) ||
    voices.find((voice) => /en-(US|GB|IN)/i.test(voice.lang)) ||
    voices[0]
  );
}

function errorFromSpeech(error?: string): VoiceError {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return {
      title: "Microphone access required for Voice AI.",
      detail: "Lumo needs microphone permission before it can listen.",
      hint: "Allow microphone access in your browser settings, then retry.",
    };
  }
  if (error === "audio-capture") {
    return {
      title: "No microphone found.",
      detail: "Connect or enable a microphone to start a voice session.",
      hint: "Check your input device and system privacy settings.",
    };
  }
  if (error === "no-speech") {
    return {
      title: "I didn’t catch that.",
      detail: "Try speaking a little closer to the microphone.",
      hint: "Tap retry when you’re ready.",
    };
  }
  return {
    title: "Voice session interrupted.",
    detail: "Something disrupted the microphone session.",
    hint: "Retry the session — Lumo will reset safely.",
  };
}

const LumoVoiceMode = ({ open, onClose, tier, persona, selectedModel, onTranscript, seedHistory = [] }: Props) => {
  const canUseVoice = tier === "pro" || tier === "elite";
  const isElite = tier === "elite";
  const isPro = tier === "pro";

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [voiceError, setVoiceError] = useState<VoiceError | null>(null);
  const [level, setLevel] = useState(0.22);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | undefined>();
  const [speechRate, setSpeechRate] = useState(1);
  const [voicesReady, setVoicesReady] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [routerMeta, setRouterMeta] = useState({
    provider: selectedModel === "auto" ? "lumo" : selectedModel,
    providerLabel: modelLabels[selectedModel] || "Lumo Router",
    model: "Server routed",
    latencyMs: undefined as number | undefined,
    tokens: undefined as number | undefined,
  });
  const [voiceUsage, setVoiceUsage] = useState(() => readVoiceUsage());

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visualizerFrameRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  const nextId = useRef(1);
  const turnsRef = useRef<Turn[]>([]);
  const stateRef = useRef<VoiceState>("idle");
  const openRef = useRef(open);
  const continuousRef = useRef(continuousMode);
  const voiceRepliesRef = useRef(voiceReplies);
  const selectedVoiceRef = useRef(selectedVoiceName);
  const speechRateRef = useRef(speechRate);
  const speechGenerationRef = useRef(0);
  const startListeningRef = useRef<() => void>(() => undefined);

  turnsRef.current = turns;
  stateRef.current = voiceState;
  openRef.current = open;
  continuousRef.current = continuousMode;
  voiceRepliesRef.current = voiceReplies;
  selectedVoiceRef.current = selectedVoiceName;
  speechRateRef.current = speechRate;

  const proRemainingSeconds = Math.max(0, PRO_DAILY_VOICE_SECONDS - voiceUsage.seconds);
  const activeProvider = routerMeta.provider || "lumo";
  const glowClass = providerGlow[activeProvider] || providerGlow.lumo;
  const isActive = voiceState === "listening" || voiceState === "processing" || voiceState === "speaking";

  const usagePercent = isElite
    ? 100
    : isPro
      ? Math.min(100, (voiceUsage.seconds / PRO_DAILY_VOICE_SECONDS) * 100)
      : 0;

  const stateCopy = useMemo(() => {
    if (!canUseVoice) {
      return {
        label: "Voice AI is locked",
        caption: "Upgrade to Pro to talk with Lumo.",
        helper: "Text chat remains available on Free.",
      };
    }
    if (voiceState === "listening") {
      return { label: "I’m listening…", caption: partialTranscript || finalTranscript || "Tell me what you want to improve.", helper: "Speak naturally — I’ll analyze it when you pause." };
    }
    if (voiceState === "processing") {
      return { label: "Analyzing your finances…", caption: "Routing your voice prompt through Lumo’s AI engines.", helper: `${routerMeta.providerLabel} is preparing a plan.` };
    }
    if (voiceState === "speaking") {
      return { label: "Here’s a smarter plan…", caption: "Lumo is speaking your response.", helper: "Tap the orb to stop the voice reply." };
    }
    if (voiceState === "error") {
      return { label: voiceError?.title || "Voice needs attention", caption: voiceError?.detail || "The session reset safely.", helper: voiceError?.hint || "Tap retry to start again." };
    }
    return { label: "Tap to speak", caption: isElite ? "Start a live financial conversation." : "Use your Pro voice minutes with Lumo.", helper: continuousMode ? "Continuous Conversation is on." : "Ask about budgets, spending, goals, or investments." };
  }, [canUseVoice, voiceState, partialTranscript, finalTranscript, routerMeta.providerLabel, voiceError, isElite, continuousMode]);

  const voices = typeof window !== "undefined" && window.speechSynthesis
    ? window.speechSynthesis.getVoices().filter((voice) => /en/i.test(voice.lang))
    : [];

  const cleanupMic = useCallback(() => {
    if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current);
    visualizerFrameRef.current = null;
    analyserRef.current = null;
    try {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {
      // no-op
    }
    mediaStreamRef.current = null;
    try {
      audioContextRef.current?.close();
    } catch {
      // no-op
    }
    audioContextRef.current = null;
  }, []);

  const stopSpeech = useCallback(() => {
    speechGenerationRef.current += 1;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // no-op
    }
  }, []);

  const resetSession = useCallback((nextState: VoiceState = "idle") => {
    try {
      recognitionRef.current?.abort?.();
    } catch {
      // no-op
    }
    recognitionRef.current = null;
    cleanupMic();
    stopSpeech();
    finalTranscriptRef.current = "";
    setPartialTranscript("");
    setFinalTranscript("");
    setVoiceState(nextState);
  }, [cleanupMic, stopSpeech]);

  const setSafeError = useCallback((error: VoiceError) => {
    resetSession("error");
    setVoiceError(error);
  }, [resetSession]);

  const startVisualizer = useCallback((stream: MediaStream) => {
    cleanupMic();
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    mediaStreamRef.current = stream;
  }, [cleanupMic]);

  const scheduleContinuousListen = useCallback(() => {
    if (!openRef.current || !continuousRef.current || !isElite) return;
    window.setTimeout(() => {
      if (openRef.current && continuousRef.current && stateRef.current === "idle") {
        startListeningRef.current?.();
      }
    }, 700);
  }, [isElite]);

  const speakResponse = useCallback((text: string) => {
    if (!voiceRepliesRef.current) {
      setVoiceState("idle");
      scheduleContinuousListen();
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setSafeError({
        title: "Voice playback is unavailable.",
        detail: "Your browser cannot play Lumo’s voice response.",
        hint: "Try Chrome, Edge, or Safari with audio enabled.",
      });
      return;
    }

    const clean = stripMarkdown(text).slice(0, 850);
    if (!clean) {
      setVoiceState("idle");
      scheduleContinuousListen();
      return;
    }

    const generation = speechGenerationRef.current + 1;
    speechGenerationRef.current = generation;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      const voice = pickWarmVoice(selectedVoiceRef.current);
      if (voice) utterance.voice = voice;
      utterance.rate = speechRateRef.current;
      utterance.pitch = 1.03;
      utterance.volume = 1;
      utterance.onstart = () => {
        if (speechGenerationRef.current !== generation) return;
        setVoiceState("speaking");
      };
      utterance.onend = () => {
        if (speechGenerationRef.current !== generation) return;
        setVoiceState("idle");
        scheduleContinuousListen();
      };
      utterance.onerror = () => {
        if (speechGenerationRef.current !== generation) return;
        setSafeError({
          title: "Lumo couldn’t play audio.",
          detail: "The text response was generated, but voice playback failed.",
          hint: "Check system audio, then retry.",
        });
      };
      setVoiceState("speaking");
      window.speechSynthesis.speak(utterance);
    } catch {
      setSafeError({
        title: "Text-to-speech failed.",
        detail: "Lumo could not start the voice playback session.",
        hint: "Refresh audio permissions or try another browser.",
      });
    }
  }, [scheduleContinuousListen, setSafeError]);

  const askLumo = useCallback(async (userText: string) => {
    setVoiceState("processing");
    cleanupMic();

    const memory = [
      ...seedHistory.slice(-6),
      ...turnsRef.current.slice(-8).map((turn) => ({ role: turn.role, text: turn.text })),
    ];

    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          message: userText,
          model: selectedModel,
          persona,
          history: memory,
          context: {
            voiceSession: true,
            voiceProfile: lumoVoiceProfile,
            currentGoals: ["reduce waste", "increase savings", "build better financial habits"],
            financialContext: "Use prior chat turns, active persona, budgets, goals, and recent money questions as conversational memory.",
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiText = String(data?.text || "I’m here with you. Could you repeat that financial question?");
      const nextMeta = {
        provider: String(data?.provider || selectedModel || "lumo"),
        providerLabel: String(data?.providerLabel || modelLabels[selectedModel] || "Lumo Router"),
        model: String(data?.model || "Server routed"),
        latencyMs: typeof data?.latencyMs === "number" ? data.latencyMs : undefined,
        tokens: typeof data?.totalTokens === "number" ? data.totalTokens : undefined,
      };
      setRouterMeta(nextMeta);
      setTurns((previous) => [
        ...previous,
        {
          id: nextId.current++,
          role: "ai",
          text: aiText,
          timestamp: Date.now(),
          provider: nextMeta.provider,
          providerLabel: nextMeta.providerLabel,
          model: nextMeta.model,
          latencyMs: nextMeta.latencyMs,
          tokens: nextMeta.tokens,
        },
      ]);
      if (data?.fallbackUsed && data?.providerLabel) {
        toast(`Voice routed via ${data.providerLabel}`, { duration: 2200 });
      }
      speakResponse(aiText);
    } catch (error: unknown) {
      console.error("Lumo Voice ai-router error", error);
      const message = error instanceof Error ? error.message : "The network or AI engine failed during processing.";
      setSafeError({
        title: "Lumo couldn’t reach the AI router.",
        detail: message,
        hint: "Retry in a moment — your session has been safely reset.",
      });
    }
  }, [cleanupMic, seedHistory, selectedModel, persona, speakResponse, setSafeError]);

  const finishUtterance = useCallback((rawText: string) => {
    const text = rawText.trim();
    finalTranscriptRef.current = "";
    setPartialTranscript("");
    setFinalTranscript("");
    cleanupMic();

    if (!text) {
      setSafeError({
        title: "I didn’t catch that.",
        detail: "No clear speech was detected before the session ended.",
        hint: "Tap retry and speak after the listening glow appears.",
      });
      return;
    }

    try {
      navigator.vibrate?.(12);
    } catch {
      // no-op
    }

    setTurns((previous) => [
      ...previous,
      { id: nextId.current++, role: "user", text, timestamp: Date.now() },
    ]);
    onTranscript?.(text);
    askLumo(text);
  }, [askLumo, cleanupMic, onTranscript, setSafeError]);

  const startListening = useCallback(async () => {
    setVoiceError(null);
    setPartialTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";

    if (!canUseVoice) {
      setSafeError({
        title: "Voice AI unlocks on Pro.",
        detail: "Free users can keep using text chat; voice starts with Pro.",
        hint: "Upgrade to unlock voice minutes and Lumo audio replies.",
      });
      return;
    }

    if (isPro && proRemainingSeconds <= 0) {
      setSafeError({
        title: "Pro voice minutes used today.",
        detail: "Your daily Pro voice allowance is complete.",
        hint: "Upgrade to Elite for unlimited voice and Continuous Conversation.",
      });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setSafeError({
        title: "Microphone is unavailable.",
        detail: "This device or browser does not expose microphone access.",
        hint: "Use a modern browser with microphone support.",
      });
      return;
    }

    const recognition = getRecognition();
    if (!recognition) {
      setSafeError({
        title: "Speech recognition isn’t supported.",
        detail: "Your browser cannot transcribe live speech with the built-in API.",
        hint: "Try Chrome or Edge for browser speech recognition.",
      });
      return;
    }

    resetSession("idle");

    try {
      stopSpeech();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      startVisualizer(stream);

      recognitionRef.current = recognition;
      recognition.onstart = () => {
        setVoiceState("listening");
        try {
          navigator.vibrate?.(8);
        } catch {
          // no-op
        }
      };
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = "";
        let finalText = finalTranscriptRef.current;
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript || "";
          if (result.isFinal) finalText += transcript;
          else interim += transcript;
        }
        finalTranscriptRef.current = finalText;
        setFinalTranscript(finalText);
        setPartialTranscript(interim);
      };
      recognition.onspeechend = () => {
        try {
          recognition.stop();
        } catch {
          // no-op
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorLike) => {
        console.error("Lumo Voice recognition error", event?.error);
        setSafeError(errorFromSpeech(event?.error));
      };
      recognition.onend = () => {
        const text = finalTranscriptRef.current.trim();
        recognitionRef.current = null;
        if (stateRef.current === "error") return;
        finishUtterance(text);
      };
      recognition.start();
    } catch (error: unknown) {
      console.error("Lumo Voice microphone error", error);
      const browserError = error instanceof DOMException || error instanceof Error ? error : null;
      const denied = browserError?.name === "NotAllowedError" || browserError?.name === "SecurityError";
      setSafeError(denied ? errorFromSpeech("not-allowed") : {
        title: "Microphone session couldn’t start.",
        detail: browserError?.message || "Lumo could not activate your input device.",
        hint: "Check browser permissions and retry.",
      });
    }
  }, [canUseVoice, finishUtterance, isPro, proRemainingSeconds, resetSession, setSafeError, startVisualizer, stopSpeech]);

  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      finishUtterance(finalTranscriptRef.current);
    }
  }, [finishUtterance]);

  const handleOrbTap = () => {
    if (voiceState === "listening") {
      stopListening();
      return;
    }
    if (voiceState === "speaking") {
      stopSpeech();
      setVoiceState("idle");
      scheduleContinuousListen();
      return;
    }
    if (voiceState === "idle" || voiceState === "error") startListening();
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoicesReady(allVoices.length > 0);
      if (!selectedVoiceRef.current) {
        const warm = pickWarmVoice();
        if (warm) setSelectedVoiceName(warm.name);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null;
      } catch {
        // no-op
      }
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let tick = 0;
    const buffer = new Uint8Array(128);

    const animate = () => {
      tick += 0.06;
      const analyser = analyserRef.current;
      if (voiceState === "listening" && analyser) {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          const normalized = (buffer[index] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, Math.max(0.18, rms * 5.5)));
      } else {
        const base = voiceState === "speaking" ? 0.68 : voiceState === "processing" ? 0.42 : voiceState === "error" ? 0.32 : 0.24;
        const wave = Math.sin(tick * (voiceState === "speaking" ? 2.6 : 1.2)) * 0.13 + Math.sin(tick * 4.1) * 0.07;
        setLevel(Math.max(0.16, Math.min(0.96, base + wave)));
      }
      frame = requestAnimationFrame(animate);
    };

    if (open) frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [open, voiceState]);

  useEffect(() => {
    if (!open || !isPro || !isActive) return;
    const interval = window.setInterval(() => {
      setVoiceUsage((previous) => {
        const normalized = previous.date === todayKey() ? previous : { date: todayKey(), seconds: 0 };
        const next = { date: todayKey(), seconds: Math.min(PRO_DAILY_VOICE_SECONDS, normalized.seconds + 1) };
        saveVoiceUsage(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open, isPro, isActive]);

  useEffect(() => {
    if (open && isPro && proRemainingSeconds <= 0 && isActive) {
      setSafeError({
        title: "Pro voice minutes used today.",
        detail: "Lumo paused this session because your daily Pro voice time is complete.",
        hint: "Elite unlocks unlimited Voice AI and Continuous Conversation.",
      });
    }
  }, [open, isPro, proRemainingSeconds, isActive, setSafeError]);

  useEffect(() => {
    if (!open) {
      resetSession("idle");
      setVoiceError(null);
      setSettingsOpen(false);
      setContinuousMode(false);
    }
  }, [open, resetSession]);

  const close = () => {
    resetSession("idle");
    onClose();
  };

  const bars = Array.from({ length: 34 }, (_, index) => index);
  const particles = Array.from({ length: 16 }, (_, index) => index);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-background text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,hsl(226_95%_88%/0.75),transparent_32%),radial-gradient(circle_at_82%_22%,hsl(284_86%_90%/0.72),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(220_44%_98%),hsl(252_70%_97%))]" />
          <motion.div
            aria-hidden
            className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-[hsl(221_90%_72%/0.28)] blur-3xl"
            animate={{ x: [0, 44, -12, 0], y: [0, 28, -8, 0], scale: [1, 1.14, 0.98, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[hsl(280_82%_76%/0.28)] blur-3xl"
            animate={{ x: [0, -36, 18, 0], y: [0, -22, 14, 0], scale: [1, 0.96, 1.16, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6">
            <header className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-2 shadow-[0_18px_55px_-35px_hsl(230_80%_34%/0.45)] backdrop-blur-2xl sm:px-4">
                <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${glowClass} shadow-[0_16px_42px_-18px_hsl(245_85%_55%/0.75)]`}>
                  {!avatarBroken ? (
                    <img src={lumoVoiceProfile.avatar} alt="Lumo voice avatar" className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} />
                  ) : (
                    <Sparkles className="h-5 w-5 text-[hsl(0_0%_100%)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-sm font-bold tracking-tight sm:text-base">Lumo Voice AI</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(152_72%_42%/0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(152_64%_30%)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(152_72%_42%)]" /> Online
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Radio className="h-3 w-3" /> {routerMeta.providerLabel}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">{modelLabels[selectedModel] || selectedModel}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((value) => !value)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-xl transition hover:text-foreground"
                  title="Voice settings"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-xl transition hover:text-foreground"
                  title="Close Voice AI"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="absolute right-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-border/60 bg-background/90 p-4 shadow-[0_24px_80px_-32px_hsl(230_60%_30%/0.35)] backdrop-blur-2xl sm:right-6"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-bold">Voice settings</p>
                      <p className="text-xs text-muted-foreground">{lumoVoiceProfile.voiceType} · {lumoVoiceProfile.accent}</p>
                    </div>
                    {voiceReplies ? <Volume2 className="h-4 w-4 text-[hsl(238_82%_58%)]" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  <label className="text-xs font-medium text-muted-foreground">Lumo voice</label>
                  <select
                    value={selectedVoiceName || ""}
                    onChange={(event) => setSelectedVoiceName(event.target.value)}
                    disabled={!voicesReady}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(238_82%_58%/0.25)]"
                  >
                    {voices.map((voice) => (
                      <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>
                    ))}
                  </select>

                  <label className="mt-4 block text-xs font-medium text-muted-foreground">Speed · {speechRate.toFixed(1)}x</label>
                  <input
                    type="range"
                    min={0.75}
                    max={1.25}
                    step={0.05}
                    value={speechRate}
                    onChange={(event) => setSpeechRate(Number(event.target.value))}
                    className="mt-2 w-full accent-[hsl(238_82%_58%)]"
                  />

                  <div className="mt-4 space-y-3">
                    <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2"><Volume2 className="h-4 w-4" /> Voice replies</span>
                      <input type="checkbox" checked={voiceReplies} onChange={(event) => setVoiceReplies(event.target.checked)} />
                    </label>
                    <label className={`flex items-center justify-between gap-4 rounded-2xl px-3 py-2 text-sm ${isElite ? "bg-muted/50" : "bg-[hsl(42_92%_58%/0.12)] text-muted-foreground"}`}>
                      <span className="flex items-center gap-2">{isElite ? <Zap className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Continuous Conversation</span>
                      <input type="checkbox" checked={continuousMode && isElite} disabled={!isElite} onChange={(event) => setContinuousMode(event.target.checked)} />
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <main className="flex flex-1 flex-col items-center justify-center gap-5 py-5 sm:gap-7 sm:py-8">
              <section className="grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[1fr_18rem]">
                <div className="flex min-w-0 flex-col items-center text-center">
                  <motion.button
                    type="button"
                    onClick={handleOrbTap}
                    disabled={voiceState === "processing" || !canUseVoice}
                    whileTap={{ scale: 0.96 }}
                    className="group relative flex aspect-square w-[min(72vw,21rem)] max-w-[21rem] items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:w-[21rem]"
                    aria-label={voiceState === "listening" ? "Stop listening" : voiceState === "speaking" ? "Stop speaking" : "Start Lumo Voice AI"}
                  >
                    {[0, 1, 2].map((ring) => (
                      <motion.span
                        key={ring}
                        className={`absolute inset-5 rounded-full bg-gradient-to-br ${glowClass} opacity-25 blur-xl`}
                        animate={{
                          scale: voiceState === "listening" ? [1, 1.18 + ring * 0.1, 1] : 1 + level * 0.22 + ring * 0.08,
                          opacity: voiceState === "error" ? 0.12 : voiceState === "idle" ? 0.18 - ring * 0.03 : 0.34 - ring * 0.05,
                        }}
                        transition={{ duration: 1.8 + ring * 0.25, repeat: voiceState === "listening" ? Infinity : 0, ease: "easeInOut" }}
                      />
                    ))}

                    {particles.map((particle) => {
                      const angle = (particle / particles.length) * Math.PI * 2;
                      const radius = 118 + (particle % 4) * 13;
                      return (
                        <motion.span
                          key={particle}
                          aria-hidden
                          className="absolute h-1.5 w-1.5 rounded-full bg-[hsl(238_82%_58%/0.55)] shadow-[0_0_18px_hsl(238_82%_58%/0.35)]"
                          style={{ left: "50%", top: "50%" }}
                          animate={{
                            x: Math.cos(angle) * radius * (0.88 + level * 0.16),
                            y: Math.sin(angle) * radius * (0.88 + level * 0.16),
                            opacity: voiceState === "processing" || voiceState === "speaking" ? [0.25, 0.9, 0.25] : 0.32,
                            scale: voiceState === "listening" ? [0.8, 1.3, 0.8] : 1,
                          }}
                          transition={{ duration: 2.4 + particle * 0.035, repeat: Infinity, ease: "easeInOut" }}
                        />
                      );
                    })}

                    <motion.span
                      className={`absolute inset-9 rounded-full bg-gradient-to-br ${glowClass} shadow-[0_34px_100px_-38px_hsl(245_85%_48%/0.85)]`}
                      animate={{
                        rotate: voiceState === "processing" ? 360 : voiceState === "speaking" ? [0, 6, -6, 0] : 0,
                        scale: 1 + level * (voiceState === "speaking" ? 0.12 : 0.08),
                      }}
                      transition={{ rotate: { duration: voiceState === "processing" ? 4 : 1.8, repeat: Infinity, ease: "linear" }, scale: { type: "spring", stiffness: 120, damping: 16 } }}
                    />
                    <span className="absolute inset-14 rounded-full border border-[hsl(0_0%_100%/0.65)] bg-[hsl(0_0%_100%/0.38)] shadow-inner backdrop-blur-2xl" />
                    <span className="absolute inset-[5.3rem] rounded-full bg-background/80 shadow-[inset_0_1px_18px_hsl(0_0%_100%/0.9)]" />

                    <div className="relative z-10 flex flex-col items-center gap-2">
                      {voiceState === "processing" ? (
                        <Loader2 className="h-10 w-10 animate-spin text-[hsl(238_82%_48%)]" />
                      ) : voiceState === "listening" ? (
                        <MicOff className="h-10 w-10 text-[hsl(344_82%_56%)]" />
                      ) : voiceState === "speaking" ? (
                        <Waves className="h-10 w-10 text-[hsl(238_82%_48%)]" />
                      ) : voiceState === "error" ? (
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                      ) : (
                        <Mic className="h-10 w-10 text-[hsl(238_82%_48%)]" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{lumoVoiceProfile.name}</span>
                    </div>
                  </motion.button>

                  <div className="mt-1 flex h-20 items-center justify-center gap-1.5 sm:h-24">
                    {bars.map((bar) => {
                      const phase = (bar / bars.length) * Math.PI * 2;
                      const height = voiceState === "idle"
                        ? 10 + Math.abs(Math.sin(phase)) * 10
                        : 14 + Math.abs(Math.sin(phase + level * 5 + bar * 0.2)) * (54 * Math.max(0.2, level));
                      return (
                        <motion.span
                          key={bar}
                          className={`w-1.5 rounded-full bg-gradient-to-t ${glowClass}`}
                          animate={{ height, opacity: voiceState === "error" ? 0.35 : 0.82 }}
                          transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        />
                      );
                    })}
                  </div>

                  <motion.div layout className="min-h-[7rem] max-w-2xl px-2">
                    <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">{stateCopy.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{stateCopy.caption}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(238_70%_52%)]">{stateCopy.helper}</p>
                  </motion.div>

                  <AnimatePresence>
                    {voiceState === "error" && voiceError && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="mt-3 w-full max-w-xl rounded-3xl border border-destructive/20 bg-background/82 p-4 text-left shadow-[0_22px_70px_-38px_hsl(0_72%_45%/0.45)] backdrop-blur-2xl"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-base font-bold text-foreground">{voiceError.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{voiceError.detail}</p>
                            {voiceError.hint && <p className="mt-1 text-xs text-muted-foreground">{voiceError.hint}</p>}
                            <button
                              type="button"
                              onClick={startListening}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                            >
                              <RefreshCw className="h-4 w-4" /> Retry
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <aside className="grid gap-3 rounded-3xl border border-border/60 bg-background/70 p-4 shadow-[0_24px_80px_-44px_hsl(230_60%_30%/0.42)] backdrop-blur-2xl lg:self-center">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Session</p>
                      <p className="font-display text-lg font-bold">{tier === "elite" ? "Elite Voice" : tier === "pro" ? "Pro Voice" : "Free"}</p>
                    </div>
                    {isElite ? <Crown className="h-5 w-5 text-[hsl(38_92%_48%)]" /> : <Clock3 className="h-5 w-5 text-[hsl(238_82%_58%)]" />}
                  </div>

                  <div className="rounded-2xl bg-muted/55 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{isElite ? "Voice access" : isPro ? "Voice minutes today" : "Access"}</span>
                      <span>{isElite ? "Unlimited" : isPro ? `${secondsToLabel(proRemainingSeconds)} left` : "Locked"}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${isElite ? providerGlow.claude : glowClass}`}
                        animate={{ width: `${isElite ? 100 : Math.max(4, 100 - usagePercent)}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl bg-background/78 p-3">
                      <p className="text-muted-foreground">AI engine</p>
                      <p className="mt-1 truncate font-semibold text-foreground">{routerMeta.providerLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-background/78 p-3">
                      <p className="text-muted-foreground">Latency</p>
                      <p className="mt-1 font-semibold text-foreground">{routerMeta.latencyMs ? `${routerMeta.latencyMs}ms` : "Live"}</p>
                    </div>
                    <div className="rounded-2xl bg-background/78 p-3">
                      <p className="text-muted-foreground">Memory</p>
                      <p className="mt-1 font-semibold text-foreground">{Math.min(seedHistory.length + turns.length, 14)} turns</p>
                    </div>
                    <div className="rounded-2xl bg-background/78 p-3">
                      <p className="text-muted-foreground">Tokens</p>
                      <p className="mt-1 font-semibold text-foreground">{routerMeta.tokens ? routerMeta.tokens.toLocaleString() : "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[hsl(238_82%_58%/0.14)] bg-[hsl(238_82%_58%/0.08)] p-3 text-xs leading-5 text-muted-foreground">
                    <div className="mb-1 flex items-center gap-2 font-semibold text-foreground"><Brain className="h-4 w-4 text-[hsl(238_82%_58%)]" /> Voice memory</div>
                    Lumo remembers this voice session, recent chat turns, your persona, goals, budgets, and financial questions while responding.
                  </div>
                </aside>
              </section>

              <section className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-background/72 shadow-[0_24px_80px_-46px_hsl(230_60%_30%/0.45)] backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4 text-[hsl(238_82%_58%)]" /> Live conversation
                  </div>
                  <div className="text-xs text-muted-foreground">{turns.length ? `${turns.length} voice turns` : "Ready"}</div>
                </div>
                <div className="max-h-52 space-y-3 overflow-y-auto p-4 sm:max-h-60 sm:p-5">
                  {turns.length === 0 ? (
                    <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-4 text-center text-sm text-muted-foreground">
                      Tap the orb and ask Lumo about spending, saving, budgets, investments, or goals.
                    </div>
                  ) : (
                    turns.slice(-10).map((turn) => (
                      <motion.div
                        key={turn.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${turn.role === "user" ? "bg-primary text-primary-foreground" : "border border-border/70 bg-background/86 text-foreground"}`}>
                          <div className={`mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] ${turn.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            <span className="inline-flex items-center gap-1">{turn.role === "user" ? <Mic className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />} {turn.role === "user" ? "You" : lumoVoiceProfile.name}</span>
                            <span>{formatClock(turn.timestamp)}</span>
                            {turn.providerLabel && <span className="rounded-full bg-[hsl(238_82%_58%/0.10)] px-2 py-0.5 text-[hsl(238_72%_48%)]">{turn.providerLabel}</span>}
                          </div>
                          <p className="leading-6">{stripMarkdown(turn.text).slice(0, 420)}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LumoVoiceMode;
