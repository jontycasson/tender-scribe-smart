import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lock, FileText, Brain, Database } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Multi-Factor Authentication",
    text: "Proposal.fit supports multi-factor authentication (MFA) for added account security. This ensures that only verified users can access sensitive business and tender information.",
  },
  {
    icon: FileText,
    title: "GDPR-Compliant AI Document Processing",
    text: "We use Google Document AI, deployed within the European Union, for all document processing. This ensures full GDPR alignment, with no data retention by default.",
  },
  {
    icon: Brain,
    title: "Secure AI Responses via OpenAI",
    text: "Proposal responses are generated via GPT-4 on Microsoft Azure infrastructure, with enterprise-grade encryption and zero data retention. Your data is never used to train public models.",
  },
  {
    icon: Database,
    title: "Supabase Data Storage",
    text: "Proposal data is stored in Supabase (PostgreSQL) with encryption at rest (AES-256), in transit (TLS), and protected by row-level security. Supabase is SOC 2 and HIPAA compliant.",
  },
];

const Security = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navigation />
      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Security at Proposal.fit
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            Proposal.fit is built with privacy and security at its core. We use trusted 
            infrastructure and industry-leading AI tools to ensure your tender data stays 
            safe, private, and fully compliant.
          </p>
        </section>

        <Separator className="my-2" />

        {/* 4-card grid */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="border-slate-200">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-md border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-2" />

        {/* Final statement */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Enterprise-Grade Security. GDPR-Ready.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            We understand the importance of handling your data with care. Proposal.fit is
            hosted in Europe where possible, supports full data export, and works only with
            trusted providers who meet SOC 2, ISO 27001, and GDPR standards.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Security;