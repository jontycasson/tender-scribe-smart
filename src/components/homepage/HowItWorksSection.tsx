import { Upload, Cpu, Edit, Download } from "lucide-react";

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: Upload,
      title: "Upload Your Tender",
      description: "Simply upload any tender document (PDF, Word, Excel). Our AI instantly extracts all questions and requirements.",
      features: ["Supports all formats", "Automatic question detection", "Secure processing"]
    },
    {
      icon: Cpu,
      title: "AI Drafts Responses",
      description: "Our AI analyzes your company profile and generates tailored responses that match your brand voice and capabilities.",
      features: ["Uses your company data", "Industry-specific knowledge", "Compliance aware"]
    },
    {
      icon: Edit,
      title: "Review & Collaborate",
      description: "Edit responses with your team, assign questions to experts, and track progress in real-time before final submission.",
      features: ["Team collaboration", "Version control", "Quality assurance"]
    }
  ];

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From tender upload to winning response in 3 simple steps
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-border z-0">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full"></div>
                  </div>
                )}

                <div className="bg-background rounded-xl p-8 shadow-sm border relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-8 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>

                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mt-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>

                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {step.description}
                  </p>

                  <ul className="space-y-2">
                    {step.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-background rounded-xl p-8 shadow-sm border">
            <div className="flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-primary mr-2" />
              <span className="font-semibold">Ready to export?</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Export your completed response in Word, PDF, or Excel format, ready for submission.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};