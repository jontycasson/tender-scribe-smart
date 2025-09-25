import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewriteRequest {
  responseId: string;
  mode: 'reword' | 'make_shorter' | 'make_formal' | 'more_detailed' | 'more_concise' | 'uk_english';
}

const rewritePrompts = {
  reword: 'Rewrite this response using different words and phrasing whilst keeping the same meaning and key facts. Maintain professionalism and use British English spelling and terminology.',
  make_shorter: 'Make this response more concise and to the point. Remove any redundant information whilst keeping all essential facts and maintaining professionalism. Use British English spelling and terminology.',
  make_formal: 'Rewrite this response in a more formal, professional tone suitable for official tender documentation. Use formal business language, structure, and British English spelling and terminology.',
  more_detailed: 'Expand this response with more detail and specific examples. Add relevant context and elaboration whilst maintaining accuracy. Use British English spelling and terminology.',
  more_concise: 'Condense this response to be more brief and direct. Focus on the core message and essential information only. Use British English spelling and terminology.',
  uk_english: 'Rewrite this response using British English spelling, terminology, and phrasing. Ensure all language conventions follow UK standards.'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { responseId, mode } = await req.json() as RewriteRequest;

    if (!responseId || !mode) {
      return new Response(JSON.stringify({ error: 'Response ID and mode are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!rewritePrompts[mode]) {
      return new Response(JSON.stringify({ error: 'Invalid rewrite mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the current response
    const { data: response, error: responseError } = await supabaseClient
      .from('tender_responses')
      .select('id, question, ai_generated_answer, user_edited_answer')
      .eq('id', responseId)
      .single();

    if (responseError || !response) {
      console.error('Error fetching response:', responseError);
      return new Response(JSON.stringify({ error: 'Response not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the user-edited answer if available, otherwise use AI-generated answer
    const currentAnswer = response.user_edited_answer || response.ai_generated_answer;

    if (!currentAnswer) {
      return new Response(JSON.stringify({ error: 'No answer to rewrite' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate rewritten response using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `${rewritePrompts[mode]}

Original Question: ${response.question}

Current Response:
${currentAnswer}

Important: Do not invent any new facts or information. Only rewrite the existing content according to the instructions above. Ensure accuracy is maintained.

Rewritten Response:`;

    // Try GPT-5 first, then fallback to GPT-4o-mini
    let rewrittenAnswer = null;
    let modelUsed = 'gpt-5-2025-08-07';

    try {
      console.log(`Attempting rewrite with GPT-5 for response ${responseId}, mode: ${mode}`);
      
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            { 
              role: 'system', 
              content: 'You are a professional editor specializing in tender responses. Rewrite content accurately without adding new information or fabricating details.' 
            },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: mode === 'make_shorter' || mode === 'more_concise' ? 300 : 600,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('GPT-5 API error:', aiResponse.status, aiResponse.statusText, errorText);
        throw new Error(`GPT-5 failed: ${aiResponse.status} ${errorText}`);
      }

      const aiData = await aiResponse.json();
      rewrittenAnswer = aiData.choices[0]?.message?.content;
      
      if (!rewrittenAnswer) {
        throw new Error('No content returned from GPT-5');
      }
      
      console.log('GPT-5 rewrite successful');
      
    } catch (gpt5Error) {
      const gpt5ErrorMessage = gpt5Error instanceof Error ? gpt5Error.message : 'Unknown GPT-5 error';
      console.log('GPT-5 failed, trying GPT-4o-mini fallback:', gpt5ErrorMessage);
      modelUsed = 'gpt-4o-mini';
      
      try {
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are a professional editor specialising in tender responses. Rewrite content accurately without adding new information or fabricating details. Always use British English spelling and terminology.' 
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: mode === 'make_shorter' || mode === 'more_concise' ? 300 : 600,
            temperature: 0.7,
          }),
        });

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error('GPT-4o-mini fallback error:', fallbackResponse.status, fallbackResponse.statusText, errorText);
          throw new Error(`Both models failed. GPT-4o-mini: ${fallbackResponse.status} ${errorText}`);
        }

        const fallbackData = await fallbackResponse.json();
        rewrittenAnswer = fallbackData.choices[0]?.message?.content;
        
        if (!rewrittenAnswer) {
          throw new Error('No content returned from GPT-4o-mini fallback');
        }
        
        console.log('GPT-4o-mini fallback successful');
        
      } catch (fallbackError) {
        console.error('Both GPT-5 and GPT-4o-mini failed:', fallbackError);
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
        return new Response(JSON.stringify({ 
          error: 'Failed to rewrite response with both models',
          details: fallbackErrorMessage 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!rewrittenAnswer) {
      return new Response(JSON.stringify({ error: 'No rewritten response generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the response in database
    const { error: updateError } = await supabaseClient
      .from('tender_responses')
      .update({
        user_edited_answer: rewrittenAnswer,
        is_approved: false,
        model_used: modelUsed,
        response_length: rewrittenAnswer.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('Error updating response:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Response ${mode.replace('_', ' ')} successfully`,
      rewrittenAnswer: rewrittenAnswer
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in rewrite-response function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});