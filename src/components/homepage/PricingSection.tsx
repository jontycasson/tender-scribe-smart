import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const featuredPlans = [
  {
    name: "Starter",
    price: "£113.99",
    period: "month",
    seats: 2,
    bestFor: "Small Teams",
    features: [
      "Unlimited AI-powered tender responses",
      "AI-assisted drafting for faster bids",
      "Document ingestion (Word, PDF, TXT, RTF)",
      "Shared workspace & document library",
      "Company profile auto-fill",
      "Response memory (reuse approved answers)"
    ],
    highlight: false
  },
  {
    name: "Pro",
    price: "£136.99",
    period: "month",
    seats: 5,
    bestFor: "Growing Teams",
    features: [
      "Everything in Starter, plus:",
      "Advanced AI drafting (tone optimisation)",
      "Workflow & approval routing",
      "Team collaboration tools",
      "Priority support"
    ],
    highlight: true
  },
  {
    name: "Enterprise",
    price: "£164.99",
    period: "month",
    seats: 10,
    bestFor: "Larger Teams & Scale-ups",
    features: [
      "Everything in Pro, plus:",
      "API access for integrations",
      "SLA included",
      "Dedicated support manager",
      "Team onboarding training"
    ],
    highlight: false
  }
];

export const PricingSection = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start winning more tenders today. All plans include our AI-powered response generation.
          </p>
        </div>

        {/* Featured Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {featuredPlans.map((plan) => (
            <Card 
              key={plan.name}
              className={`relative ${plan.highlight ? 'border-primary shadow-lg bg-gradient-to-b from-background to-accent/10 scale-105' : 'bg-card'}`}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold mb-2">{plan.name}</CardTitle>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground text-sm"> / month</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {plan.seats} seat{plan.seats > 1 ? 's' : ''} • {plan.bestFor}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.highlight ? 'bg-primary hover:bg-primary/90' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  asChild
                >
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Need a Solo plan for freelancers? We also offer a 1-seat plan at £94.99/month.
          </p>
          <Button variant="ghost" asChild>
            <Link to="/pricing" className="inline-flex items-center gap-2">
              View All Plans <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};