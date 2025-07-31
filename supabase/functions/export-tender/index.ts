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

    const normalizedFormat = format.toLowerCase();
    
    let responseContent: string;
    let contentType: string;
    let filename: string;

    switch (normalizedFormat) {
      case 'pdf':
        // For now, return as text that can be copied to a PDF generator
        responseContent = generateTextContent(tenderData, responsesData, profileData);
        contentType = 'text/plain';
        filename = `tender-response.txt`;
        break;
      case 'docx':
        // Generate RTF format that Word can open
        responseContent = generateRTF(tenderData, responsesData, profileData);
        contentType = 'application/rtf';
        filename = `tender-response.rtf`;
        break;
      case 'xlsx':
        // Generate proper CSV that Excel can import
        responseContent = generateCSV(tenderData, responsesData, profileData);
        contentType = 'text/csv';
        filename = `tender-response.csv`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return new Response(responseContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
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

function generateTextContent(tender: any, responses: any[], profile: any): string {
  const date = new Date().toLocaleDateString();
  
  let content = `TENDER RESPONSE\n`;
  content += `================\n\n`;
  content += `Tender Title: ${tender.title}\n`;
  content += `Date: ${date}\n`;
  content += `Company: ${profile?.company_name || 'N/A'}\n`;
  content += `Status: ${tender.status}\n`;
  content += `Value: ${tender.value ? `$${tender.value}` : 'Not specified'}\n`;
  content += `Deadline: ${tender.deadline || 'Not specified'}\n\n`;

  content += `COMPANY OVERVIEW\n`;
  content += `================\n`;
  content += `Industry: ${profile?.industry || 'N/A'}\n`;
  content += `Team Size: ${profile?.team_size || 'N/A'}\n`;
  content += `Years in Business: ${profile?.years_in_business || 'N/A'}\n`;
  content += `Mission: ${profile?.mission || 'N/A'}\n\n`;

  content += `RESPONSES\n`;
  content += `=========\n\n`;

  responses.forEach((response, index) => {
    const finalAnswer = response.user_edited_answer || response.ai_generated_answer || 'No response provided';
    content += `${index + 1}. ${response.question}\n\n`;
    content += `Answer: ${finalAnswer}\n`;
    content += `Status: ${response.is_approved ? 'Approved' : 'Draft'}\n`;
    content += `\n${'='.repeat(50)}\n\n`;
  });

  content += `COMPANY CONTACT INFORMATION\n`;
  content += `===========================\n`;
  content += `Please contact us for any clarifications or additional information.\n\n`;
  content += `Generated on ${date} by TenderFlow\n`;

  return content;
}

function generateRTF(tender: any, responses: any[], profile: any): string {
  const date = new Date().toLocaleDateString();
  
  let rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}`;
  rtf += `\\f0\\fs24`;
  
  // Title
  rtf += `{\\b\\fs28 TENDER RESPONSE}\\par\\par`;
  
  // Basic Info
  rtf += `{\\b Tender Title:} ${tender.title}\\par`;
  rtf += `{\\b Date:} ${date}\\par`;
  rtf += `{\\b Company:} ${profile?.company_name || 'N/A'}\\par`;
  rtf += `{\\b Status:} ${tender.status}\\par`;
  rtf += `{\\b Value:} ${tender.value ? `$${tender.value}` : 'Not specified'}\\par`;
  rtf += `{\\b Deadline:} ${tender.deadline || 'Not specified'}\\par\\par`;
  
  // Company Overview
  rtf += `{\\b\\fs26 COMPANY OVERVIEW}\\par`;
  rtf += `{\\b Industry:} ${profile?.industry || 'N/A'}\\par`;
  rtf += `{\\b Team Size:} ${profile?.team_size || 'N/A'}\\par`;
  rtf += `{\\b Years in Business:} ${profile?.years_in_business || 'N/A'}\\par`;
  rtf += `{\\b Mission:} ${profile?.mission || 'N/A'}\\par\\par`;
  
  // Responses
  rtf += `{\\b\\fs26 RESPONSES}\\par\\par`;
  
  responses.forEach((response, index) => {
    const finalAnswer = response.user_edited_answer || response.ai_generated_answer || 'No response provided';
    rtf += `{\\b ${index + 1}. ${response.question.replace(/[{}\\]/g, '')}}\\par\\par`;
    rtf += `{\\b Answer:} ${finalAnswer.replace(/[{}\\]/g, '')}\\par`;
    rtf += `{\\b Status:} ${response.is_approved ? 'Approved' : 'Draft'}\\par\\par`;
    rtf += `\\line\\par`;
  });
  
  rtf += `{\\b COMPANY CONTACT INFORMATION}\\par`;
  rtf += `Please contact us for any clarifications or additional information.\\par\\par`;
  rtf += `Generated on ${date} by TenderFlow\\par`;
  rtf += `}`;
  
  return rtf;
}

function generateCSV(tender: any, responses: any[], profile: any): string {
  const date = new Date().toLocaleDateString();
  
  let csv = '"Section","Field","Value"\n';
  
  // Tender Information
  csv += `"Tender Information","Title","${escapeCSV(tender.title)}"\n`;
  csv += `"Tender Information","Date","${date}"\n`;
  csv += `"Tender Information","Status","${tender.status}"\n`;
  csv += `"Tender Information","Value","${tender.value ? `$${tender.value}` : 'Not specified'}"\n`;
  csv += `"Tender Information","Deadline","${tender.deadline || 'Not specified'}"\n`;
  
  // Company Profile
  csv += `"Company Profile","Company Name","${escapeCSV(profile?.company_name || 'N/A')}"\n`;
  csv += `"Company Profile","Industry","${escapeCSV(profile?.industry || 'N/A')}"\n`;
  csv += `"Company Profile","Team Size","${escapeCSV(profile?.team_size || 'N/A')}"\n`;
  csv += `"Company Profile","Years in Business","${escapeCSV(profile?.years_in_business || 'N/A')}"\n`;
  csv += `"Company Profile","Mission","${escapeCSV(profile?.mission || 'N/A')}"\n`;
  
  // Responses
  responses.forEach((response, index) => {
    const finalAnswer = response.user_edited_answer || response.ai_generated_answer || 'No response provided';
    csv += `"Question ${index + 1}","Question","${escapeCSV(response.question)}"\n`;
    csv += `"Question ${index + 1}","Answer","${escapeCSV(finalAnswer)}"\n`;
    csv += `"Question ${index + 1}","Status","${response.is_approved ? 'Approved' : 'Draft'}"\n`;
  });
  
  return csv;
}

function escapeCSV(text: string): string {
  if (text == null) return '';
  return text.toString().replace(/"/g, '""');
}