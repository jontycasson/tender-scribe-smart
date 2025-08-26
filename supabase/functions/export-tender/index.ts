import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  tenderId: string;
  format: 'docx' | 'pdf';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenderId, format } = await req.json() as ExportRequest;

    if (!tenderId || !format) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch tender and responses with proper ordering
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

    if (tenderError || !tender) {
      return new Response(JSON.stringify({ error: 'Tender not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: responses, error: responsesError } = await supabaseClient
      .from('tender_responses')
      .select('*')
      .eq('tender_id', tenderId)
      .order('question_index', { ascending: true }); // Order by question_index

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch responses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({ error: 'No responses found for this tender' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate document content
    let documentContent = `Tender Response: ${tender.title}\n\n`;
    
    responses.forEach((response, index) => {
      const finalAnswer = response.user_edited_answer || response.ai_generated_answer;
      documentContent += `${index + 1}. ${response.question}\n\n`;
      documentContent += `${finalAnswer}\n\n`;
      documentContent += '---\n\n';
    });

    if (format === 'docx') {
      // For DOCX format, return the content as text for now
      // In a production environment, you would use a library like docx to generate proper DOCX files
      return new Response(documentContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${tender.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.docx"`,
        },
      });
    } else if (format === 'pdf') {
      // For PDF format, return the content as text for now
      // In a production environment, you would use a library like jsPDF or puppeteer to generate proper PDF files
      return new Response(documentContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${tender.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.pdf"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in export function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
