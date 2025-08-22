import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegenerateRequest {
  responseId: string;
}

// Helper function to identify entity questions that need research
function needsEntityResearch(question: string): boolean {
  const questionLower = question.toLowerCase();
  
  const entityPatterns = [
    /\b(dpo|data\s+protection\s+officer)\b/,
    /\b(ceo|chief\s+executive\s+officer)\b/,
    /\b(cfo|chief\s+financial\s+officer)\b/,
    /\b(cto|chief\s+technology\s+officer)\b/,
    /\b(iso\s+\d+|iso\d+)\b/,
    /\b(gdpr\s+officer|privacy\s+officer)\b/,
    /\b(compliance\s+officer)\b/,
    /\b(security\s+officer|ciso)\b/
  ];
  
  return entityPatterns.some(pattern => pattern.test(questionLower));
}

// Classify question type for optimized response strategy
function classifyQuestion(question: string): { type: 'closed' | 'open', reasoning: string, needsResearch?: boolean } {
  const questionLower = question.toLowerCase();
  
  const closedPatterns = [
    /^(do\s+you|have\s+you|can\s+you|will\s+you|are\s+you|is\s+your)\b/,
    /\b(yes\s*\/\s*no|y\s*\/\s*n)\b/,
    /\b(certified|accredited|compliant|registered|licensed)\b/,
    /\b(how\s+many|what\s+is\s+your|when\s+did)\b/
  ];
  
  const openPatterns = [
    /^(describe|explain|outline|detail|demonstrate|provide\s+details)\b/,
    /\b(approach|strategy|method|process|procedure|plan)\b/,
    /\b(how\s+do\s+you|how\s+would\s+you|what\s+steps)\b/,
    /\b(experience|capability|ability|expertise)\b/
  ];
  
  const isClosedMatch = closedPatterns.some(pattern => pattern.test(questionLower));
  const isOpenMatch = openPatterns.some(pattern => pattern.test(questionLower));
  const entityResearch = needsEntityResearch(question);
  
  if (isClosedMatch && !isOpenMatch) {
    return { 
      type: 'closed', 
      reasoning: 'Detected Yes/No or factual question pattern',
      needsResearch: entityResearch
    };
  } else if (isOpenMatch) {
    return { 
      type: 'open', 
      reasoning: 'Detected explanatory or process question pattern',
      needsResearch: true
    };
  } else {
    return { 
      type: 'open', 
      reasoning: 'Unclear pattern, defaulting to detailed response',
      needsResearch: true
    };
  }
}

// Enhanced research function using Perplexity API
async function fetchResearchSnippet(question: string, companyName: string, perplexityApiKey?: string): Promise<string | null> {
  if (!perplexityApiKey) {
    console.log('Perplexity API key not available, skipping research');
    return null;
  }
  
  const enableResearch = Deno.env.get('ENABLE_RESEARCH')?.toLowerCase() === 'true';
  if (!enableResearch) {
    console.log('Research disabled via ENABLE_RESEARCH flag');
    return null;
  }
  
  try {
    console.log(`Fetching research snippet for question: ${question.substring(0, 100)}...`);
    
    // Enhanced prompt for entity-specific research
    let researchPrompt;
    if (needsEntityResearch(question)) {
      researchPrompt = `Find the specific person who holds this role at ${companyName}: ${question}. Include their full name and title if available. If no specific person is found, indicate that the role exists but specific names are confidential.`;
    } else {
      researchPrompt = `Research this business question about ${companyName}: ${question}`;
    }
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide factual, current information based on web search. For personnel questions, include specific names and titles when publicly available. If names are not found, clearly state that the information is confidential or not publicly available.'
          },
          {
            role: 'user',
            content: researchPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: needsEntityResearch(question) ? 300 : 500,
        return_images: false,
        return_related_questions: false
      }),
    });
    
    if (!response.ok) {
      console.error('Perplexity API error:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    const researchText = data.choices[0]?.message?.content;
    
    if (!researchText) {
      console.log('No research content received from Perplexity');
      return null;
    }
    
    console.log(`Research snippet fetched: ${researchText.substring(0, 200)}...`);
    return researchText;
    
  } catch (error) {
    console.error('Error fetching research snippet:', error);
    return null;
  }
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

    const { responseId } = await req.json() as RegenerateRequest;

    if (!responseId) {
      return new Response(JSON.stringify({ error: 'Response ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the response and related data
    const { data: response, error: responseError } = await supabaseClient
      .from('tender_responses')
      .select(`
        id,
        question,
        tender_id,
        company_profile_id,
        tenders!inner(title)
      `)
      .eq('id', responseId)
      .single();

    if (responseError || !response) {
      console.error('Error fetching response:', responseError);
      return new Response(JSON.stringify({ error: 'Response not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch company profile
    const { data: companyProfile, error: profileError } = await supabaseClient
      .from('company_profiles')
      .select('*')
      .eq('id', response.company_profile_id)
      .single();

    if (profileError || !companyProfile) {
      console.error('Error fetching company profile:', profileError);
      return new Response(JSON.stringify({ error: 'Company profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Classify question and determine if research is needed
    const classification = classifyQuestion(response.question);
    console.log('Question classification:', classification);

    // Fetch research if needed
    let researchSnippet = null;
    if (classification.needsResearch) {
      const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
      researchSnippet = await fetchResearchSnippet(
        response.question,
        companyProfile.company_name,
        perplexityApiKey
      );
    }

    // Generate new AI response
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const entityQuestion = needsEntityResearch(response.question);
    const prompt = `You are a tender response writer for ${companyProfile.company_name}. Generate a professional response for this tender question.

Company Context:
${JSON.stringify(companyProfile, null, 2)}

Question: ${response.question}
Question Type: ${classification.type} (${classification.reasoning})

${researchSnippet ? `Research Context: ${researchSnippet}` : ''}

Requirements:
- Write in British English
- Be professional and confident
- Use specific company details from the profile
- For ${classification.type} questions, provide ${classification.type === 'closed' ? 'direct, factual answers' : 'detailed explanations with examples'}
${entityQuestion ? '- **CRITICAL**: For personnel questions (DPO, CEO, etc.): NEVER use placeholders like [Name], [CEO Name], [Title]. If research found a specific name, include "Our [Role] is [Full Name]". If no specific name was found, respond with "We have a [role] in place" or "We maintain appropriate [structure]" without fake specifics.' : ''}
- Focus on capabilities and experience relevant to the question
- Keep response appropriate in length for the question type
- Never fabricate names, titles, or specific details not provided in the context

Generate a tailored response:`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a professional tender response writer.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: classification.type === 'closed' ? 200 : 500,
      }),
    });

    if (!aiResponse.ok) {
      console.error('OpenAI API error:', aiResponse.status, aiResponse.statusText);
      return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedAnswer = aiData.choices[0]?.message?.content;

    if (!generatedAnswer) {
      return new Response(JSON.stringify({ error: 'No response generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the response in database
    const { error: updateError } = await supabaseClient
      .from('tender_responses')
      .update({
        ai_generated_answer: generatedAnswer,
        user_edited_answer: null,
        is_approved: false,
        research_used: !!researchSnippet,
        model_used: 'gpt-5-2025-08-07',
        question_type: classification.type,
        response_length: generatedAnswer.length,
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
      message: 'Response regenerated successfully',
      newAnswer: generatedAnswer
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-response function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});