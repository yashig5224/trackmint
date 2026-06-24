import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Bot, Zap, TrendingUp, Target, Sparkles } from "lucide-react";
import demoVideo from "@/assets/command-center-demo.mp4.asset.json";

const FEATURES = [
  { icon: Bot, label: "AI Coach", desc: "Personal finance coach, 24/7" },
  { icon: Zap, label: "Smart Automation", desc: "Rules that save you hours" },
  { icon: TrendingUp, label: "Cash Flow Tracking", desc: "See every rupee, instantly" },
  { icon: Target, label: "Goals & Budgets", desc: "Stay on track effortlessly" },
  { icon: Sparkles, label: "Financial Intelligence", desc: "Insights that compound" },
];

const DashboardPreview = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: "400px" }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (inView && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [inView]);

  return (
    <section id="dashboard" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(220,80%,98%)] to-white" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-br from-[hsl(220,100%,92%,0.45)] to-[hsl(280,80%,94%,0.4)] blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16 items-center">
        {/* LEFT — copy */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-medium">
            ✦ Command Center
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.05]">
            Your finances,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              one beautiful view
            </span>.
          </h2>
          <p className="mt-5 text-foreground/65 leading-relaxed max-w-md">
            Every account, goal, and insight in one luminous workspace. TrackMint
            turns scattered statements into clarity you can act on.
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                className="group flex items-start gap-3"
              >
                <span className="mt-0.5 w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(220,100%,96%)] to-[hsl(280,100%,97%)] border border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110">
                  <f.icon className="w-4 h-4 text-[hsl(260,80%,55%)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-foreground/55">{f.desc}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* RIGHT — video */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="group relative"
        >
          {/* Ambient purple-blue glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-[hsl(220,100%,70%,0.4)] via-[hsl(260,90%,72%,0.35)] to-[hsl(280,90%,75%,0.3)] blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700"
          />

          {/* Gradient border */}
          <div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-br from-white via-[hsl(260,90%,90%)] to-[hsl(220,90%,88%)] shadow-[0_50px_120px_-30px_rgba(120,90,220,0.5),0_25px_70px_-25px_rgba(80,80,180,0.3)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_60px_140px_-25px_rgba(120,90,220,0.65),0_30px_90px_-25px_rgba(80,80,180,0.4)]">
            <div className="relative rounded-[26px] overflow-hidden bg-gradient-to-br from-[hsl(220,40%,97%)] to-[hsl(260,40%,96%)] backdrop-blur-2xl border border-white/80">
              <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
                {!loaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[hsl(220,30%,94%)] via-[hsl(260,30%,96%)] to-[hsl(220,30%,94%)]">
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.6)_50%,transparent_70%)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
                  </div>
                )}

                {inView && (
                  <video
                    ref={videoRef}
                    src={demoVideo.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    disablePictureInPicture
                    disableRemotePlayback
                    controls={false}
                    onLoadedData={() => setLoaded(true)}
                    onCanPlay={() => setLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-contain bg-white transition-opacity duration-700 pointer-events-none select-none [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden [&::-webkit-media-controls-panel]:hidden [&::-webkit-media-controls-start-playback-button]:hidden ${
                      loaded ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}

                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-white/50"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
};

export default DashboardPreview;
