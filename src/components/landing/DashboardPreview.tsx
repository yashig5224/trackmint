import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import demoVideo from "@/assets/command-center-demo.mp4.asset.json";

const DashboardPreview = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);

  // Lazy-load: only set src when section is near viewport
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
      { rootMargin: "300px" }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Ensure autoplay kicks in once src is set
  useEffect(() => {
    if (inView && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [inView]);

  return (
    <section id="dashboard" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[hsl(220,80%,98%)] to-white" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[hsl(220,100%,92%,0.4)] to-[hsl(280,80%,94%,0.4)] blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-medium">
            ✦ Command Center
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            Your finances,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              one beautiful view
            </span>.
          </h2>
        </motion.div>

        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="group relative mx-auto max-w-6xl"
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-[hsl(220,100%,75%,0.35)] via-[hsl(260,90%,78%,0.28)] to-[hsl(180,80%,75%,0.3)] blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700"
          />

          {/* Glass frame */}
          <div className="relative rounded-[2rem] p-1.5 bg-gradient-to-br from-white/90 via-white/70 to-white/40 border border-white/80 shadow-[0_40px_120px_-30px_rgba(120,90,220,0.45),0_20px_60px_-20px_rgba(80,80,180,0.25)] backdrop-blur-2xl transition-shadow duration-500 group-hover:shadow-[0_50px_140px_-25px_rgba(120,90,220,0.6),0_25px_80px_-20px_rgba(80,80,180,0.35)]">
            <div
              className="relative rounded-[1.65rem] overflow-hidden bg-gradient-to-br from-[hsl(220,40%,97%)] to-[hsl(260,40%,96%)]"
              style={{ aspectRatio: "16 / 10" }}
            >
              {/* Skeleton shimmer */}
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
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none select-none [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden [&::-webkit-media-controls-panel]:hidden [&::-webkit-media-controls-start-playback-button]:hidden ${
                    loaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}

              {/* Soft inner highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[1.65rem] ring-1 ring-inset ring-white/40"
              />
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
