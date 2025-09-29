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
      answer: "Your data security is our top priority. We're SOC2 compliant, use bank-level encryption, and process all documents within the EU. Your tender documents and responses are never used to train our AI models."
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
      answer: "Yes, we integrate with major CRM platforms including Salesforce, HubSpot, and Pipedrive (Gold plan and above). We also offer API access for custom integrations on our Platinum plan."
    },
    {
      question: "What support do you provide?",
      answer: "All plans include email support and access to our knowledge base. Gold and Platinum plans include priority support, and Platinum customers get a dedicated success manager plus SLA guarantees."
    },
    {
      question: "Can multiple team members collaborate on responses?",
      answer: "Absolutely! From our Silver plan onwards, you can invite team members, assign questions to specific experts, track progress in real-time, and maintain version control throughout the response process."
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