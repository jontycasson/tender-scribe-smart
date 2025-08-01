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
    const { tenderId, filePath } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let questions: string[] = [];
    let errorMessage = null;

    try {
      // Get file from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('tender-documents')
        .download(filePath);

      if (fileError) {
        throw new Error(`Failed to download file: ${fileError.message}`);
      }

      console.log('Processing document with Nanonets:', filePath);
      
      // Get Nanonets API key and model ID from environment
      const nanonetsApiKey = Deno.env.get('NANONETS_API_KEY');
      if (!nanonetsApiKey) {
        throw new Error('Nanonets API key not configured');
      }

      // Convert file to base64 for Nanonets API
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Data = btoa(String.fromCharCode(...uint8Array));

      // Call Nanonets OCR API - use generic endpoint if no specific model ID
      const modelId = Deno.env.get('NANONETS_MODEL_ID');
      const apiUrl = modelId 
        ? `https://app.nanonets.com/api/v2/OCR/Model/${modelId}/LabelFile/`
        : 'https://app.nanonets.com/api/v2/OCR/FullText/';
      
      const formData = new FormData();
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      formData.append('file', blob, filePath.split('/').pop() || 'document.pdf');

      console.log(`Calling Nanonets API: ${apiUrl}`);
      const nanonetsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(nanonetsApiKey + ':')}`,
        },
        body: formData,
      });

      console.log(`Nanonets response status: ${nanonetsResponse.status}`);

      if (!nanonetsResponse.ok) {
        const errorText = await nanonetsResponse.text();
        console.error(`Nanonets API failed: ${nanonetsResponse.status} - ${errorText}`);
        throw new Error(`Nanonets API failed: ${nanonetsResponse.status}`);
      }

      const nanonetsData = await nanonetsResponse.json();
      console.log('Nanonets response structure:', JSON.stringify(nanonetsData, null, 2));

      // Extract text from Nanonets response
      let extractedText = '';
      if (nanonetsData.result && Array.isArray(nanonetsData.result)) {
        extractedText = nanonetsData.result
          .map((item: any) => item.ocr_text || '')
          .join('\n')
          .trim();
      } else if (nanonetsData.message) {
        extractedText = nanonetsData.message;
      } else if (typeof nanonetsData === 'string') {
        extractedText = nanonetsData;
      }

      console.log('Extracted text length:', extractedText.length);
      console.log('First 500 characters:', extractedText.substring(0, 500));

      if (!extractedText || extractedText.length < 10) {
        throw new Error('No meaningful text extracted from document. The document may be corrupted or contain no readable text.');
      }

      // Extract questions from the document text
      questions = extractQuestionsFromText(extractedText);
      console.log('Extracted questions from document:', questions.length);
      
      if (questions.length === 0) {
        errorMessage = 'No questions found in document. Please ensure your document contains numbered questions (e.g., "1. What is your experience?").';
      }
    } catch (error) {
      console.error('Error processing document:', error);
      errorMessage = error.message || 'Unknown error occurred during processing';
    }
    
    // If parsing failed or no questions found, return error response with 200 status
    if (errorMessage) {
      console.log('Processing failed:', errorMessage);
      
      // Update tender status to indicate parsing failed
      try {
        await supabase
          .from('tenders')
          .update({ 
            status: 'error',
            parsed_data: { error: errorMessage }
          })
          .eq('id', tenderId);
      } catch (updateError) {
        console.error('Failed to update tender status:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    try {
      // Update tender with parsed data
      const { error: updateError } = await supabase
        .from('tenders')
        .update({ 
          parsed_data: { questions },
          status: 'parsed'
        })
        .eq('id', tenderId);

      if (updateError) throw updateError;

      // Get user's company profile for personalized responses
      const { data: tenderData } = await supabase
        .from('tenders')
        .select('user_id')
        .eq('id', tenderId)
        .single();

      const { data: profileData } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', tenderData.user_id)
        .maybeSingle();

      // Generate AI responses for each question
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      
      for (const question of questions) {
        const aiResponse = await generateAIResponse(question, profileData, openAIApiKey);
        
        // Save question and AI response to database
        const { error: responseError } = await supabase
          .from('tender_responses')
          .insert({
            tender_id: tenderId,
            question: question,
            ai_generated_answer: aiResponse,
            is_approved: false
          });

        if (responseError) {
          console.error('Error saving response:', responseError);
        }
      }

      // Update tender status
      await supabase
        .from('tenders')
        .update({ status: 'draft' })
        .eq('id', tenderId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          questionsFound: questions.length,
          message: 'Document processed successfully' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('Error processing tender responses:', error);
      return new Response(
        JSON.stringify({ 
          error: `Failed to process tender responses: ${error.message}`
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in process-tender function:', error);
    
    // Update tender status to error
    try {
      const { tenderId } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('tenders')
        .update({ 
          status: 'error',
          parsed_data: { error: error.message || 'Unknown error occurred during processing' }
        })
        .eq('id', tenderId);
    } catch (updateError) {
      console.error('Failed to update tender status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to extract questions' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractQuestionsFromText(text: string): string[] {
  // Extract numbered questions from the document text
  const questions: string[] = [];
  
  // Split text into lines and clean up
  const lines = text
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 10); // Minimum length for meaningful content
  
  // Look for lines that start with a number and end with a question mark
  // Pattern matches: "1. What is...", "1) How do...", "Question 1: Why...", etc.
  const numberedQuestionPattern = /^(?:\d+[\.\)\:]?\s*(?:question\s*)?\s*)(.*\?)\s*$/i;
  
  for (const line of lines) {
    const match = line.match(numberedQuestionPattern);
    if (match) {
      const questionText = match[1].trim();
      if (questionText.length > 10) { // Ensure it's a meaningful question
        questions.push(questionText);
      }
      continue;
    }
    
    // Also check for lines that start with numbers but don't end with ?
    // and convert them to questions if they contain question words
    const numberedLinePattern = /^(?:\d+[\.\)\:]?\s*(?:question\s*)?\s*)(.*)/i;
    const lineMatch = line.match(numberedLinePattern);
    if (lineMatch) {
      const content = lineMatch[1].trim();
      const lowerContent = content.toLowerCase();
      
      // Check if it contains question words or imperative statements
      const questionIndicators = [
        /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate)/i,
        /\b(experience|approach|method|capability|ability|requirements?|criteria)\b/i
      ];
      
      if (questionIndicators.some(pattern => pattern.test(content))) {
        const questionText = content.endsWith('?') ? content : content + '?';
        if (questionText.length > 10) {
          questions.push(questionText);
        }
      }
    }
  }
  
  console.log(`Extracted ${questions.length} numbered questions from document`);
  
  return questions;
}

async function generateAIResponse(question: string, profile: any, apiKey: string): Promise<string> {
  const prompt = `
You are helping a company respond to a tender question. Here is the company's profile:

Company: ${profile?.company_name || 'N/A'}
Industry: ${profile?.industry || 'N/A'}
Team Size: ${profile?.team_size || 'N/A'}
Years in Business: ${profile?.years_in_business || 'N/A'}
Services: ${profile?.services_offered?.join(', ') || 'N/A'}
Mission: ${profile?.mission || 'N/A'}
Values: ${profile?.values || 'N/A'}
Specializations: ${profile?.specializations || 'N/A'}
Past Projects: ${profile?.past_projects || 'N/A'}

Question: ${question}

Please provide a professional, detailed response that:
1. Directly addresses the question
2. Highlights relevant company strengths and experience
3. Uses specific examples where appropriate
4. Maintains a professional tone
5. Is comprehensive but concise (200-400 words)

Response:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional tender response writer with expertise in creating compelling, accurate responses that win contracts.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return `Based on our company profile, we are well-positioned to address this requirement. Our team of ${profile?.team_size || 'experienced professionals'} has ${profile?.years_in_business || 'significant'} experience in ${profile?.industry || 'this sector'}. We would be happy to provide more specific details upon request.`;
  }
}