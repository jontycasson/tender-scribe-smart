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
        console.log('Nanonets response type:', typeof nanonetsData);
        console.log('Nanonets response keys:', Object.keys(nanonetsData || {}));
        
        if (nanonetsData.result && Array.isArray(nanonetsData.result)) {
          // Standard Nanonets OCR response format - handle nested predictions
          extractedText = nanonetsData.result
            .map((item: any) => {
              // Handle different result item formats
              if (typeof item === 'string') return item;
              if (item && typeof item.ocr_text === 'string') return item.ocr_text;
              if (item && typeof item.text === 'string') return item.text;
              if (item && typeof item.prediction === 'string') return item.prediction;
              
              // Handle nested prediction arrays (actual Nanonets format)
              if (item && item.prediction && Array.isArray(item.prediction)) {
                return item.prediction
                  .map((pred: any) => {
                    if (pred && typeof pred.ocr_text === 'string') return pred.ocr_text;
                    if (pred && typeof pred.text === 'string') return pred.text;
                    return '';
                  })
                  .filter((text: string) => text && text.trim && text.trim().length > 0)
                  .join('\n');
              }
              
              return '';
            })
            .filter((text: string) => text && text.trim && text.trim().length > 0)
            .join('\n');
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
            .map((pred: any) => {
              if (pred && typeof pred.text === 'string') return pred.text;
              if (pred && typeof pred.ocr_text === 'string') return pred.ocr_text;
              return '';
            })
            .filter((text: string) => text && text.trim && text.trim().length > 0)
            .join('\n');
        } else if (nanonetsData.data && Array.isArray(nanonetsData.data)) {
          // Alternative data format
          extractedText = nanonetsData.data
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && typeof item.text === 'string') return item.text;
              if (item && typeof item.ocr_text === 'string') return item.ocr_text;
              return '';
            })
            .filter((text: string) => text && text.trim && text.trim().length > 0)
            .join('\n');
        }
        
        // Ensure extractedText is a string before processing
        if (typeof extractedText !== 'string') {
          console.error('Extracted text is not a string:', typeof extractedText, extractedText);
          extractedText = String(extractedText || '');
        }
        
        // Clean up the extracted text only if it's a valid string
        if (extractedText && typeof extractedText === 'string') {
          extractedText = extractedText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }
           
        console.log('Text extraction successful. Extracted text length:', extractedText?.length || 0);
        console.log('Text extraction method used:', 
          nanonetsData.result ? 'result array' :
          nanonetsData.message ? 'message field' :
          nanonetsData.text ? 'text field' :
          nanonetsData.content ? 'content field' :
          nanonetsData.predictions ? 'predictions array' :
          nanonetsData.data ? 'data array' :
          typeof nanonetsData === 'string' ? 'direct string' : 'unknown'
        );
        console.log('First 500 characters:', extractedText?.substring(0, 500) || 'No text extracted');
        
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

      // Get tender and company profile for personalized responses
      const { data: tenderData } = await supabase
        .from('tenders')
        .select('user_id, company_profile_id')
        .eq('id', tenderId)
        .single();

      const { data: profileData } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', tenderData.company_profile_id)
        .maybeSingle();

      // Generate AI responses for each question with enhanced processing
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
      
      console.log(`Processing ${questions.length} questions for tender ${tenderId}`);
      console.log('Research capability:', perplexityApiKey ? 'enabled' : 'disabled');
      
      // Process all questions with memory search first, then AI generation and collect responses before saving
      const responsesToInsert = [];
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`Processing question ${i + 1}/${questions.length}: ${question.substring(0, 100)}...`);
        
        try {
          // First, check if we have this question in memory
          let memoryResult = null;
          let aiResponse = null;
          let metadata = {
            questionType: 'open',
            researchUsed: false,
            modelUsed: 'memory',
            responseLength: 0,
            processingTimeMs: 0
          };

          if (tenderData.company_profile_id && openAIApiKey) {
            const startTime = Date.now();
            
            try {
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

              if (embeddingResponse.ok) {
                const embeddingData = await embeddingResponse.json();
                const embedding = embeddingData.data[0].embedding;

                // Search memory for similar questions
                const { data: memoryResults } = await supabase.rpc('match_qa_memory', {
                  query_embedding: embedding,
                  company_id: tenderData.company_profile_id,
                  match_threshold: 0.8,
                  match_count: 1
                });

                if (memoryResults && memoryResults.length > 0) {
                  memoryResult = memoryResults[0];
                  aiResponse = memoryResult.answer;
                  
                  // Update usage count
                  await supabase
                    .from('qa_memory')
                    .update({ 
                      usage_count: memoryResult.usage_count + 1,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', memoryResult.id);

                  metadata = {
                    questionType: 'memory',
                    researchUsed: false,
                    modelUsed: 'memory',
                    responseLength: aiResponse.length,
                    processingTimeMs: Date.now() - startTime
                  };
                  
                  console.log(`Found memory match for question ${i + 1} (similarity: ${memoryResult.similarity})`);
                }
              }
            } catch (memoryError) {
              console.error(`Memory search failed for question ${i + 1}:`, memoryError);
            }
          }

          // If no memory match, generate new AI response
          if (!aiResponse) {
            const result = await generateEnhancedAIResponse(
              question, 
              profileData, 
              openAIApiKey,
              perplexityApiKey
            );
            aiResponse = result.response;
            metadata = result.metadata;
          }
          
          responsesToInsert.push({
            tender_id: tenderId,
            company_profile_id: tenderData.company_profile_id,
            question: question,
            ai_generated_answer: aiResponse,
            is_approved: false,
            question_type: metadata.questionType,
            research_used: metadata.researchUsed,
            model_used: metadata.modelUsed,
            response_length: metadata.responseLength,
            processing_time_ms: metadata.processingTimeMs
          });
          
          console.log(`Successfully processed question ${i + 1} using ${metadata.modelUsed} (${metadata.responseLength} chars, ${metadata.processingTimeMs}ms)`);
        } catch (error) {
          console.error(`Error processing question ${i + 1}:`, error);
          
          // Enhanced fallback response with metadata
          const fallbackResponse = `Based on our company profile and ${profileData?.years_in_business || 'significant'} experience in ${profileData?.industry || 'this sector'}, we are well-positioned to address this requirement. Our team maintains appropriate standards and would be pleased to provide detailed information upon request.`;
          
          responsesToInsert.push({
            tender_id: tenderId,
            company_profile_id: tenderData.company_profile_id,
            question: question,
            ai_generated_answer: fallbackResponse,
            is_approved: false,
            question_type: 'open',
            research_used: false,
            model_used: 'fallback',
            response_length: fallbackResponse.length,
            processing_time_ms: 0
          });
        }
      }
      
      console.log(`Generated ${responsesToInsert.length} responses, now saving to database...`);
      
      // Save all responses in a single batch operation for better reliability
      const { error: batchInsertError } = await supabase
        .from('tender_responses')
        .insert(responsesToInsert);

      if (batchInsertError) {
        console.error('Error batch saving responses:', batchInsertError);
        throw new Error(`Failed to save tender responses: ${batchInsertError.message}`);
      }
      
      console.log('All responses saved successfully');

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
        
        // Check for question indicators - expanded to include common tender questions
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate|give|show|present|do\s+you|can\s+you|have\s+you|will\s+you|are\s+you|is\s+your)/i;
        const businessTerms = /\b(experience|approach|method|capability|ability|requirements?|criteria|strategy|plan|proposal|solution|process|procedure|compliance|certification|qualification|DPO|CEO|staff|team|policy|policies)/i;
        
        if (questionWords.test(content) || businessTerms.test(content) || content.includes('(') || content.includes('/')) {
          return content.endsWith('?') ? content : content + '?';
        }
        return null;
      }
    },

    // 2. Lettered questions (A. What is..., B) How do..., C: Why..., a. Sub-question...)
    {
      pattern: /^([A-Za-z][\.\)\:]?\s*)(.*)/i,
      confidence: 0.9,
      process: (match: RegExpMatchArray, line: string) => {
        const content = match[2].trim();
        if (content.endsWith('?')) return content;
        
        // Check for question indicators - expanded to include common tender questions and sub-questions
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate|give|show|present|do\s+you|can\s+you|have\s+you|will\s+you|are\s+you|is\s+your|confirm|name|tenure|title|role)/i;
        const businessTerms = /\b(experience|approach|method|capability|ability|requirements?|criteria|strategy|plan|proposal|solution|process|procedure|compliance|certification|qualification|DPO|CEO|staff|team|policy|policies|name|tenure|title|role|details|information)/i;
        
        if (questionWords.test(content) || businessTerms.test(content) || content.includes('(') || content.includes('/') || content.includes('if so')) {
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
        
        // Q-prefixed items are very likely to be questions - expanded patterns
        const questionWords = /^(what|how|when|where|why|which|who|describe|explain|provide|list|outline|detail|specify|state|identify|demonstrate|give|show|present|do\s+you|can\s+you|have\s+you|will\s+you|are\s+you|is\s+your)/i;
        const businessTerms = /\b(experience|approach|method|capability|ability|requirements?|criteria|strategy|plan|proposal|solution|process|procedure|compliance|certification|qualification|DPO|CEO|staff|team|policy|policies)/i;
        
        if (questionWords.test(content) || businessTerms.test(content) || content.length > 10 || content.includes('(') || content.includes('/')) {
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
  
  // Process each line with all patterns, tracking parent-child relationships
  let currentParentQuestion: string | null = null;
  const processedQuestions: string[] = [];
  
  for (const line of lines) {
    console.log(`Processing line: "${line}"`);
    let bestMatch = null;
    let bestConfidence = 0;
    let isNumberedQuestion = false;
    let isLetteredSubQuestion = false;
    let matchedPattern = null;
    
    for (const extractor of extractionPatterns) {
      const match = line.match(extractor.pattern);
      if (match && extractor.confidence > bestConfidence) {
        const processed = extractor.process(match, line);
        if (processed && processed.length > 10) {
          bestMatch = processed;
          bestConfidence = extractor.confidence;
          matchedPattern = extractor;
          
          // Check if this is a numbered question (first pattern)
          if (extractor === extractionPatterns[0]) {
            isNumberedQuestion = true;
            console.log(`Detected numbered question: ${processed.substring(0, 50)}...`);
          }
          
          // Check if this is a lettered sub-question (second pattern with lowercase letter)
          if (extractor === extractionPatterns[1]) {
            // Use the original match to check if it starts with lowercase letter
            const letterPrefix = match[1];
            console.log(`Lettered pattern matched - prefix: "${letterPrefix}", content: "${match[2]}"`);
            if (letterPrefix && letterPrefix.match(/^[a-z]/)) {
              isLetteredSubQuestion = true;
              console.log(`Detected lettered sub-question: ${processed.substring(0, 50)}...`);
            }
          }
        }
      }
    }
    
    // Only process if confidence is above threshold
    if (bestMatch && bestConfidence >= 0.6) {
      // Simplify duplicate detection - only exact matches
      const normalizedQuestion = bestMatch.toLowerCase().trim();
      const isDuplicate = processedQuestions.some(q => 
        q.toLowerCase().trim() === normalizedQuestion
      );
      
      if (!isDuplicate) {
        if (isNumberedQuestion) {
          // This is a new parent question
          currentParentQuestion = bestMatch;
          processedQuestions.push(bestMatch);
          console.log(`Extracted parent question (confidence: ${bestConfidence}): ${bestMatch.substring(0, 100)}...`);
          
        } else if (isLetteredSubQuestion && currentParentQuestion) {
          // This is a sub-question - append it to the current parent
          const parentIndex = processedQuestions.length - 1;
          if (parentIndex >= 0 && processedQuestions[parentIndex] === currentParentQuestion) {
            // Append sub-question to parent
            processedQuestions[parentIndex] += ` Also: ${bestMatch}`;
            console.log(`Attached sub-question to parent: "${bestMatch}" -> "${currentParentQuestion.substring(0, 50)}..."`);
          } else {
            // Fallback: treat as standalone question if parent not found
            processedQuestions.push(bestMatch);
            console.log(`No parent found, extracted standalone lettered question: ${bestMatch.substring(0, 100)}...`);
          }
          
        } else {
          // This is a standalone question or lettered question with uppercase (treat as new parent)
          if (matchedPattern === extractionPatterns[1]) {
            // Uppercase lettered question becomes new parent
            currentParentQuestion = bestMatch;
          } else {
            // Reset parent tracking for other types
            currentParentQuestion = null;
          }
          processedQuestions.push(bestMatch);
          console.log(`Extracted standalone question (confidence: ${bestConfidence}): ${bestMatch.substring(0, 100)}...`);
        }
      } else {
        console.log(`Skipped duplicate question: ${bestMatch.substring(0, 50)}...`);
      }
    } else {
      console.log(`Line didn't meet criteria - confidence: ${bestConfidence}, match: ${bestMatch ? 'yes' : 'no'}`);
    }
  }
  
  // Add processed questions to final array
  questions.push(...processedQuestions);
  
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

// Helper function to identify entity questions that need research
function needsEntityResearch(question: string): boolean {
  const questionLower = question.toLowerCase();
  
  // Entity patterns that benefit from research
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
  
  // Closed question indicators (Yes/No, factual, compliance)
  const closedPatterns = [
    /^(do\s+you|have\s+you|can\s+you|will\s+you|are\s+you|is\s+your)\b/,
    /\b(yes\s*\/\s*no|y\s*\/\s*n)\b/,
    /\b(certified|accredited|compliant|registered|licensed)\b/,
    /\b(how\s+many|what\s+is\s+your|when\s+did)\b/
  ];
  
  // Open question indicators (process, strategy, approach)
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
    // Default to open for safety
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
    console.log('Fetching research for question:', question.substring(0, 100) + '...');
    
    // Determine if this is an entity question
    const isEntityQuestion = needsEntityResearch(question);
    
    // Enhanced prompt for entity-specific research
    let researchPrompt;
    if (isEntityQuestion) {
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
            content: isEntityQuestion 
              ? 'You are a research assistant helping find specific information about companies and their personnel. Provide factual, verifiable information with sources when possible.'
              : 'Provide factual information to help answer business and procurement questions. Focus on current best practices, regulations, and industry standards.'
          },
          {
            role: 'user',
            content: researchPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: isEntityQuestion ? 400 : 300,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API failed:', response.status);
      return null;
    }

    const data = await response.json();
    const researchContent = data.choices?.[0]?.message?.content;
    
    if (researchContent && researchContent.length > 20) {
      console.log(`Research fetched successfully (${isEntityQuestion ? 'entity' : 'general'}), length:`, researchContent.length);
      return researchContent;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching research:', error);
    return null;
  }
}

// Enhanced AI response generation with research integration
async function generateEnhancedAIResponse(
  question: string, 
  profile: any, 
  openaiApiKey: string,
  perplexityApiKey?: string
): Promise<{
  response: string;
  metadata: {
    questionType: 'closed' | 'open';
    researchUsed: boolean;
    modelUsed: string;
    responseLength: number;
    processingTimeMs: number;
  }
}> {
  const startTime = Date.now();
  
  // Step 1: Classify the question
  const { type: questionType, reasoning, needsResearch } = classifyQuestion(question);
  console.log(`Question classified as ${questionType}: ${reasoning}`);
  
      // Step 2: Fetch research for questions that need it (open questions or entity closed questions)
      let researchSnippet: string | null = null;
      if (needsResearch) {
        console.log('Fetching research snippet...');
        const companyName = profile?.company_name || 'the company';
        researchSnippet = await fetchResearchSnippet(question, companyName, perplexityApiKey);
        if (researchSnippet) {
          console.log('Research snippet fetched successfully, length:', researchSnippet.length);
        } else {
          console.log('No research snippet obtained');
        }
      } else {
        console.log('Research not needed for this question type');
      }
  
  // Step 3: Build enhanced prompt
  const contextSection = `## Company Profile:
**Company:** ${profile?.company_name || 'N/A'}
**Industry:** ${profile?.industry || 'N/A'}
**Team Size:** ${profile?.team_size || 'N/A'}
**Years in Business:** ${profile?.years_in_business || 'N/A'}
**Services Offered:** ${profile?.services_offered?.join(', ') || 'N/A'}
**Mission:** ${profile?.mission || 'N/A'}
**Values:** ${profile?.values || 'N/A'}
**Specializations:** ${profile?.specializations || 'N/A'}
**Past Projects:** ${profile?.past_projects || 'N/A'}
**Accreditations:** ${profile?.accreditations || 'N/A'}
**Policies:** ${profile?.policies || 'N/A'}`;

  const researchSection = researchSnippet ? `
## Research Context:
${researchSnippet}

**Important:** Use this research to enhance accuracy and depth, but rephrase everything into the company's voice. Never copy word-for-word.` : '';

  const enhancedPrompt = `You are an expert tender response assistant generating high-quality, tailored answers to questions found in RFPs, PQQs, or security questionnaires. Your goal is to produce responses that maximise clarity, score highly against evaluation criteria, and feel human-written.

💡 You are provided with:
- A QUESTION (classified as ${questionType === 'closed' ? 'CLOSED' : 'OPEN'})
- CONTEXT (company policies, past responses, facts)${researchSnippet ? '\n- RESEARCH_SNIPPET (external info to enhance depth)' : ''}

${contextSection}${researchSection}

## Question to Answer:
${question}

--- RESPONSE STRATEGY ---

1. ❓ This is a **${questionType.toUpperCase()}** question (${questionType === 'closed' ? 'Yes/No or factual' : 'asks for process, depth, or explanation'}).

2. 📚 ${researchSnippet ? 'Research snippet provided - use it to enhance depth or accuracy but never copy word-for-word. Rephrase and adapt it into the company\'s voice.' : 'No additional research available - rely on company context.'}

3. 🗃 Prioritise company-specific information (policies, systems, responsibilities) to ground the response.

4. ✍️ Generate a DYNAMIC RESPONSE:
   - **${questionType === 'closed' ? 'Short (2–4 sentences)' : 'Medium to detailed (4+ sentences)'}** for this ${questionType} question
   - Use **British English** spellings (e.g. "organisation", "authorisation")
   - ${questionType === 'closed' ? 'Be direct and concise' : 'Use structured formatting with **bold**, bullet points, or numbered lists where helpful'}

5. 🤖 Never fabricate policies, systems, certifications or staff roles. Only use what's provided via CONTEXT${researchSnippet ? ' or RESEARCH_SNIPPET' : ''}.

6. ✅ Aim for clarity, relevance, and helpfulness. Avoid buzzwords or fluff.

Generate your response in plain text with markdown formatting when helpful:`;

  // Step 4: Get model configuration
  const modelToUse = Deno.env.get('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
  console.log('Using OpenAI model:', modelToUse);
  
  // Determine if we're using a newer model that requires different parameters
  const isNewerModel = modelToUse.startsWith('gpt-5') || modelToUse.startsWith('o3') || modelToUse.startsWith('o4') || modelToUse.startsWith('gpt-4.1');
  
  const requestBody: any = {
    model: modelToUse,
    messages: [
      { 
        role: 'system', 
        content: 'You are a professional tender response assistant. Generate winning answers that are tailored, well-structured, and clearly demonstrate capabilities while following the specific guidance provided.' 
      },
      { role: 'user', content: enhancedPrompt }
    ]
  };
  
  // Add appropriate token limits and temperature based on model
  if (isNewerModel) {
    requestBody.max_completion_tokens = questionType === 'closed' ? 150 : 800;
    // Note: newer models don't support temperature parameter
  } else {
    requestBody.max_tokens = questionType === 'closed' ? 150 : 800;
    requestBody.temperature = 0.7;
  }

  try {
    console.log(`Generating response with ${modelToUse} for ${questionType} question`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API failed:', response.status, errorText);
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    const processingTime = Date.now() - startTime;
    
    console.log(`Generated ${questionType} response (${aiResponse.length} chars) in ${processingTime}ms`);
    
    return {
      response: aiResponse,
      metadata: {
        questionType,
        researchUsed: !!researchSnippet,
        modelUsed: modelToUse,
        responseLength: aiResponse.length,
        processingTimeMs: processingTime
      }
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    const processingTime = Date.now() - startTime;
    
    // Enhanced fallback response
    const fallbackResponse = questionType === 'closed' 
      ? `Yes, our ${profile?.company_name || 'organisation'} meets this requirement. With ${profile?.years_in_business || 'significant'} experience in ${profile?.industry || 'this sector'}, we maintain appropriate ${questionType === 'closed' && question.toLowerCase().includes('policy') ? 'policies and procedures' : 'standards and practices'}.`
      : `Our ${profile?.company_name || 'organisation'} has developed a comprehensive approach to this requirement. With ${profile?.years_in_business || 'significant'} experience in ${profile?.industry || 'the sector'} and a team of ${profile?.team_size || 'experienced professionals'}, we maintain robust processes and procedures. We would be pleased to provide detailed information during the evaluation process.`;
    
    return {
      response: fallbackResponse,
      metadata: {
        questionType,
        researchUsed: false,
        modelUsed: 'fallback',
        responseLength: fallbackResponse.length,
        processingTimeMs: processingTime
      }
    };
  }
}