import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Shield, Database, Globe, Users, CreditCard, RefreshCw, Bug } from "lucide-react";
import Footer from "@/components/Footer";

const securityFeatures = [
  {
    icon: Lock,
    title: "Multi-factor Authentication",
    description: "Proposal.fit supports multi-factor authentication (MFA) for added account security. This ensures that only verified users can access sensitive business and tender information.",
  },
  {
    icon: Shield,
    title: "SOC 2 Type 2 Compliant",
    description: "We maintain SOC 2 Type 2 compliance for handling sensitive customer data. Enterprise and Team customers can access compliance reports through their dashboard.",
    badge: "SOC 2 TYPE 2",
  },
  {
    icon: Globe,
    title: "GDPR-Compliant Processing",
    description: "We use Google Document AI, deployed within the European Union, for all document processing. This ensures full GDPR alignment, with no data retention by default.",
    badge: "GDPR READY",
  },
  {
    icon: Database,
    title: "Data Encryption",
    description: "All customer data is encrypted at rest with AES-256 and in transit via TLS. Sensitive information like access tokens and keys are encrypted at the application level.",
  },
  {
    icon: Users,
    title: "Role-based Access Control",
    description: "Members of organizations can be granted access to specific resources based on their role and responsibilities within your organization.",
  },
  {
    icon: RefreshCw,
    title: "Automated Backups",
    description: "All customer databases are backed up every day with Point in Time Recovery allowing restoring the database to any point in time.",
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    description: "We use Stripe to process payments and do not store personal credit card information for any of our customers on our servers.",
  },
  {
    icon: Bug,
    title: "Vulnerability Management", 
    description: "We work with industry experts to conduct regular penetration tests and use various tools to scan our code for potential vulnerabilities.",
  },
];

const Security = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Security at Proposal.fit
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Proposal.fit is trusted by thousands of developers for building and deploying secure applications.
          </p>
        </section>

        {/* Security Features Grid */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map(({ icon: Icon, title, description, badge }) => (
              <Card key={title} className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="mb-4">
                    <Icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                    {description}
                  </p>
                  {badge && (
                    <Badge variant="secondary" className="self-start text-xs">
                      {badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Trust Section */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            Enterprise-Grade Security. GDPR-Ready.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            We understand the importance of handling your data with care. Proposal.fit is
            hosted in Europe where possible, supports full data export, and works only with
            trusted providers who meet SOC 2, ISO 27001, and GDPR standards.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Security;