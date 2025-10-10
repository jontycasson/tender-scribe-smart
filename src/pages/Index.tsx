import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/homepage/HeroSection";
import { PartnersSection } from "@/components/homepage/PartnersSection";
import { BenefitsSection } from "@/components/homepage/BenefitsSection";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";
import { PricingSection } from "@/components/homepage/PricingSection";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";
import { FAQSection } from "@/components/homepage/FAQSection";
import { FinalCTASection } from "@/components/homepage/FinalCTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <PartnersSection />
        <div id="benefits">
          <BenefitsSection />
        </div>
        <div id="how-it-works">
          <HowItWorksSection />
        </div>
        <div id="pricing">
          <PricingSection />
        </div>
        <div id="faq">
          <FAQSection />
        </div>
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
