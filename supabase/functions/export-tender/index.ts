import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Error helper functions (inlined to avoid cross-folder imports)
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(getErrorMessage(err));
}

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

    // Prepare structured data for client-side document generation
    const exportData = {
      title: tender.title,
      items: responses.map((response, index) => ({
        questionNumber: index + 1,
        question: response.question,
        answer: response.user_edited_answer || response.ai_generated_answer,
        // Include source tracking information
        originalReference: response.original_reference || null,
        sourceLocation: response.source_location || null,
        pageNumber: response.page_number || null
      })),
      format
    };

    return new Response(JSON.stringify(exportData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error in export function:', error);
    const errorMessage = getErrorMessage(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
