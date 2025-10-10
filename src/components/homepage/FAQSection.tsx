import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQSection = () => {
  const faqs = [
    {
      question: "How does the free trial work?",
      answer: "You get full access to Proposal.fit for 14 days with no credit card required. You can process up to 3 tenders during your trial to experience the full capability of our AI-powered platform."
    },
    {
      question: "What tender formats do you support?",
      answer: "We support all major document formats including PDF, Word (.docx), Excel (.xlsx), and even scanned documents. Our AI can extract questions from complex layouts, tables, and forms automatically."
    },
    {
      question: "How secure is my company data?",
      answer: "Your data security is our top priority. We use Supabase, a SOC 2 Type 2 and ISO 27001 certified platform with enterprise-grade security. All data is encrypted in transit and at rest, stored securely on AWS infrastructure with PostgreSQL Row Level Security policies. Your tender documents and responses are never used to train our AI models and remain completely private to your company."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time with no penalties. You'll retain access to your account until the end of your billing period, and you can export all your data before canceling."
    },
    {
      question: "How accurate are the AI-generated responses?",
      answer: "Our AI achieves 95%+ accuracy on initial drafts. The responses are generated using your company profile, past successful submissions, and industry best practices. You always have full control to review and edit before submission."
    },
    {
      question: "Do you integrate with existing CRM systems?",
      answer: "CRM integrations are not currently available but are a key priority on our product roadmap. We're actively developing integrations with major platforms including Salesforce, HubSpot, and Pipedrive, with planned release in early 2025. API access for custom integrations will also be available on our Enterprise plan."
    },
    {
      question: "What support do you provide?",
      answer: "All plans include email support and access to our knowledge base. Pro and Enterprise plans include priority support, and Enterprise customers get a dedicated support manager plus SLA guarantees."
    },
    {
      question: "Can multiple team members collaborate on responses?",
      answer: "Absolutely! You can invite team members to your company with different permission levels. Company owners and admins can manage the team, edit company profiles, and invite new members. Regular team members have view-only access to company information but can collaborate on tender responses. This ensures your company data stays secure while enabling effective team collaboration."
    },
    {
      question: "How do I manage my account and team members?",
      answer: "Access your Account Settings from the user menu in the top right corner. Here you can update your email, change your password, edit your company profile, and manage your team. Owners and admins can add or remove team members, assign roles (admin or member), and control who has permission to edit company information."
    },
    {
      question: "What's the difference between owner, admin, and member roles?",
      answer: "Owners are the users who created the company profile and have full control. Admins can manage team members, invite new users, and edit company information. Members have view-only access to company settings but can work on tender responses. This role-based system ensures secure collaboration while maintaining data integrity."
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Yes, you can change your plan at any time. When upgrading, you'll get immediate access to new features and any price difference will be prorated. When downgrading, the change will take effect at the end of your current billing period, and you'll keep access to your current plan's features until then."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "If you cancel your subscription, you'll retain access until the end of your billing period. You can export all your tender responses, company profile, and documents at any time. After your subscription ends, your data is retained for 30 days in case you choose to reactivate, after which it's permanently deleted."
    },
    {
      question: "Are there any limits on tender processing?",
      answer: "All plans include unlimited AI-powered tender responses. You can process as many tenders as you need each month with no hidden fees or per-tender charges. The main difference between plans is the number of team seats included and advanced features like workflow automation and API access."
    },
    {
      question: "Do I need a credit card for the free trial?",
      answer: "No credit card required! Simply sign up with your email address and you'll get immediate access to the platform for 14 days. You can process up to 3 complete tenders during your trial period to fully experience how Proposal.fit can transform your tender response process."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit and debit cards including Visa, Mastercard, and American Express. All payments are processed securely through Stripe, and your payment information is never stored on our servers. We also offer invoice billing for Enterprise customers."
    },
    {
      question: "Can I get a refund if I'm not satisfied?",
      answer: "Yes, we offer a 30-day money-back guarantee. If you're not completely satisfied with Proposal.fit within the first 30 days of your subscription, contact our support team for a full refund, no questions asked."
    }
  ];

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about Proposal.fit
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-background rounded-lg border px-6"
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Still have questions? Our team is here to help.
          </p>
          <a 
            href="mailto:support@proposal.fit" 
            className="text-primary hover:underline font-medium"
          >
            Contact Support →
          </a>
        </div>
      </div>
    </section>
  );
};