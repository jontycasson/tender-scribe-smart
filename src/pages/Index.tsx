import { Navigation } from "@/components/Navigation";
import { SplitHeroVariant } from "@/components/homepage/SplitHeroVariant";
import { PricingSection } from "@/components/homepage/PricingSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <SplitHeroVariant />
      <PricingSection />
      <Footer />
    </div>
  );
};

export default Index;
