import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, Bell } from "lucide-react";
import { lumoAvatar } from "@/assets/personas";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#coach", label: "AI Coach" },
    { href: "#personas", label: "Personas" },
    { href: "#dashboard", label: "Dashboard" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 top-3 rounded-full ${
          scrolled ? "w-[94%] max-w-4xl" : "w-[96%] max-w-5xl"
        }`}
      >
        {/* animated gradient border wrapper */}
        <div className="relative rounded-full p-[1.5px] overflow-hidden">
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1/2 opacity-80"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(220,90%,70%), hsl(260,85%,75%), hsl(290,80%,75%), hsl(150,70%,70%), hsl(220,90%,70%))",
            }}
          />
          <div className="relative rounded-full bg-white/75 backdrop-blur-2xl shadow-[0_10px_40px_-10px_rgba(120,120,200,0.22)]">
            <div className={`flex items-center justify-between px-5 sm:px-6 transition-all duration-500 ${scrolled ? "h-12" : "h-14"}`}>
              <Link to="/" className="flex items-center gap-2 group">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(190,90%,85%)] via-[hsl(260,80%,88%)] to-[hsl(150,70%,82%)] p-[2px] shadow-[0_4px_16px_-4px_rgba(140,140,220,0.4)]"
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <img src={lumoAvatar} alt="Lumo" className="w-7 h-7 object-cover" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[hsl(150,80%,55%)] animate-pulse" />
                </motion.div>
                <span className="font-display text-base sm:text-lg font-bold tracking-tight">
                  FinTrack<span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,60%)]"> AI</span>
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-7 text-sm text-foreground/70">
                {links.map((l) => (
                  <a key={l.href} href={l.href} className="hover:text-foreground transition-colors relative group">
                    {l.label}
                    <span className="absolute left-0 -bottom-1 w-0 h-px bg-gradient-to-r from-[hsl(220,90%,60%)] to-[hsl(280,80%,65%)] group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Notification bell w/ dot */}
                <button
                  aria-label="Notifications"
                  className="relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-white/60 border border-white/80 hover:bg-white transition"
                >
                  <Bell className="w-4 h-4 text-foreground/70" />
                  <motion.span
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"
                  />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                </button>

                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full bg-white/60 border border-white/80 text-foreground/80 hover:text-foreground hover:bg-white transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Demo
                </Link>
                <Link
                  to="/login"
                  className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full text-foreground/80 hover:text-foreground transition-colors hidden sm:inline-block"
                >
                  Sign in
                </Link>
                <Link
                  to="/login?signup=1"
                  className="text-xs sm:text-sm px-4 py-2 rounded-full bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)] text-white font-medium shadow-[0_6px_20px_-6px_rgba(120,90,220,0.6)] hover:shadow-[0_10px_30px_-6px_rgba(120,90,220,0.8)] hover:-translate-y-0.5 transition-all"
                >
                  Sign up
                </Link>
                <button onClick={() => setOpen(!open)} className="md:hidden ml-1 p-2 rounded-full hover:bg-white/60" aria-label="Menu">
                  {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[82%] max-w-sm bg-white/95 backdrop-blur-2xl border-l border-white shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <img src={lumoAvatar} alt="Lumo" className="w-8 h-8 rounded-full" />
                  <span className="font-display font-bold">FinTrack AI</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 p-5 space-y-1">
                {links.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="block px-4 py-3 rounded-2xl text-base font-medium text-foreground/80 hover:bg-gradient-to-r hover:from-[hsl(220,100%,97%)] hover:to-[hsl(280,100%,98%)] transition"
                  >
                    {l.label}
                  </motion.a>
                ))}
              </nav>
              <div className="p-5 space-y-2 border-t border-slate-100">
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block text-center w-full px-4 py-3 rounded-full bg-white border border-slate-200 text-sm font-semibold"
                >
                  Try Demo
                </Link>
                <Link
                  to="/login?signup=1"
                  onClick={() => setOpen(false)}
                  className="block text-center w-full px-4 py-3 rounded-full bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,62%)] text-white text-sm font-semibold shadow-lg"
                >
                  Sign up free
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
