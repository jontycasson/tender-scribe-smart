import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  const features = [
    {
      icon: "🚀",
      title: "Early Access Program",
      description: "Join forward-thinking businesses testing Proposal.fit's AI-powered tender response system. Get hands-on with features designed to streamline your bidding process."
    },
    {
      icon: "🤝",
      title: "Collaborative Approach",
      description: "We're building this with you. Early users help shape the product roadmap and get priority access to new features as we develop them together.",
    },
    {
      icon: "💡",
      title: "Dedicated Onboarding",
      description: "Our team works directly with early access users to ensure Proposal.fit fits seamlessly into your existing tender workflow and company processes.",
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Join Our Early Access Program
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Be part of shaping the future of tender response automation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-card rounded-xl p-6 border shadow-sm">
              {/* Icon */}
              <div className="text-4xl mb-4">{feature.icon}</div>

              {/* Title */}
              <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Features */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Beta</div>
              <div className="text-sm text-muted-foreground">Early Access</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Active</div>
              <div className="text-sm text-muted-foreground">Development</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Direct</div>
              <div className="text-sm text-muted-foreground">Team Support</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Cloud</div>
              <div className="text-sm text-muted-foreground">Based Platform</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};