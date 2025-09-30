import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const FinalCTASection = () => {
  const { user } = useAuth();

  const benefits = [
    "14-day free trial",
    "No credit card required", 
    "EU data processing",
    "Cancel anytime"
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-r from-primary/5 to-accent/10">
      <div className="max-w-4xl mx-auto text-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-5xl font-bold">
              Start Winning More Tenders Today
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join 500+ UK businesses already transforming their tender success with AI-powered responses
            </p>
          </div>

          {/* Benefits List */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-4">
              <Link to="/try">
                Try It Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" asChild>
              <Link to="/pricing">
                View Pricing Plans
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">£15M+</div>
                <div className="text-sm text-muted-foreground">Contracts Won</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">4.9/5</div>
                <div className="text-sm text-muted-foreground">Customer Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};