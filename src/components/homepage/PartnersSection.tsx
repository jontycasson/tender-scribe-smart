export const PartnersSection = () => {
  return (
    <section className="py-8 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Security Features */}
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Enterprise Security
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              GDPR Compliant
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              EU Data Hosting
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};