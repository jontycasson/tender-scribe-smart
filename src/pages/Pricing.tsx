import { Navigation } from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pricingPlans = [
  {
    name: "Solo",
    price: "£94.99",
    period: "year",
    seats: 1,
    bestFor: "Freelancers & Micro-SMEs",
    features: [
      "Unlimited AI-powered tender responses",
      "AI-assisted drafting for faster bids",
      "Document ingestion (Word, PDF, TXT, RTF)",
      "Smart segmentation (questions vs. context)",
      "Export responses (Word/PDF)",
      "Onboarding included"
    ],
    highlight: false
  },
  {
    name: "Starter", 
    price: "£113.99",
    period: "year",
    seats: 2,
    bestFor: "Small Teams",
    features: [
      "Everything in Solo, plus:",
      "Shared workspace for collaboration",
      "Document library for storing responses",
      "Company profile auto-fill",
      "Response memory (reuse approved answers)",
      "Basic training included"
    ],
    highlight: false
  },
  {
    name: "Pro",
    price: "£136.79", 
    period: "year",
    seats: 5,
    bestFor: "Growing Teams",
    features: [
      "Everything in Starter, plus:",
      "Advanced AI drafting (tone optimisation, contextual matching)",
      "Workflow & approval routing",
      "Team collaboration tools",
      "Priority support"
    ],
    highlight: true
  },
  {
    name: "Enterprise",
    price: "£164.15",
    period: "year", 
    seats: 10,
    bestFor: "Scale-ups & Larger Teams",
    features: [
      "Everything in Pro, plus:",
      "API access for integrations",
      "SLA included",
      "Dedicated support manager",
      "Onboarding training for teams"
    ],
    highlight: false
  }
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-16">
              Choose the perfect plan for your team. All plans include unlimited AI-powered tender responses and smart document processing.
            </p>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {pricingPlans.map((plan) => (
                <Card 
                  key={plan.name} 
                  className={`relative ${plan.highlight ? 'border-primary shadow-lg bg-gradient-to-b from-background to-accent/5' : 'bg-card'}`}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-primary">{plan.price}</span>
                      <span className="text-muted-foreground"> / {plan.period}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>{plan.seats}</strong> included seat{plan.seats > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {plan.bestFor}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <Button 
                      className={`w-full mb-6 ${plan.highlight ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={plan.highlight ? 'default' : 'outline'}
                    >
                      Get Started
                    </Button>
                    
                    <ul className="space-y-3 text-left">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="mt-20 text-center">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="text-muted-foreground mb-6">
                Our team is here to help you choose the right plan for your business.
              </p>
              <Button variant="outline">
                Contact Sales
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;