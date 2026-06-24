import { Link } from "react-router-dom";
import { Twitter, Github, Linkedin, Instagram } from "lucide-react";
import { lumoAvatar } from "@/assets/personas";

const Footer = () => {
  return (
    <footer className="relative pt-16 pb-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-[hsl(220,100%,98%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
        <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-[0_10px_40px_-15px_rgba(120,90,220,0.18)] p-8 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(220,90%,80%)] to-[hsl(280,80%,82%)] p-[2px]">
                  <img src={lumoAvatar} alt="" className="w-full h-full rounded-full" />
                </div>
                <span className="font-display text-lg font-bold">
                  FinTrack<span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,90%,55%)] to-[hsl(280,80%,60%)]"> AI</span>
                </span>
              </Link>
              <p className="text-sm text-foreground/65 max-w-xs leading-relaxed">
                Your AI-powered financial universe. Built for the next generation of money.
              </p>
              <div className="flex gap-2 mt-5">
                {[Twitter, Github, Linkedin, Instagram].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-full bg-white border border-white/90 shadow-sm flex items-center justify-center text-foreground/60 hover:text-foreground hover:-translate-y-0.5 transition-all">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: "Product", links: ["Features", "AI Coach", "Personas", "Dashboard"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-3">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-foreground/75 hover:text-foreground transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-white/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-foreground/55">© 2026 TrackMint · Crafted with love + Lumo.</p>
            <p className="text-xs text-foreground/55">Made for the next-gen money mind.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
