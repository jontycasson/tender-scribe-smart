
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessTenderRequest {
  tenderId: string;
  extractedText?: string;
  filePath?: string;
}

function extractQuestionsFromText(text: string): string[] {
  const questions: string[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`Processing ${lines.length} lines from extracted text`);
  console.log('Raw lines:', lines);
  
  // Track parent context for sub-questions
  let lastMainQuestion = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if line is too short
    if (line.length < 2) continue;
    
    // Enhanced question detection patterns
    const questionPatterns = [
      /^\d+[\.\)]\s*(.+)/,           // "1. Question" or "1) Question"
      /^[a-z][\.\)]\s*(.+)/i,       // "a. Question" or "a) Question" 
      /^Question\s*\d+[:\.]?\s*(.+)/i, // "Question 1: ..." or "Question 1. ..."
      /^Q\s*\d+[:\.]?\s*(.+)/i,     // "Q1: ..." or "Q 1. ..." 
      /(.+\?)\s*$/,                 // Lines ending with question mark
      /^(.+)/i,                     // Match all remaining lines for evaluation
    ];
    
    let bestMatch = null;
    let bestConfidence = 0;
    
    // Detect sub-questions (lines starting with lowercase letter + dot)
    const isSubQuestion = /^[a-z]\s*[\.\)]\s*/.test(line);
    
    for (const pattern of questionPatterns) {
      const match = line.match(pattern);
      if (match) {
        const extractedText = match[1] || match[0];
        let confidence = calculateQuestionConfidence(extractedText);
        
        // Much higher boost for sub-questions when we have a parent
        if (isSubQuestion && lastMainQuestion) {
          confidence += 0.5;
        }
        
        if (confidence > bestConfidence) {
          bestMatch = extractedText.trim();
          bestConfidence = confidence;
        }
      }
    }
    
    // Very low threshold to capture everything, especially sub-questions
    if (bestConfidence > 0.1 && bestMatch) {
      // Check for duplicates but be very lenient
      const isDuplicate = questions.some(q => {
        const similarity = calculateSimilarity(q.toLowerCase(), bestMatch.toLowerCase());
        return similarity > 0.85; // High similarity threshold
      });
      
      if (!isDuplicate) {
        // For sub-questions, link to the parent
        if (isSubQuestion && lastMainQuestion) {
          // Find the parent question to link with
          const parentPrefix = lastMainQuestion.substring(0, 30); // First part of parent
          bestMatch = `${parentPrefix} - ${bestMatch}`;
          console.log(`Linking sub-question "${bestMatch}" to parent "${lastMainQuestion}"`);
        } else if (!isSubQuestion) {
          // This is a main question, remember it for future sub-questions
          lastMainQuestion = bestMatch;
        }
        
        questions.push(bestMatch);
        console.log(`Added question ${questions.length}: ${bestMatch.substring(0, 100)}... (confidence: ${bestConfidence.toFixed(2)}, sub-question: ${isSubQuestion})`);
      } else {
        console.log(`Skipped duplicate question: ${bestMatch.substring(0, 50)}...`);
      }
    }
  }
  
  console.log(`Extracted ${questions.length} questions from text`);
  console.log('Final questions list:', questions);
  return questions;
}

function calculateQuestionConfidence(text: string): number {
  let confidence = 0.15; // Even lower base confidence
  
  // Strong boost confidence based on question indicators
  if (text.includes('?')) confidence += 0.4;
  if (/\b(what|how|when|where|why|which|who)\b/i.test(text)) confidence += 0.25;
  if (/\b(do|does|can|will|are|is|have|has)\s+you\b/i.test(text)) confidence += 0.3;
  if (/\b(describe|explain|provide|outline|detail|demonstrate|list|tell|confirm)\b/i.test(text)) confidence += 0.25;
  if (/\b(company|organisation|organization|business|service|policy|procedure|process|approach|experience|capability|compliant|certified|accredited)\b/i.test(text)) confidence += 0.2;
  
  // Very strong boosts for tender-specific terms
  if (/\b(DPO|CEO|name|tenure|continuity|challenges)\b/i.test(text)) confidence += 0.35;
  if (/\b(confirm|y\/n|yes\/no|\(y\/n\)|\(yes\/no\))\b/i.test(text)) confidence += 0.4;
  if (/\btime\s+you\s+experienced\b/i.test(text)) confidence += 0.3;
  if (/\bbusiness\s+continuity\b/i.test(text)) confidence += 0.3;
  
  // Minimal penalty for short texts since some questions are brief
  if (text.length < 10) confidence -= 0.05;
  if (text.length > 500) confidence -= 0.1;
  
  // Penalize common non-question phrases
  if (/\b(section|chapter|part|page|document|file|attachment)\b/i.test(text)) confidence -= 0.2;
  if (/\b(note|important|please|thank|regards|sincerely)\b/i.test(text)) confidence -= 0.15;
  
  return Math.max(0, Math.min(1, confidence));
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
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

    const { tenderId, extractedText, filePath } = await req.json() as ProcessTenderRequest;

    if (!tenderId || (!extractedText && !filePath)) {
      return new Response(JSON.stringify({ error: 'Missing required fields - need tenderId and either extractedText or filePath' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let textToProcess = extractedText;

    // If filePath is provided but no extractedText, use Nanonets to extract text
    if (!extractedText && filePath) {
      console.log(`No extracted text provided, using Nanonets to extract from: ${filePath}`);
      
      const nanonetsApiKey = Deno.env.get('NANONETS_API_KEY');
      const nanonetsModelId = Deno.env.get('NANONETS_MODEL_ID');
      
      if (!nanonetsApiKey || !nanonetsModelId) {
        console.error('Missing Nanonets API key or model ID');
        return new Response(JSON.stringify({ error: 'OCR service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        // Get the file from Supabase storage
        const { data: fileData, error: fileError } = await supabaseClient.storage
          .from('tender-documents')
          .download(filePath);

        if (fileError || !fileData) {
          console.error('Failed to download file:', fileError);
          return new Response(JSON.stringify({ error: 'Failed to download file for processing' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Prepare file for Nanonets API using FormData
        const formData = new FormData();
        const blob = new Blob([await fileData.arrayBuffer()], { 
          type: fileData.type || 'application/pdf' 
        });
        formData.append('file', blob, filePath.split('/').pop() || 'document.pdf');

        // Call Nanonets API
        const nanonetsResponse = await fetch(`https://app.nanonets.com/api/v2/OCR/Model/${nanonetsModelId}/LabelFile/`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(nanonetsApiKey + ':')}`,
          },
          body: formData,
        });

        if (!nanonetsResponse.ok) {
          const errorText = await nanonetsResponse.text();
          console.error('Nanonets API error:', nanonetsResponse.status, errorText);
          return new Response(JSON.stringify({ 
            error: `OCR service error: ${nanonetsResponse.status} - ${errorText.substring(0, 200)}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const nanonetsData = await nanonetsResponse.json();
        console.log('Nanonets response:', JSON.stringify(nanonetsData, null, 2));
        
        // Try different paths to extract text
        let extractedText = '';
        if (nanonetsData.result && nanonetsData.result.length > 0) {
          const result = nanonetsData.result[0];
          if (result.prediction && result.prediction.length > 0) {
            extractedText = result.prediction[0].ocr_text || '';
          }
        }
        
        // Fallback: try to get raw text from any field
        if (!extractedText && nanonetsData.result) {
          const allText = JSON.stringify(nanonetsData.result);
          console.log('No ocr_text found, searching in full result...');
        }
        
        textToProcess = extractedText;
        
        if (!textToProcess) {
          console.error('No text extracted from document');
          return new Response(JSON.stringify({ error: 'No text could be extracted from the document' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Extracted ${textToProcess.length} characters from document using Nanonets`);
      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        return new Response(JSON.stringify({ error: 'Failed to process document with OCR' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Processing tender ${tenderId} with ${textToProcess?.length || 0} characters of text`);

    // Update tender to extracting stage
    await supabaseClient
      .from('tenders')
      .update({
        status: 'processing',
        processing_stage: 'extracting',
        progress: 10,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    // Extract questions from the text
    console.log(`Extracting questions from text of length: ${textToProcess?.length || 0}`);
    const questions = extractQuestionsFromText(textToProcess || '');
    console.log(`Extracted ${questions.length} questions`);

    // Update tender with question count and progress
    await supabaseClient
      .from('tenders')
      .update({
        processing_stage: 'identifying',
        total_questions: questions.length,
        processed_questions: 0,
        progress: 20,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: 'No questions found in the document' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${questions.length} questions to process`);

    // Get tender details and company profile
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*, company_profiles(*)')
      .eq('id', tenderId)
      .single();

    if (tenderError || !tender) {
      console.error('Error fetching tender:', tenderError);
      return new Response(JSON.stringify({ error: 'Tender not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyProfile = tender.company_profiles;
    if (!companyProfile) {
      return new Response(JSON.stringify({ error: 'Company profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI responses for each question with proper ordering
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responses = [];
    
    // CRITICAL: Always insert a row for each question, even if AI generation fails
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`Processing question ${i + 1}/${questions.length}: ${question.substring(0, 100)}...`);
      
      // Always create a base response object first
      const baseResponse = {
        tender_id: tenderId,
        company_profile_id: companyProfile.id,
        question: question,
        question_index: i,
        is_approved: false,
        ai_generated_answer: null,
        question_type: null,
        response_length: 0,
        model_used: null,
        research_used: false,
      };

      // Classify question type for optimized response strategy
      const classification = classifyQuestion(question);
      console.log(`Question ${i + 1} classification:`, classification);
      baseResponse.question_type = classification.type;

      // Check if research is needed and enabled - default to enabled unless explicitly disabled
      let researchSnippet = null;
      const enableResearch = Deno.env.get('ENABLE_RESEARCH')?.toLowerCase() !== 'false'; // Default to true
      console.log(`Research enabled: ${enableResearch}`);
      
      if (enableResearch && classification.needsResearch) {
        console.log(`Attempting research for question: ${question.substring(0, 50)}`);
        const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
        try {
          researchSnippet = await fetchResearchSnippet(question, companyProfile.company_name, perplexityApiKey);
          if (researchSnippet) {
            console.log(`Research found: ${researchSnippet.substring(0, 100)}...`);
            baseResponse.research_used = true;
          } else {
            console.log('No research snippet returned');
          }
        } catch (error) {
          console.error(`Research failed for question ${i + 1}:`, error);
        }
      } else {
        console.log(`Research skipped - enabled: ${enableResearch}, needs research: ${classification.needsResearch}`);
      }

      // Generate AI response with retries
      const prompt = `You are a tender response writer for ${companyProfile.company_name}. Generate a professional response for this tender question.

Company Context:
${JSON.stringify(companyProfile, null, 2)}

Question: ${question}
Question Type: ${classification.type} (${classification.reasoning})

${researchSnippet ? `Research Context: ${researchSnippet}` : ''}

Requirements:
- Write in British English
- Be professional and confident
- Use specific company details from the profile when available
- For ${classification.type} questions, provide ${classification.type === 'closed' ? 'direct, factual answers' : 'detailed explanations with examples'}
- CRITICAL: NEVER use placeholder text like [Name], [CEO Name], [Title], [Position], or similar brackets. If specific information is not available in the company profile, provide professional responses like "We have appropriate personnel in place" or "We maintain suitable governance structures"
- Focus on capabilities and experience relevant to the question
- Keep response appropriate in length for the question type
- Base responses only on information provided in the company context
- If specific details are not available, acknowledge this professionally without using placeholders
${researchSnippet ? '- Incorporate relevant research findings naturally into your response' : ''}

Generate a tailored response:`;

      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`Generating response for question ${i + 1}/${questions.length} (attempt ${retryCount + 1}): ${question.substring(0, 100)}...`);
          
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a professional tender response writer who uses British English spelling and terminology. Never use placeholder text in brackets like [Name] or [Title]. Always provide complete, professional responses.' },
                { role: 'user', content: prompt }
              ],
              max_tokens: classification.type === 'closed' ? 200 : 500,
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error(`OpenAI API error for question ${i + 1} (attempt ${retryCount + 1}):`, aiResponse.status, aiResponse.statusText, errorText);
            throw new Error(`API Error: ${aiResponse.status} - ${errorText}`);
          }

          const aiData = await aiResponse.json();
          const generatedAnswer = aiData.choices[0]?.message?.content;

          if (generatedAnswer) {
            baseResponse.ai_generated_answer = generatedAnswer;
            baseResponse.response_length = generatedAnswer.length;
            baseResponse.model_used = 'gpt-4o-mini';
            console.log(`Successfully generated response for question ${i + 1}`);
            break; // Success, exit retry loop
          } else {
            throw new Error('No content returned from OpenAI');
          }
        } catch (error) {
          console.error(`Error generating response for question ${i + 1} (attempt ${retryCount + 1}):`, error);
          retryCount++;
          
          if (retryCount > maxRetries) {
            console.error(`Failed to generate response for question ${i + 1} after ${maxRetries + 1} attempts`);
            baseResponse.ai_generated_answer = 'Failed to generate response. Please try regenerating.';
            baseResponse.model_used = 'error';
            break;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // ALWAYS push the response, even if AI generation failed
      responses.push(baseResponse);
    }

    if (responses.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to generate any responses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert all responses
    const { data: insertedResponses, error: insertError } = await supabaseClient
      .from('tender_responses')
      .insert(responses)
      .select();

    if (insertError) {
      console.error('Error inserting responses:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save responses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Update tender status to draft after successful processing
    console.log(`Updating tender ${tenderId} status to 'draft'`);
    const { error: statusUpdateError } = await supabaseClient
      .from('tenders')
      .update({ status: 'draft' })
      .eq('id', tenderId);

    if (statusUpdateError) {
      console.error('Error updating tender status:', statusUpdateError);
      // Don't fail the whole process for this
    } else {
      console.log(`Successfully updated tender ${tenderId} status to 'draft'`);
    }

    console.log(`Successfully processed ${responses.length} questions for tender ${tenderId}`);

    return new Response(JSON.stringify({
      success: true,
      questionsProcessed: responses.length,
      responses: insertedResponses
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-tender function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

// Enhanced research function using Perplexity API
async function fetchResearchSnippet(question: string, companyName: string, perplexityApiKey?: string): Promise<string | null> {
  if (!perplexityApiKey) {
    console.log('Perplexity API key not available, skipping research');
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
