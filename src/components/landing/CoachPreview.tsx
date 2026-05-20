import { motion } from "framer-motion";
import { lumoAvatar } from "@/assets/personas";
import BackgroundFX from "./BackgroundFX";
import HeroPhone from "./HeroPhone";

const chips = [
  "Analyze my spending",
  "Plan my vacation",
  "Reduce subscriptions",
  "Smart budgeting",
];

const CoachPreview = () => {
  return (
    <section id="coach" className="relative py-24 md:py-36 overflow-hidden">
      <BackgroundFX variant="soft" />
      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        {/* LEFT — mascot + heading */}
        <div className="relative flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative mb-8"
          >
            <motion.div
              animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(220,100%,82%)] via-[hsl(280,90%,84%)] to-[hsl(150,80%,84%)] blur-3xl"
            />
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.06 }}
              className="relative w-48 h-48 rounded-full bg-gradient-to-br from-white via-[hsl(220,100%,97%)] to-[hsl(280,80%,97%)] p-2 border border-white/80 shadow-[0_20px_60px_-15px_rgba(120,90,220,0.4)]"
            >
              <img
                src={lumoAvatar}
                alt="Lumo mascot"
                className="w-full h-full rounded-full object-cover"
              />
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-[hsl(220,90%,65%)]"
              />
              {/* Blink */}
              <motion.span
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 3.6 }}
                className="absolute top-[40%] left-[26%] w-2 h-2 bg-white/0"
              />
            </motion.div>

            {/* floating AI particles */}
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                animate={{
                  y: [-6, -30, -6],
                  opacity: [0, 0.7, 0],
                }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.6 }}
                className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[hsl(220,90%,70%)] to-[hsl(280,80%,72%)] shadow-[0_0_10px_hsl(260,80%,70%)]"
                style={{ left: `${20 + i * 22}%`, top: "10%" }}
              />
            ))}
          </motion.div>

          <p className="text-xs tracking-[0.25em] uppercase text-foreground/55 mb-3 font-medium">
            ✦ AI Coach
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.05]">
            Meet{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)]">
              Lumo
            </span>
            <br />Your money sidekick.
          </h2>
          <p className="mt-5 text-foreground/65 max-w-md leading-relaxed">
            A persona-aware AI that learns how you spend, saves you from
            overspending, and turns finance into a game you actually want to play.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
            {chips.map((c, i) => (
              <motion.span
                key={c}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08 }}
                whileHover={{ y: -2, scale: 1.04 }}
                className="text-xs px-3 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-white/90 text-foreground/75 hover:text-foreground transition-all shadow-sm cursor-pointer"
              >
                {c}
              </motion.span>
            ))}
          </div>
        </div>

        {/* RIGHT — premium phone with live AI chat */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
        >
          <HeroPhone />
        </motion.div>
      </div>
    </section>
  );
};

export default CoachPreview;
