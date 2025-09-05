import { Navigation } from "@/components/Navigation";
import Footer from "@/components/Footer";

const AcceptableUse = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="prose prose-gray max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-2">Acceptable Use Policy (AUP)</h1>
            
            <div className="text-sm text-muted-foreground mb-8 space-y-1">
              <p><strong>Effective Date:</strong> September 2025</p>
              <p><strong>Owner:</strong> Nodura Ltd (Company No. 16619038)</p>
              <p><strong>Applies to:</strong> All users of Proposal.fit</p>
            </div>

            <hr className="border-border my-8" />

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Purpose</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Acceptable Use Policy ("AUP") sets out the rules governing the use of the Proposal.fit platform and services provided by Nodura Ltd. By accessing or using Proposal.fit, you agree to comply with this AUP and ensure any users within your organisation do the same.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Prohibited Users</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Use of Proposal.fit is strictly prohibited for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Minors (under 18 years of age)</li>
                <li>Government entities outside the United Kingdom</li>
                <li>Organisations involved in:
                  <ul className="list-disc list-inside space-y-1 ml-6 mt-2">
                    <li>Adult content, pornography, or escort services</li>
                    <li>Political lobbying or campaign organisations</li>
                    <li>Activities prohibited by UK law</li>
                  </ul>
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to suspend or terminate access if use by prohibited users is detected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You may not, under any circumstances, use Proposal.fit to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Upload, store, or process unlawful, harmful, or offensive material.</li>
                <li>Violate data privacy laws (including GDPR or equivalent).</li>
                <li>Attempt to reverse-engineer, decompile, or tamper with any part of the service.</li>
                <li>Circumvent usage limits or API usage quotas.</li>
                <li>Upload malware, bots, or run automated penetration tests.</li>
                <li>Use the AI capabilities to generate false, discriminatory, or misleading content.</li>
                <li>Resell, sublicense, or redistribute Proposal.fit without explicit written permission.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Fair Use Limits</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To maintain service quality for all users, Proposal.fit enforces reasonable usage limits on:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Number of document uploads</li>
                <li>Number of API calls (OpenAI, Perplexity, OCR)</li>
                <li>Concurrent usage per account</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Abuse of these limits may result in temporary throttling, additional charges, or account suspension.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Security & Account Responsibility</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Keeping your login credentials secure</li>
                <li>Ensuring your team members follow this AUP</li>
                <li>Notifying us immediately of any suspected unauthorised access</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Accounts found to be compromised or used in breach of this policy may be suspended without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Enforcement</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Violations of this AUP may result in:
              </p>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 ml-4">
                <li>Immediate account suspension or termination</li>
                <li>Revocation of access to Proposal.fit services</li>
                <li>Legal action where applicable</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to monitor usage patterns and investigate suspected misuse.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact & Reporting</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To report abuse or misuse of Proposal.fit, please contact:
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                📧 <a href="mailto:info@proposal.fit" className="text-primary hover:underline">info@proposal.fit</a>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We review all reports and take appropriate action to protect the integrity of the service.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptableUse;