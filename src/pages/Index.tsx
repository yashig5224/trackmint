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

const Index = () => {
  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <CoachPreview />
      
      <AbilitiesSection />
      <DashboardPreview />
      <ProblemSolution />
      <HowItWorks />
      <DemoVsUser />
      <StatsAndTestimonials />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
