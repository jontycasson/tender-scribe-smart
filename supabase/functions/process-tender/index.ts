
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
  let currentParent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if line is too short to be a meaningful question
    if (line.length < 2) continue;
    
    // Enhanced question detection patterns with sub-question linking
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
    let isSubQuestion = false;
    
    // Check if this is a sub-question (starts with lowercase letter)
    if (/^[a-z][\.\)]\s*/.test(line)) {
      isSubQuestion = true;
    }
    
    for (const pattern of questionPatterns) {
      const match = line.match(pattern);
      if (match) {
        const extractedText = match[1] || match[0];
        let confidence = calculateQuestionConfidence(extractedText);
        
        // Boost confidence for sub-questions if there's a recent parent
        if (isSubQuestion && currentParent && questions.length > 0) {
          confidence += 0.4;
        }
        
        if (confidence > bestConfidence) {
          bestMatch = extractedText.trim();
          bestConfidence = confidence;
        }
      }
    }
    
    // Lower confidence threshold for better extraction, especially sub-questions
    if (bestConfidence > 0.15 && bestMatch) {
      // More lenient duplicate checking for sub-questions
      const similarityThreshold = isSubQuestion ? 0.6 : 0.7;
      const isDuplicate = questions.some(q => 
        calculateSimilarity(q.toLowerCase(), bestMatch.toLowerCase()) > similarityThreshold
      );
      
      if (!isDuplicate) {
        // Link sub-questions to their parent context if available
        if (isSubQuestion && currentParent) {
          bestMatch = `${currentParent} - ${bestMatch}`;
        } else if (!isSubQuestion) {
          // Update current parent for future sub-questions
          currentParent = bestMatch.split(/[?:]|\.$/)[0].trim();
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

    // Extract questions from the text
    const questions = extractQuestionsFromText(textToProcess || '');

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
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`Generating response for question ${i + 1}/${questions.length}: ${question.substring(0, 100)}...`);
      
      // Classify question type for optimized response strategy
      const classification = classifyQuestion(question);
      console.log(`Question ${i + 1} classification:`, classification);

      // Check if research is needed and enabled
      let researchSnippet = null;
      const enableResearch = Deno.env.get('ENABLE_RESEARCH')?.toLowerCase() === 'true';
      
      if (enableResearch && classification.needsResearch) {
        const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
        researchSnippet = await fetchResearchSnippet(question, companyProfile.company_name, perplexityApiKey);
      }

      // Generate AI response
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

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a professional tender response writer. Never use placeholder text in brackets like [Name] or [Title]. Always provide complete, professional responses.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: classification.type === 'closed' ? 200 : 500,
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`OpenAI API error for question ${i + 1}:`, aiResponse.status, aiResponse.statusText);
          continue;
        }

        const aiData = await aiResponse.json();
        const generatedAnswer = aiData.choices[0]?.message?.content;

        if (generatedAnswer) {
          responses.push({
            tender_id: tenderId,
            company_profile_id: companyProfile.id,
            question: question,
            ai_generated_answer: generatedAnswer,
            question_index: i, // Add explicit ordering
            question_type: classification.type,
            response_length: generatedAnswer.length,
            model_used: 'gpt-4o-mini',
            research_used: !!researchSnippet,
            is_approved: false
          });
        }
      } catch (error) {
        console.error(`Error generating response for question ${i + 1}:`, error);
      }
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

    // Update tender status to draft after successful processing
    const { error: statusUpdateError } = await supabaseClient
      .from('tenders')
      .update({ status: 'draft' })
      .eq('id', tenderId);

    if (statusUpdateError) {
      console.error('Error updating tender status:', statusUpdateError);
      // Don't fail the whole process for this
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
