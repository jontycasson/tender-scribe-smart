import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, companyName, question } = await req.json();
    
    if (!email || !companyName || !question) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client IP for rate limiting (parse only the first IP from X-Forwarded-For)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check usage limits (3 per email/IP) - separate queries to avoid parsing issues
    const { count: emailCount, error: emailError } = await supabase
      .from('demo_uses')
      .select('*', { count: 'exact', head: true })
      .eq('email', email);

    const { count: ipCount, error: ipError } = await supabase
      .from('demo_uses')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP);

    if (emailError || ipError) {
      console.error('Error checking usage limits:', emailError || ipError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalUses = Math.max(emailCount || 0, ipCount || 0);
    
    if (totalUses >= 3) {
      return new Response(JSON.stringify({ 
        error: 'LIMIT_REACHED',
        message: "You've reached your free demo limit. Subscribe to continue using Proposal.fit." 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if OpenAI API key is available
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI response using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an AI assistant helping ${companyName} respond to tender questions. Generate a professional, detailed response that demonstrates expertise and capability. The response should be:
            - Professional and confident
            - Specific to the company context
            - 150-300 words
            - Include relevant industry knowledge
            - Show understanding of best practices
            
            Company: ${companyName}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', aiData);
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = aiData.choices[0].message.content;

    // Log the demo use
    const { error: insertError } = await supabase
      .from('demo_uses')
      .insert({
        email,
        ip_address: clientIP,
        company_name: companyName,
        question: question.substring(0, 500) // Truncate if too long
      });

    if (insertError) {
      console.error('Error logging demo use:', insertError);
      // Continue anyway - don't fail the response for logging issues
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      remainingUses: Math.max(0, 3 - (totalUses + 1))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in demo-response function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});