import { Navigation } from "@/components/Navigation";
import { SplitHeroVariant } from "@/components/homepage/SplitHeroVariant";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <SplitHeroVariant />
      <Footer />
    </div>
  );
};

export default Index;
