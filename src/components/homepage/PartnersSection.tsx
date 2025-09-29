export const PartnersSection = () => {
  const partners = [
    { name: "Microsoft", logo: "M" },
    { name: "AWS", logo: "AWS" },
    { name: "Google Cloud", logo: "GC" },
    { name: "OpenAI", logo: "AI" },
    { name: "Supabase", logo: "SB" },
    { name: "Crown Commercial", logo: "CC" }
  ];

  return (
    <section className="py-16 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm text-muted-foreground mb-8">
            Trusted by teams at leading companies and built with enterprise-grade technology
          </p>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center">
            {partners.map((partner) => (
              <div key={partner.name} className="flex items-center justify-center">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">{partner.logo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Security Badges */}
        <div className="text-center pt-8 border-t">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              SOC2 Compliant
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              GDPR Ready
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              EU Data Processing
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};