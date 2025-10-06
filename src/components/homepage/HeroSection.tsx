import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Win More Tenders with 
                <span className="text-primary block">AI-Powered Responses</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Transform complex tender documents into winning responses in minutes, not days. 
                Proposal.fit's AI analyses requirements and generates tailored answers using your company profile.
              </p>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full border-2 border-background"></div>
                <div className="w-8 h-8 bg-secondary rounded-full border-2 border-background"></div>
                <div className="w-8 h-8 bg-accent rounded-full border-2 border-background"></div>
              </div>
              <span>Trusted by 500+ SMEs across the UK</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-lg px-8 py-4">
                <Link to="/try">
                  Try It Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t">
              <div>
                <div className="text-2xl font-bold text-primary">10x</div>
                <div className="text-sm text-muted-foreground">Faster responses</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">95%</div>
                <div className="text-sm text-muted-foreground">Accuracy rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">40+</div>
                <div className="text-sm text-muted-foreground">Hours saved per tender</div>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-accent/20 rounded-2xl p-8">
              {/* Mock Dashboard */}
              <div className="bg-background rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-primary text-primary-foreground px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary-foreground/30 rounded-full"></div>
                    <div className="w-3 h-3 bg-primary-foreground/30 rounded-full"></div>
                    <div className="w-3 h-3 bg-primary-foreground/30 rounded-full"></div>
                    <div className="ml-4 font-medium">Proposal.fit Dashboard</div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">NHS Digital Transformation</div>
                    <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">Complete</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Council Infrastructure Project</div>
                    <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">Processing</div>
                  </div>
                  
                  <div className="bg-primary/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium">AI Analysis Complete</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      32 questions • Responses generated in 2.8 minutes
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-background rounded-lg shadow-lg p-3">
              <div className="text-sm font-medium text-primary">⚡ 40hrs saved</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-background rounded-lg shadow-lg p-3">
              <div className="text-sm font-medium text-primary">🎯 95% accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
