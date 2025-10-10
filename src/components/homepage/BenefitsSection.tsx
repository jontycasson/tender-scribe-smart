import { Clock, Target, Shield, Users, Zap, Brain } from "lucide-react";

export const BenefitsSection = () => {
  const benefits = [
    {
      icon: Clock,
      title: "Streamline Response Time",
      description: "Reduce tender response time from weeks to hours with AI-powered automation.",
      highlight: true
    },
    {
      icon: Target,
      title: "Improve Response Quality",
      description: "Generate consistent, comprehensive responses tailored to each requirement.",
      highlight: false
    },
    {
      icon: Brain,
      title: "Build Company Knowledge",
      description: "Our AI learns your company profile to deliver increasingly relevant responses.",
      highlight: false
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Assign questions, track progress, and maintain quality across your team.",
      highlight: false
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "GDPR compliant with EU data hosting and encrypted storage.",
      highlight: false
    },
    {
      icon: Zap,
      title: "Quick Setup",
      description: "Simple onboarding process. Upload your first tender and start immediately.",
      highlight: true
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Why Teams Choose Proposal.fit
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

        {/* Bottom Features */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">AI</div>
              <div className="text-sm text-muted-foreground">Analysis Engine</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">Cloud</div>
              <div className="text-sm text-muted-foreground">Based Platform</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">Secure</div>
              <div className="text-sm text-muted-foreground">EU Hosting</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">Modern</div>
              <div className="text-sm text-muted-foreground">Tech Stack</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};