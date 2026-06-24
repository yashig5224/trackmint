import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import CoachPreview from "@/components/landing/CoachPreview";
import AbilitiesSection from "@/components/landing/AbilitiesSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import ProblemSolution from "@/components/landing/ProblemSolution";
import HowItWorks from "@/components/landing/HowItWorks";
import DemoVsUser from "@/components/landing/DemoVsUser";
import StatsAndTestimonials from "@/components/landing/StatsAndTestimonials";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import AmbientLayer from "@/components/landing/AmbientLayer";
import PricingPreview from "@/components/landing/PricingPreview";
import SEO from "@/components/seo/SEO";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-white text-foreground overflow-x-hidden">
      <SEO
        title="TrackMint — AI budget planner & financial coach"
        description="An AI budget planner and 24/7 financial coach. Automate tracking, set goals, and get personalized money advice across GPT, Gemini, and Claude."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "TrackMint",
            url: "https://finbee.lovable.app",
            logo: "https://finbee.lovable.app/icons/icon-512.png",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "TrackMint",
            url: "https://finbee.lovable.app",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://finbee.lovable.app/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />

      <AmbientLayer />
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <CoachPreview />
        <AbilitiesSection />
        <DashboardPreview />
        <ProblemSolution />
        <HowItWorks />
        <DemoVsUser />
        <StatsAndTestimonials />
        <PricingPreview />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
