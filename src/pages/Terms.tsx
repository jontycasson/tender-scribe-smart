import { Navigation } from "@/components/Navigation";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="prose prose-gray max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-2">Terms and Conditions</h1>
            
            <div className="text-sm text-muted-foreground mb-8 space-y-1">
              <p><strong>Effective Date:</strong> 05/09/2025</p>
              <p><strong>Company:</strong> Nodura Ltd ("Proposal.fit")</p>
              <p><strong>Company Number:</strong> 16619038</p>
              <p><strong>Jurisdiction:</strong> United Kingdom</p>
            </div>

            <hr className="border-border my-8" />

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Proposal.fit, a SaaS platform operated by Nodura Ltd. By accessing or using our services, you agree to be bound by these Terms and Conditions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Proposal.fit may not be used by:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Individuals under the age of 18</li>
                <li>Government entities outside the UK or EU</li>
                <li>Organisations involved in adult content, political lobbying, or similar sensitive sectors</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to suspend access to any user violating these restrictions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Proposal.fit is a tender automation and proposal drafting platform powered by artificial intelligence and third-party APIs. While we aim to provide high-quality and efficient service, we do not guarantee:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Continuous availability or uptime</li>
                <li>Fitness for a particular purpose</li>
                <li>The accuracy or completeness of AI-generated content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Account Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must provide accurate and complete information during onboarding and keep this information updated. We may suspend or terminate your account for any breach of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Intellectual Property</h2>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>You retain ownership of all content uploaded to and generated via your account.</li>
                <li>You also own all AI-generated output used in your tender submissions.</li>
                <li>Nodura Ltd retains ownership of the Proposal.fit platform, architecture, and related codebase.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Subscriptions & Fees</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Proposal.fit operates on a monthly subscription model, with optional annual plans.
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>We may offer a free trial at our discretion.</li>
                <li>Refunds will only be considered for annual subscribers. To request a refund, email <a href="mailto:info@proposal.fit" className="text-primary hover:underline">info@proposal.fit</a>.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services rely on third-party APIs (e.g., OpenAI, Google Document AI, Perplexity). We do not warrant their availability, security, or accuracy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. AI Disclaimer</h2>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Responses generated by AI may be inaccurate or incomplete.</li>
                <li>Users are solely responsible for verifying any AI-generated content before submission or publication.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We reserve the right to suspend or terminate your account immediately, without notice, for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Breach of these Terms</li>
                <li>Abusive behaviour or misuse</li>
                <li>Non-payment</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                Proposal.fit complies with GDPR. See our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and <a href="/data" className="text-primary hover:underline">Data Policy</a> for more details on how we handle your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To the fullest extent permitted by law, Nodura Ltd shall not be liable for any indirect, incidental, or consequential damages, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Loss of profits</li>
                <li>Loss of data</li>
                <li>Business interruption</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed exclusively by the laws of England and Wales. Any disputes will be resolved in UK courts.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions, contact us at <a href="mailto:info@proposal.fit" className="text-primary hover:underline">info@proposal.fit</a>.
              </p>
            </section>

            <hr className="border-border my-8" />

            <p className="text-muted-foreground leading-relaxed">
              By using Proposal.fit, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;