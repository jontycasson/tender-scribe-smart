import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Force redeploy to pick up updated secrets

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
      
      // Get Nanonets API key from environment with validation
      const nanonetsApiKey = Deno.env.get('NANONETS_API_KEY')?.trim();
      console.log('NANONETS_API_KEY configured:', !!nanonetsApiKey, nanonetsApiKey ? 'exists' : 'missing');
      if (!nanonetsApiKey) {
        throw new Error('Nanonets API key not configured');
      }

      // Use the exact model ID that works in Postman
      const modelId = '71903d6a-b333-4893-a9b3-f52ad90a9c9f';
      console.log(`Using hardcoded Model ID: ${modelId}`);
      
      // Also check what the environment variable contains for debugging
      const envModelId = Deno.env.get('NANONETS_MODEL_ID')?.trim();
      console.log('Environment NANONETS_MODEL_ID:', envModelId || 'not set');

      // Convert file to form data for Nanonets API
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Determine MIME type from file extension
      const fileName = filePath.split('/').pop() || 'document.pdf';
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let mimeType = 'application/pdf'; // default
      
      if (fileExtension === 'docx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileExtension === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileExtension === 'doc') {
        mimeType = 'application/msword';
      } else if (fileExtension === 'xls') {
        mimeType = 'application/vnd.ms-excel';
      }
      
      console.log(`Processing file: ${fileName} with MIME type: ${mimeType}`);
      
      // Call Nanonets OCR API with custom model for tender documents
      const apiUrl = `https://app.nanonets.com/api/v2/OCR/Model/${modelId}/LabelFile/`;
      
      const formData = new FormData();
      const blob = new Blob([uint8Array], { type: mimeType });
      formData.append('file', blob, fileName);
      
      console.log(`FormData created with file: ${fileName}, size: ${uint8Array.length} bytes`);

      console.log(`Calling Nanonets API: ${apiUrl}`);
      
      // Retry logic for Nanonets API calls
      let nanonetsData;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Nanonets attempt ${attempt}/${maxRetries}`);
          
          const nanonetsResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(nanonetsApiKey + ':')}`,
            },
            body: formData,
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(120000), // 2 minutes timeout
          });

          console.log(`Nanonets response status: ${nanonetsResponse.status}`);

          if (!nanonetsResponse.ok) {
            const errorText = await nanonetsResponse.text();
            console.error(`Nanonets API failed on attempt ${attempt}: ${nanonetsResponse.status} - ${errorText}`);
            
            // For 4xx errors, don't retry as they indicate client errors
            if (nanonetsResponse.status >= 400 && nanonetsResponse.status < 500) {
              throw new Error(`Nanonets API client error: ${nanonetsResponse.status} - ${errorText}`);
            }
            
            // For 5xx errors, retry
            lastError = new Error(`Nanonets API server error: ${nanonetsResponse.status} - ${errorText}`);
            
            if (attempt === maxRetries) {
              throw lastError;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }

          nanonetsData = await nanonetsResponse.json();
          console.log('Nanonets response structure:', JSON.stringify(nanonetsData, null, 2));
          
          // Validate response structure
          if (!nanonetsData) {
            throw new Error('Empty response from Nanonets API');
          }
          
          // Check for common error patterns in response
          if (nanonetsData.error || nanonetsData.message?.includes('error')) {
            throw new Error(`Nanonets API error: ${nanonetsData.error || nanonetsData.message}`);
          }
          
          // Success - break out of retry loop
          break;
          
        } catch (error) {
          console.error(`Nanonets attempt ${attempt} failed:`, error);
          lastError = error;
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      // Extract text from Nanonets response with enhanced parsing
      let extractedText = '';
      
      try {
        if (nanonetsData.result && Array.isArray(nanonetsData.result)) {
          // Standard Nanonets OCR response format
          extractedText = nanonetsData.result
            .map((item: any) => {
              // Handle different result item formats
              if (typeof item === 'string') return item;
              if (item.ocr_text) return item.ocr_text;
              if (item.text) return item.text;
              if (item.prediction) return item.prediction;
              return '';
            })
            .filter(text => text.trim().length > 0)
            .join('\n')
            .trim();
        } else if (nanonetsData.message && typeof nanonetsData.message === 'string') {
          // Sometimes the text is in the message field
          extractedText = nanonetsData.message;
        } else if (nanonetsData.text && typeof nanonetsData.text === 'string') {
          // Alternative text field
          extractedText = nanonetsData.text;
        } else if (nanonetsData.content && typeof nanonetsData.content === 'string') {
          // Another possible field name
          extractedText = nanonetsData.content;
        } else if (typeof nanonetsData === 'string') {
          // Direct string response
          extractedText = nanonetsData;
        } else if (nanonetsData.predictions && Array.isArray(nanonetsData.predictions)) {
          // Alternative predictions format
          extractedText = nanonetsData.predictions
            .map((pred: any) => pred.text || pred.ocr_text || '')
            .filter(text => text.trim().length > 0)
            .join('\n')
            .trim();
        }
        
        // Clean up the extracted text
        extractedText = extractedText
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
          
        console.log('Text extraction successful. Extracted text length:', extractedText.length);
        console.log('Text extraction method used:', 
          nanonetsData.result ? 'result array' :
          nanonetsData.message ? 'message field' :
          nanonetsData.text ? 'text field' :
          nanonetsData.content ? 'content field' :
          nanonetsData.predictions ? 'predictions array' :
          typeof nanonetsData === 'string' ? 'direct string' : 'unknown'
        );
        
      } catch (textExtractionError) {
        console.error('Error extracting text from Nanonets response:', textExtractionError);
        console.log('Full Nanonets response for debugging:', JSON.stringify(nanonetsData, null, 2));
        throw new Error(`Failed to extract text from Nanonets response: ${textExtractionError.message}`);
      }

      console.log('Extracted text length:', extractedText.length);
      console.log('First 500 characters:', extractedText.substring(0, 500));

      if (!extractedText || extractedText.length < 10) {
        throw new Error('No meaningful text extracted from document. The document may be corrupted or contain no readable text.');
      }

      // Extract questions from the document text with improved algorithm
      questions = extractQuestionsFromText(extractedText);
      console.log('Extracted questions from document:', questions.length);
      
      if (questions.length === 0) {
        errorMessage = `❌ **We couldn't extract structured questions from your document.**

Please ensure your questions are marked clearly with bullets, numbers, or labelled headers (e.g., \`Q1\`, \`1.\`, \`-\`, \`•\`).

Could not detect structured questions. Try uploading a clearer format or manually tagging questions.`;
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
  const questions: string[] = [];
  
  // Split text into lines and clean up
  const lines = text
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 5);
  
  // Enhanced extraction patterns - supporting multiple formatting styles
  const extractionPatterns = [
    // 1. Numbered questions (1. What is..., 1) How do..., 2: Why..., Question 1: etc.)
    {
      pattern: /^(?:\d+[\.\)\:]?\s*(?:question\s*)?\s*)(.*)/i,
      confidence: 0.9,
      process: (match: RegExpMatchArray, line: string) => {
        const content = match[1].trim();
        if (content.endsWith('?')) return content;
        
        // Check for question indicators
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate|give|show|present)/i;
        const businessTerms = /\b(experience|approach|method|capability|ability|requirements?|criteria|strategy|plan|proposal|solution|process|procedure|compliance|certification|qualification)/i;
        
        if (questionWords.test(content) || businessTerms.test(content)) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    },

    // 2. Lettered questions (A. What is..., B) How do..., C: Why...)
    {
      pattern: /^(?:[A-Z][\.\)\:]?\s*)(.*)/i,
      confidence: 0.9,
      process: (match: RegExpMatchArray, line: string) => {
        const content = match[1].trim();
        if (content.endsWith('?')) return content;
        
        // Check for question indicators
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate|give|show|present)/i;
        const businessTerms = /\b(experience|approach|method|capability|ability|requirements?|criteria|strategy|plan|proposal|solution|process|procedure|compliance|certification|qualification)/i;
        
        if (questionWords.test(content) || businessTerms.test(content)) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    },

    // 3. Labeled questions (Q:, Q1., Question 1:, etc.)
    {
      pattern: /^(?:Q[0-9]*[\.\:]?\s*(?:question\s*[0-9]*[\.\:]?)?\s*)(.*)/i,
      confidence: 0.95,
      process: (match: RegExpMatchArray, line: string) => {
        const content = match[1].trim();
        if (content.endsWith('?')) return content;
        
        // Q-prefixed items are very likely to be questions
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate|give|show|present)/i;
        const businessTerms = /\b(experience|approach|method|capability|ability|requirements?|criteria|strategy|plan|proposal|solution|process|procedure|compliance|certification|qualification)/i;
        
        if (questionWords.test(content) || businessTerms.test(content) || content.length > 10) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    },
    
    // 4. Bullet points (• What is..., - How do..., * Describe...)
    {
      pattern: /^[•\-\*\+]\s+(.+)/,
      confidence: 0.8,
      process: (match: RegExpMatchArray) => {
        const content = match[1].trim();
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate)/i;
        
        if (content.endsWith('?') || questionWords.test(content)) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    },
    
    // 3. Direct questions (sentences ending with ?)
    {
      pattern: /^(.+\?)$/,
      confidence: 0.7,
      process: (match: RegExpMatchArray) => {
        const content = match[1].trim();
        // Filter out obvious non-questions
        const excludePatterns = /^(did you know|isn't it|right\?|ok\?|yes\?|no\?)$/i;
        if (!excludePatterns.test(content) && content.length > 15) {
          return content;
        }
        return null;
      }
    },
    
    // 4. Markdown headers that are questions (### What is your approach?)
    {
      pattern: /^#{1,6}\s+(.+)/,
      confidence: 0.6,
      process: (match: RegExpMatchArray) => {
        const content = match[1].trim();
        const questionWords = /^(what|how|when|where|why|which|who)/i;
        
        if (content.endsWith('?') || questionWords.test(content)) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    },
    
    // 5. Bold/formatted text that asks questions
    {
      pattern: /^\*\*(.+)\*\*$|^__(.+)__$/,
      confidence: 0.5,
      process: (match: RegExpMatchArray) => {
        const content = (match[1] || match[2] || '').trim();
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide)/i;
        
        if (content.endsWith('?') || questionWords.test(content)) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    }
  ];
  
  // Process each line with all patterns
  for (const line of lines) {
    let bestMatch = null;
    let bestConfidence = 0;
    
    for (const extractor of extractionPatterns) {
      const match = line.match(extractor.pattern);
      if (match && extractor.confidence > bestConfidence) {
        const processed = extractor.process(match, line);
        if (processed && processed.length > 10) {
          bestMatch = processed;
          bestConfidence = extractor.confidence;
        }
      }
    }
    
    // Only include if confidence is above threshold
    if (bestMatch && bestConfidence >= 0.6) {
      // Avoid duplicates
      const normalizedQuestion = bestMatch.toLowerCase().trim();
      const isDuplicate = questions.some(q => 
        q.toLowerCase().trim() === normalizedQuestion ||
        q.toLowerCase().includes(normalizedQuestion) ||
        normalizedQuestion.includes(q.toLowerCase())
      );
      
      if (!isDuplicate) {
        questions.push(bestMatch);
        console.log(`Extracted question (confidence: ${bestConfidence}): ${bestMatch.substring(0, 100)}...`);
      }
    }
  }
  
  // Fallback: Try to extract from tables or structured content
  if (questions.length === 0) {
    console.log('No questions found with primary patterns, trying fallback extraction...');
    
    // Look for any content that resembles tender questions
    const fallbackPattern = /\b(tender|rfp|proposal|bid|quote|submission)\b.*?\b(what|how|describe|provide|explain|detail|specify|list|outline|demonstrate|give|show|present)\b[^.]*[.?]?/gi;
    const fallbackMatches = text.match(fallbackPattern);
    
    if (fallbackMatches) {
      for (const match of fallbackMatches) {
        const cleaned = match.trim();
        if (cleaned.length > 20 && cleaned.length < 500) {
          const questionText = cleaned.endsWith('?') ? cleaned : cleaned + '?';
          questions.push(questionText);
          console.log(`Fallback extraction: ${questionText.substring(0, 100)}...`);
        }
      }
    }
  }
  
  console.log(`Extracted ${questions.length} questions from document using enhanced algorithm`);
  
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