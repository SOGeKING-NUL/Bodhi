import Navbar from "../components/Navbar";
import LandingBackground from "../components/landing-background";
import Hero from "../components/hero";
import DemoVideoSection from "../components/demo-video-section";
import AgentTypesSection from "../components/agent-types-section";
import FeaturesGridSection from "../components/features-grid-section";
import MarqueeSection from "../components/marquee-section";
import PricingSection from "../components/pricing-section";
import CTASection from "../components/cta-section";
import FooterSection from "../components/footer-section";

export default function LandingPage() {
  return (
    <div className="relative w-full min-h-screen bg-bodhi-bg overflow-x-hidden">
      <LandingBackground />

      <Navbar />

      <main className="relative z-10 flex flex-col items-center w-full">
        <Hero />
        <DemoVideoSection />
        <AgentTypesSection />
        <FeaturesGridSection />
        <MarqueeSection />
        <PricingSection />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  );
}
