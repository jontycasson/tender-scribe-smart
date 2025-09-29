export const PartnersSection = () => {
  return (
    <section className="py-8 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Security Badges */}
        <div className="text-center">
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