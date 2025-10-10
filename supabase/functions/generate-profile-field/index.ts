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

type FieldName = 'mission' | 'values' | 'policies' | 'specializations' | 'pastProjects';

interface GenerateProfileFieldRequest {
  fieldName: FieldName;
  companyData: {
    companyName: string;
    industry?: string;
    teamSize?: number;
    servicesOffered?: string;
    yearsInBusiness?: number;
  };
}

// Field-specific prompts for generating company profile content
const fieldPrompts: Record<FieldName, (companyData: GenerateProfileFieldRequest['companyData']) => string> = {
  mission: (data) => `Generate a professional mission statement for ${data.companyName}.

Company Context:
- Industry: ${data.industry || 'Not specified'}
- Team Size: ${data.teamSize || 'Not specified'}
- Services: ${data.servicesOffered || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Not specified'}

Requirements:
- Write 2-3 sentences
- Focus on client value and impact
- Be professional and aspirational
- Use British English spelling and terminology
- Emphasise quality, reliability, and customer satisfaction
- Make it compelling but realistic
- Do not fabricate specific achievements or certifications
- Keep it general enough to be authentic

Generate the mission statement:`,

  values: (data) => `Generate core company values for ${data.companyName}.

Company Context:
- Industry: ${data.industry || 'Not specified'}
- Team Size: ${data.teamSize || 'Not specified'}
- Services: ${data.servicesOffered || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Not specified'}

Requirements:
- List 4-6 core values
- Each value should have a brief explanation (1-2 sentences)
- Values should be relevant to the industry
- Use British English spelling and terminology
- Be professional and authentic
- Common values might include: Integrity, Excellence, Innovation, Collaboration, Customer Focus, Sustainability
- Format as a clear list with value names in bold or clear formatting

Generate the company values:`,

  policies: (data) => `Generate key company policies for ${data.companyName}.

Company Context:
- Industry: ${data.industry || 'Not specified'}
- Team Size: ${data.teamSize || 'Not specified'}
- Services: ${data.servicesOffered || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Not specified'}

Requirements:
- Cover these key policy areas: Quality Assurance, Health & Safety, Environmental/Sustainability, Data Protection
- Write 2-3 sentences for each policy area
- Be specific to the industry where appropriate
- Use British English spelling and terminology
- Be professional and credible
- Reference compliance commitments without fabricating specific certifications
- Make it clear the company takes these areas seriously
- Format clearly with policy headings

Generate the company policies:`,

  specializations: (data) => `Generate a description of areas of specialisation for ${data.companyName}.

Company Context:
- Industry: ${data.industry || 'Not specified'}
- Team Size: ${data.teamSize || 'Not specified'}
- Services: ${data.servicesOffered || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Not specified'}

Requirements:
- Write 2-3 paragraphs
- Focus on areas of expertise and capabilities
- Be industry-appropriate and realistic
- Use British English spelling and terminology
- Highlight technical competencies, methodologies, or approaches
- Mention relevant sectors or client types served
- Do not fabricate specific projects, clients, or certifications
- Keep it credible and professional
- Use "specialisation" not "specialization"

Generate the specialisations description:`,

  pastProjects: (data) => `Generate a description of past project experience and capabilities for ${data.companyName}.

Company Context:
- Industry: ${data.industry || 'Not specified'}
- Team Size: ${data.teamSize || 'Not specified'}
- Services: ${data.servicesOffered || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Not specified'}

Requirements:
- Write 2-3 paragraphs
- Describe types of projects undertaken (generic, not specific clients)
- Focus on capabilities and experience areas
- Use British English spelling and terminology
- Be professional and credible
- **CRITICAL**: Do NOT fabricate specific client names, project names, or exact dates
- Use generic descriptions like "projects in the healthcare sector" or "commercial developments"
- Emphasise project types, scales, and outcomes
- Keep all information generic and verifiable

Generate the past projects description:`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header to extract user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create a separate client with user's auth to get user info
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    // Check rate limit using service role client
    const { data: rateLimitData, error: rateLimitError } = await supabaseClient
      .rpc('check_ai_generation_limit', { user_id_param: user.id });

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      // Continue anyway - don't block on rate limit errors
    } else if (rateLimitData && !rateLimitData.allowed) {
      return new Response(JSON.stringify({
        error: rateLimitData.error || 'Rate limit exceeded',
        remaining: 0,
        resetAt: rateLimitData.reset_at
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const requestBody = await req.json().catch(() => ({}));
    const { fieldName, companyData } = requestBody as GenerateProfileFieldRequest;

    console.log(`Generating profile field: ${fieldName} for company: ${companyData?.companyName}`);

    // Validate request
    if (!fieldName || !companyData || !companyData.companyName) {
      return new Response(JSON.stringify({
        error: 'Field name and company data with company name are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate field name
    const validFields: FieldName[] = ['mission', 'values', 'policies', 'specializations', 'pastProjects'];
    if (!validFields.includes(fieldName)) {
      return new Response(JSON.stringify({
        error: `Invalid field name. Must be one of: ${validFields.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate the prompt for the specific field
    const prompt = fieldPrompts[fieldName](companyData);

    console.log(`Calling OpenAI API for field: ${fieldName}`);

    // Call OpenAI API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a professional business content writer specialising in company profiles and documentation. Always use British English spelling and terminology. Generate authentic, professional content without fabricating specific facts, certifications, or client names.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, aiResponse.statusText, errorText);
      return new Response(JSON.stringify({
        error: 'Failed to generate content',
        details: `OpenAI API returned ${aiResponse.status}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0]?.message?.content;

    if (!generatedContent) {
      console.error('No content generated from OpenAI');
      return new Response(JSON.stringify({ error: 'No content generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully generated ${fieldName} content (${generatedContent.length} characters)`);

    // Increment AI generation count (don't block on errors)
    await supabaseClient
      .rpc('increment_ai_generation_count', { user_id_param: user.id })
      .catch((err) => console.error('Failed to increment AI count:', err));

    // Return successful response
    return new Response(JSON.stringify({
      success: true,
      content: generatedContent.trim(), // Frontend expects 'content' field
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-profile-field function:', error);
    const errorMessage = getErrorMessage(error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
