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
    const { question, answer, sourceResponseId } = await req.json();
    
    if (!question || !answer) {
      return new Response(
        JSON.stringify({ error: 'Question and answer are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get company profile ID from the source response
    const { data: responseData } = await supabase
      .from('tender_responses')
      .select('company_profile_id, tender_id')
      .eq('id', sourceResponseId)
      .single();

    if (!responseData || !responseData.company_profile_id) {
      return new Response(
        JSON.stringify({ error: 'Company profile not found for response' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating embedding for question: ${question.substring(0, 100)}...`);

    // Generate embedding for the question
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: question,
        encoding_format: 'float'
      })
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI embedding failed:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Check if similar question already exists
    const { data: existingMemory } = await supabase.rpc('match_qa_memory', {
      query_embedding: embedding,
      company_id: responseData.company_profile_id,
      match_threshold: 0.95, // High threshold for exact matches
      match_count: 1
    });

    let memoryId = null;

    if (existingMemory && existingMemory.length > 0) {
      // Update existing memory entry
      const existing = existingMemory[0];
      const { data: updatedMemory, error: updateError } = await supabase
        .from('qa_memory')
        .update({
          answer: answer,
          confidence_score: Math.min(existing.confidence_score + 0.1, 1.0),
          usage_count: existing.usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Failed to update existing memory:', updateError);
        throw updateError;
      }

      memoryId = updatedMemory.id;
      console.log(`Updated existing memory entry: ${memoryId}`);
    } else {
      // Create new memory entry
      const { data: newMemory, error: insertError } = await supabase
        .from('qa_memory')
        .insert({
          company_profile_id: responseData.company_profile_id,
          question: question,
          answer: answer,
          question_embedding: embedding,
          confidence_score: 0.8, // Initial confidence score
          source_tender_id: responseData.tender_id,
          usage_count: 1
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to insert new memory:', insertError);
        throw insertError;
      }

      memoryId = newMemory.id;
      console.log(`Created new memory entry: ${memoryId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        memoryId: memoryId,
        message: existingMemory && existingMemory.length > 0 
          ? 'Updated existing memory entry' 
          : 'Created new memory entry'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in upsert-memory function:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to upsert memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});