import { Navigation } from "@/components/Navigation";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="prose prose-gray max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
            
            <div className="text-sm text-muted-foreground mb-8 space-y-1">
              <p><strong>Effective Date:</strong> 05/09/2025</p>
              <p><strong>Company:</strong> Nodura Ltd (Company No. 16619038)</p>
              <p><strong>Product:</strong> Proposal.fit</p>
              <p><strong>Contact Email:</strong> info@proposal.fit</p>
            </div>

            <hr className="border-border my-8" />

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                At Proposal.fit, we are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, store, and share your data when you use our service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By using Proposal.fit, you agree to the practices described in this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Who We Are</h2>
              <p className="text-muted-foreground leading-relaxed">
                Proposal.fit is a product developed and operated by Nodura Ltd, a company registered in the United Kingdom. Our mission is to help businesses automate and improve tender response processes through the use of AI and document automation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect the following categories of data when you register for and use Proposal.fit:
              </p>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Personal Details:</h3>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Company name</li>
                  <li>Job title</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Usage & Behavioural Data:</h3>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
                  <li>Uploaded documents (e.g. RFPs, tenders)</li>
                  <li>Interaction logs (e.g. which features you use, how often)</li>
                  <li>Account preferences and settings</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Billing Data:</h3>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
                  <li>Payment method and transaction details (via third-party payment processors)</li>
                  <li>Subscription tier and renewal history</li>
                </ul>
              </div>

              <p className="text-muted-foreground leading-relaxed font-medium">
                ❗️We do not collect any sensitive personal data (e.g. health information, geolocation, biometric data).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. How We Use Your Data</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your data is used for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>To create and maintain your account</li>
                <li>To process uploaded documents and generate AI-powered tender responses</li>
                <li>To manage subscriptions and process payments</li>
                <li>To communicate with you about account activity, feature updates, or support requests</li>
                <li>To improve the performance and security of our service</li>
                <li>For anonymised usage analytics and service optimisation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We rely on reputable third-party services to power Proposal.fit. These services may process your data as sub-processors. These include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li><strong>Google Document AI (EU-hosted):</strong> Document analysis and OCR</li>
                <li><strong>Supabase (EU-hosted):</strong> Authentication, database, file storage, and edge functions</li>
                <li><strong>OpenAI (US-based):</strong> AI text generation</li>
                <li><strong>Google Analytics:</strong> Usage analytics and product improvement</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                🛠 We maintain a <a href="/security" className="text-primary hover:underline">Security & Sub-processors</a> page that outlines current infrastructure and partners. This may be updated from time to time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Where data is processed outside the UK or EU (e.g. by OpenAI in the United States), we rely on Standard Contractual Clauses (SCCs) as the legal mechanism for transfer, in compliance with GDPR.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your data will be retained for as long as you have an active account.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You can request complete deletion of your account and associated data by contacting us at <a href="mailto:info@proposal.fit" className="text-primary hover:underline">info@proposal.fit</a>.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Once deleted, your data will be removed from our systems and backups within a reasonable period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Your Rights (GDPR Compliance)</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you are based in the UK or EU, you have the following rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Access your data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing</li>
                <li>Port your data to another provider</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please email <a href="mailto:info@proposal.fit" className="text-primary hover:underline">info@proposal.fit</a>. We will respond within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Cookies</h2>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>We use essential cookies for session management and user authentication.</li>
                <li>We do not currently use tracking or marketing cookies.</li>
                <li>Users are passively notified about cookies via our interface — no banner is currently shown.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Children's Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                Proposal.fit is not intended for use by individuals under the age of 18. We do not knowingly collect data from minors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Updates to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. If significant changes are made, we will notify users via email or in-app notification.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions or concerns about your data or this policy, please contact us:
              </p>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>📩 Email: <a href="mailto:info@proposal.fit" className="text-primary hover:underline">info@proposal.fit</a></p>
                <p>🏢 Company: Nodura Ltd, UK</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;