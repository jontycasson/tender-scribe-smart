import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptchaToken?: string;
}

// Helper: Send email via Resend API
async function sendEmailViaResend(
  to: string[],
  from: string,
  subject: string,
  html: string,
  text: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📩 Contact form submission received");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { name, email, subject, message }: ContactFormRequest = await req.json();

    // Basic validation
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // ---- 1. Send to your Proposal.fit inbox ----
    await sendEmailViaResend(
      ["info@proposal.fit"],
      "Proposal.fit Contact <info@proposal.fit>",
      `Contact Form: ${subject}`,
      `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color:#f5f5f5;padding:15px;border-left:4px solid #007bff;margin:15px 0;">
          ${message.replace(/\n/g, "<br>")}
        </div>
        <hr>
        <p style="color:#666;font-size:12px;">This message was sent via the Proposal.fit contact form.</p>
      `,
      `
New Contact Form Submission

From: ${name} (${email})
Subject: ${subject}

Message:
${message}

---
This message was sent via the Proposal.fit contact form.
      `
    );

    // ---- 2. Send confirmation copy to the user ----
    await sendEmailViaResend(
      [email],
      "Proposal.fit Contact <info@proposal.fit>",
      `We’ve received your message: ${subject}`,
      `
        <h2>Thanks for contacting Proposal.fit!</h2>
        <p>Hi ${name},</p>
        <p>We’ve received your message and will get back to you soon.</p>
        <p><strong>Your message:</strong></p>
        <div style="background-color:#f5f5f5;padding:15px;border-left:4px solid #28a745;margin:15px 0;">
          ${message.replace(/\n/g, "<br>")}
        </div>
        <p style="color:#666;font-size:12px;">This is an automated copy for your records.</p>
      `,
      `
Thanks for contacting Proposal.fit!

Hi ${name},

We’ve received your message and will get back to you soon.

Your message:
${message}

---
This is an automated copy for your records.
      `
    );

    console.log("✅ Emails sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your message has been sent successfully!",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in send-contact-email:", error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
