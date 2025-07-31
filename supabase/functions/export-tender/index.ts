import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenderId, format } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tender data and responses
    const { data: tenderData, error: tenderError } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

    if (tenderError) throw tenderError;

    const { data: responsesData, error: responsesError } = await supabase
      .from('tender_responses')
      .select('*')
      .eq('tender_id', tenderId)
      .order('created_at');

    if (responsesError) throw responsesError;

    // Get company profile
    const { data: profileData } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', tenderData.user_id)
      .single();

    // Generate export content
    const exportContent = generateExportContent(tenderData, responsesData, profileData);

    // For this example, we'll return plain text
    // In a real implementation, you'd use a document generation service
    let responseContent: string;
    let contentType: string;

    const normalizedFormat = format.toLowerCase();
    
    switch (normalizedFormat) {
      case 'pdf':
        // In a real implementation, you'd use a PDF generation service
        responseContent = exportContent;
        contentType = 'application/pdf';
        break;
      case 'docx':
        // In a real implementation, you'd use a DOCX generation service
        responseContent = exportContent;
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'xlsx':
        // In a real implementation, you'd use an XLSX generation service
        responseContent = exportContent;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return new Response(responseContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="tender-response.${normalizedFormat}"`,
      },
    });

  } catch (error) {
    console.error('Error in export-tender function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateExportContent(tender: any, responses: any[], profile: any): string {
  const date = new Date().toLocaleDateString();
  
  let content = `
TENDER RESPONSE
================

Tender Title: ${tender.title}
Date: ${date}
Company: ${profile?.company_name || 'N/A'}

COMPANY OVERVIEW
================
Industry: ${profile?.industry || 'N/A'}
Team Size: ${profile?.team_size || 'N/A'}
Years in Business: ${profile?.years_in_business || 'N/A'}
Mission: ${profile?.mission || 'N/A'}

RESPONSES
=========

`;

  responses.forEach((response, index) => {
    const finalAnswer = response.user_edited_answer || response.ai_generated_answer;
    content += `
${index + 1}. ${response.question}

${finalAnswer}

---

`;
  });

  content += `
COMPANY CONTACT INFORMATION
===========================
Please contact us for any clarifications or additional information.

Generated on ${date} by TenderFlow
`;

  return content;
}