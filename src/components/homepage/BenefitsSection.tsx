import { Clock, Target, Shield, Users, Zap, Brain } from "lucide-react";

export const BenefitsSection = () => {
  const benefits = [
    {
      icon: Clock,
      title: "Save 40+ Hours Per Tender",
      description: "Eliminate manual copy-paste work and reduce response time from weeks to hours.",
      highlight: true
    },
    {
      icon: Target,
      title: "Increase Win Rate by 30%",
      description: "AI-generated responses are more consistent, comprehensive, and compelling.",
      highlight: false
    },
    {
      icon: Brain,
      title: "Learn From Every Response",
      description: "Our AI builds institutional memory, improving accuracy with each tender.",
      highlight: false
    },
    {
      icon: Users,
      title: "Built for Team Collaboration",
      description: "Assign questions, track progress, and maintain quality across your team.",
      highlight: false
    },
    {
      icon: Shield,
      title: "Enterprise-Grade Security",
      description: "SOC2 compliant with EU data processing and bank-level encryption.",
      highlight: false
    },
    {
      icon: Zap,
      title: "Deploy in Minutes",
      description: "No complex setup required. Upload your first tender and start winning.",
      highlight: true
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Why Leading Teams Choose Proposal.fit
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your tender response process with AI that understands your business
          </p>
        </div>

        {/* Bento Box Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className={`p-6 rounded-xl border transition-all hover:shadow-lg ${
                  benefit.highlight 
                    ? 'bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20' 
                    : 'bg-card hover:bg-accent/5'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  benefit.highlight ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Icon className={`h-6 w-6 ${benefit.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">2,000+</div>
              <div className="text-sm text-muted-foreground">Tenders Processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">£15M+</div>
              <div className="text-sm text-muted-foreground">Contract Value Won</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">40,000+</div>
              <div className="text-sm text-muted-foreground">Hours Saved</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};