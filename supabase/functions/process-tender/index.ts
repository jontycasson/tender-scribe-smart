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

    // Get file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('tender-documents')
      .download(filePath);

    if (fileError) throw fileError;

    // Convert file to base64 for Nanonets API
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Try to extract text from the document for question extraction
    console.log('Processing document for question extraction:', filePath);
    
    // For PDF processing, we'll use a simple text extraction approach
    // In a production environment, you'd want to use a proper PDF parsing library
    let extractedText = '';
    
    try {
      // Convert the file buffer to text (this is a simplified approach)
      // For better PDF parsing, consider using libraries like pdf-parse
      const fileText = new TextDecoder().decode(arrayBuffer);
      extractedText = fileText;
      console.log('Extracted text length:', extractedText.length);
    } catch (error) {
      console.log('Text extraction failed, using fallback questions:', error);
    }
    
    // Extract questions from the document text
    let questions: string[] = [];
    
    if (extractedText) {
      questions = extractQuestionsFromText(extractedText);
      console.log('Extracted questions from document:', questions.length);
    }
    
    // If no questions found, return an error
    if (questions.length === 0) {
      console.log('No questions extracted from document');
      
      // Update tender status to indicate parsing failed
      await supabase
        .from('tenders')
        .update({ 
          status: 'error',
          parsed_data: { error: 'No questions found in document' }
        })
        .eq('id', tenderId);

      return new Response(
        JSON.stringify({ 
          error: 'No questions were found in the uploaded document. Please check that the document contains clear questions or requirements, and try uploading again.',
          questionsFound: 0
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-tender function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractQuestionsFromText(text: string): string[] {
  // Enhanced question extraction with multiple patterns
  const questions: string[] = [];
  
  // Split text into sentences and clean up
  const sentences = text
    .split(/[.!?\n\r]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15); // Minimum length for meaningful questions
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Look for explicit questions (ending with ?)
    if (sentence.includes('?')) {
      questions.push(sentence + (sentence.endsWith('?') ? '' : '?'));
      continue;
    }
    
    // Look for imperative statements that are effectively questions
    const imperativePatterns = [
      /^(please\s+)?(describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate)/i,
      /^(what|how|when|where|why|which|who)/i,
      /\b(requirements?\s+for|criteria\s+for|approach\s+to|method\s+for)\b/i,
      /\b(must\s+provide|should\s+include|need\s+to\s+demonstrate|required\s+to)\b/i,
      /\b(experience\s+in|capability\s+to|ability\s+to|qualified\s+to)\b/i
    ];
    
    for (const pattern of imperativePatterns) {
      if (pattern.test(sentence)) {
        // Convert statement to question format if it doesn't end with ?
        const questionText = sentence.endsWith('?') ? sentence : sentence + '?';
        questions.push(questionText);
        break;
      }
    }
  }
  
  // Remove duplicates and return all questions (no arbitrary limit)
  const uniqueQuestions = [...new Set(questions)];
  console.log(`Extracted ${uniqueQuestions.length} unique questions from document`);
  
  return uniqueQuestions;
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