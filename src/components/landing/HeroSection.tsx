import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";

const FloatingCard = ({ children, className, delay = 0, yOffset = 20 }: { children: React.ReactNode, className: string, delay?: number, yOffset?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: yOffset }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  </motion.div>
);

const HeroSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-background"
    >
      {/* Background with soft gradients, blobs, and noise texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,98%)] via-background to-[hsl(220,30%,96%)] z-0" />
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      
      {/* Soft pastel blobs */}
      <div className="absolute top-[10%] left-[5%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-[hsl(262,83%,58%/0.08)] blur-[100px] z-0" />
      <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] rounded-full bg-[hsl(217,91%,60%/0.07)] blur-[120px] z-0" />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-8rem)]"
      >
        {/* Left Side: Content */}
        <div className="flex flex-col justify-center text-center lg:text-left order-2 lg:order-1 pt-10 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-medium text-foreground mx-auto lg:mx-0 mb-8 w-fit"
          >
            <span className="w-2 h-2 rounded-full bg-[hsl(152,69%,41%)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            FinTrack AI is now in Beta
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[4.5rem] xl:text-[5rem] font-bold tracking-[-0.04em] leading-[1.05] text-foreground mb-6"
          >
            Your Money.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
              Finally Under Control.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0 mb-10"
          >
            Track spending, build smarter budgets, and get AI-powered financial guidance — all in one beautifully designed experience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 mx-auto lg:mx-0 mb-16 w-full sm:w-auto"
          >
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-full text-base font-medium hover:bg-foreground/90 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-foreground/10"
            >
              Try Demo
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-background text-foreground border border-border/60 px-8 py-4 rounded-full text-base font-medium hover:bg-muted/50 hover:border-border transition-all duration-300"
            >
              Login / Sign Up
            </Link>
          </motion.div>

          {/* Social Proof Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="grid grid-cols-3 gap-4 border-t border-border/50 pt-8 mt-auto"
          >
            {[
              { stat: "₹1.2M+", label: "Tracked" },
              { stat: "10K+", label: "Users" },
              { stat: "92%", label: "Better Budgeting" },
            ].map((item, i) => (
              <div key={i} className="text-center lg:text-left">
                <div className="font-display font-bold text-lg sm:text-2xl text-foreground mb-1">{item.stat}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side: Immersive Visual */}
        <div className="relative h-[400px] lg:h-[600px] w-full order-1 lg:order-2 flex items-center justify-center pointer-events-none mt-8 lg:mt-0">
          {/* Main Dashboard Preview Card */}
          <FloatingCard delay={0.2} yOffset={40} className="absolute z-20 w-[90%] max-w-[420px] shadow-2xl">
            <div className="bg-background/80 backdrop-blur-xl border border-border/60 rounded-[2rem] p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(262,83%,58%/0.1)] flex items-center justify-center text-lg">🤖</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">AI Coach</div>
                    <div className="text-xs text-muted-foreground">Active Now</div>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-[hsl(152,69%,41%/0.1)] text-[hsl(152,69%,41%)] text-xs font-semibold">
                  +12% Savings
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-2xl p-5 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-2">Current Balance</div>
                  <div className="text-3xl font-bold font-display text-foreground">₹1,24,500</div>
                  <div className="mt-5 h-2 w-full bg-border/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[hsl(217,91%,60%)] w-[65%] rounded-full" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-[hsl(152,69%,41%/0.05)] border border-[hsl(152,69%,41%/0.1)] rounded-2xl p-4 text-center">
                    <div className="text-xs text-[hsl(152,69%,41%)] mb-1 font-medium">Income</div>
                    <div className="font-semibold text-sm">₹85,000</div>
                  </div>
                  <div className="flex-1 bg-[hsl(38,92%,50%/0.05)] border border-[hsl(38,92%,50%/0.1)] rounded-2xl p-4 text-center">
                    <div className="text-xs text-[hsl(38,92%,50%)] mb-1 font-medium">Expenses</div>
                    <div className="font-semibold text-sm">₹32,400</div>
                  </div>
                </div>
              </div>
            </div>
          </FloatingCard>

          {/* Floating Widget 1: Transaction */}
          <FloatingCard delay={0.4} yOffset={50} className="absolute z-30 -left-2 sm:-left-6 top-[15%] w-[220px]">
            <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl p-3.5 shadow-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(38,92%,50%/0.1)] flex items-center justify-center text-[hsl(38,92%,50%)] text-lg">☕️</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">Starbucks</div>
                <div className="text-[11px] text-muted-foreground">Just now</div>
              </div>
              <div className="text-sm font-bold text-foreground">-₹350</div>
            </div>
          </FloatingCard>

          {/* Floating Widget 2: Goal Progress */}
          <FloatingCard delay={0.6} yOffset={30} className="absolute z-10 -right-2 sm:-right-4 bottom-[15%] w-[180px]">
            <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-lg text-center">
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-[hsl(262,83%,58%/0.2)] border-t-[hsl(262,83%,58%)] mb-3 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">80%</span>
              </div>
              <div className="text-sm font-semibold text-foreground">MacBook Pro</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Goal Progress</div>
            </div>
          </FloatingCard>

          {/* Floating Widget 3: Mini Chart */}
          <FloatingCard delay={0.5} yOffset={60} className="absolute z-20 right-[5%] sm:-right-8 top-[5%] w-[180px]">
            <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-lg">
              <div className="text-xs font-medium text-muted-foreground mb-3">Weekly Spending</div>
              <div className="flex items-end gap-1.5 h-12">
                {[40, 70, 45, 90, 60, 30, 80].map((h, i) => (
                  <div key={i} className="flex-1 bg-[hsl(217,91%,60%/0.6)] rounded-t-[2px]" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </FloatingCard>

          {/* Abstract floating shapes */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -z-10 w-[400px] h-[400px] opacity-20 pointer-events-none"
          >
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="hsl(262,83%,58%)" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-46.8C87.4,-34.5,90,-20,89.3,-5.8C88.5,8.3,84.4,22.3,77.3,34.8C70.2,47.3,60.1,58.3,47.8,65.8C35.5,73.3,21,77.3,6.2,79.5C-8.6,81.7,-23.7,82.1,-37.2,76.5C-50.7,70.9,-62.5,59.3,-71.7,46C-80.9,32.7,-87.5,17.7,-88.2,2.4C-88.9,-12.9,-83.7,-28.4,-74.6,-41C-65.5,-53.6,-52.6,-63.3,-38.7,-70.6C-24.8,-77.9,-10,-82.8,2.7,-86.6C15.4,-90.4,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;