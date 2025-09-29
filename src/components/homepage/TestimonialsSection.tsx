import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "Bid Manager",
      company: "TechBuild Solutions",
      content: "Proposal.fit transformed our tender process. We've reduced response time from 2 weeks to 2 days and our win rate has increased by 35%. The AI understands our business better than some of our junior staff!",
      rating: 5,
      avatar: "SM"
    },
    {
      name: "James Thompson",
      role: "Commercial Director", 
      company: "Green Infrastructure Ltd",
      content: "The AI-generated responses are incredibly accurate. It's like having a senior bid writer available 24/7. We've won 3 major contracts this quarter that we wouldn't have had time to bid for before.",
      rating: 5,
      avatar: "JT"
    },
    {
      name: "Emily Chen",
      role: "Business Development Manager",
      company: "DataSync Consulting",
      content: "As a small team, Proposal.fit levels the playing field. We can now compete with larger firms on major tenders. The collaboration features mean our whole team can contribute without stepping on each other's toes.",
      rating: 5,
      avatar: "EC"
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Loved by Tender Teams Across the UK
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how teams are transforming their tender success with Proposal.fit
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-card rounded-xl p-6 border shadow-sm relative">
              {/* Quote Icon */}
              <div className="absolute -top-3 left-6 bg-primary w-6 h-6 rounded-full flex items-center justify-center">
                <Quote className="h-3 w-3 text-primary-foreground" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4 pt-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed text-sm">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{testimonial.avatar}</span>
                </div>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">4.9/5</div>
              <div className="text-sm text-muted-foreground">User Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">98%</div>
              <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Support Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};