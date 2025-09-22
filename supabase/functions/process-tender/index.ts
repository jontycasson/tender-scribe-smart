import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function validateTenderId(tenderId: string): boolean {
  return typeof tenderId === 'string' && tenderId.length > 0 && tenderId.length < 100;
}

function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/javascript:/gi, '')
             .replace(/on\w+\s*=/gi, '')
             .trim();
}

interface ProcessTenderRequest {
  tenderId: string;
}

interface SegmentedContent {
  context: string[];
  instructions: string[];
  questions: { question_number: number; question_text: string }[];
}

interface QuestionItem {
  question_number: number;
  question_text: string;
}

// ============= FILE HANDLING =============

function detectFileType(filename: string): { type: string, needsOCR: boolean } {
  const extension = filename.toLowerCase().split('.').pop() || '';
  
  const textFileTypes = ['docx', 'xlsx', 'txt', 'csv'];
  const ocrFileTypes = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];
  
  if (textFileTypes.includes(extension)) {
    return { type: extension, needsOCR: false };
  } else if (ocrFileTypes.includes(extension)) {
    return { type: extension, needsOCR: true };
  }
  
  return { type: 'unknown', needsOCR: true }; // Default to OCR for unknown types
}

async function extractTextFromFile(filePath: string, supabaseClient: any): Promise<string> {
  try {
    // Download the file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('tender-documents')
      .download(filePath);

    if (fileError || !fileData) {
      throw new Error('Failed to download file');
    }

    // Simple text extraction for supported formats
    if (filePath.toLowerCase().endsWith('.txt')) {
      return await fileData.text();
    }
    
    // For other text-based files, attempt to extract plain text
    // This is a simplified implementation - in production you'd use proper parsers
    const text = await fileData.text();
    return sanitizeText(text);
    
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// ============= OCR PROCESSING =============

async function extractTextWithOCR(filePath: string, supabaseClient: any): Promise<string> {
  const serviceAccountJson = Deno.env.get('GOOGLE_DOCAI_SERVICE_ACCOUNT_JSON');
  const processorId = Deno.env.get('GOOGLE_DOCAI_PROCESSOR_ID');
  const projectId = processorId?.split('/')[1]; // Extract project ID from processor ID
  const location = Deno.env.get('GOOGLE_DOCAI_LOCATION') || 'eu';

  if (!serviceAccountJson || !processorId) {
    console.log('Google Document AI not configured, skipping OCR');
    return ''; // Don't block processing if OCR is not available
  }

  try {
    // Download the file for OCR processing
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('tender-documents')
      .download(filePath);

    if (fileError || !fileData) {
      throw new Error('Failed to download file for OCR processing');
    }

    // Convert file to base64
    const fileBuffer = await fileData.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Determine MIME type
    const mimeType = fileData.type || 'application/pdf';

    // Parse service account JSON
    const serviceAccountKey = JSON.parse(serviceAccountJson);
    
    // Get OAuth token (simplified - in production use proper JWT)
    // For now, we'll skip OCR if JWT creation is complex
    console.log('OCR processing would require JWT implementation - skipping for now');
    return '';
    
  } catch (error) {
    console.error('OCR processing failed:', error);
    return ''; // Don't block processing
  }
}

// ============= QUESTION DETECTION =============

function detectQuestions(text: string): QuestionItem[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const questions: QuestionItem[] = [];
  let questionNumber = 1;

  for (const line of lines) {
    // Skip very short lines
    if (line.length < 10) continue;
    
    // Clean the line
    const cleanLine = line.replace(/^[\d\.\)\-\*\•\s]+/, '').trim();
    
    // Question patterns
    const isDirectQuestion = cleanLine.endsWith('?');
    const isImperative = /^(describe|provide|explain|tell|list|outline|detail|specify|identify|confirm|do you|can you|will you|have you|are you|state|indicate|demonstrate|show)/i.test(cleanLine);
    const isNumberedItem = /^\d+[\.\)]/.test(line) && cleanLine.length > 20;
    const isBulletedItem = /^[\*\•\-]/.test(line) && cleanLine.length > 20;
    const isRequestPhrase = /please|kindly|we require|we need|you should|you must|required to/i.test(cleanLine);
    
    if (isDirectQuestion || isImperative || isNumberedItem || isBulletedItem || isRequestPhrase) {
      questions.push({
        question_number: questionNumber++,
        question_text: cleanLine
      });
    }
  }

  return questions;
}

// ============= CONTENT SEGMENTATION =============

async function segmentContent(text: string, openAIApiKey: string): Promise<SegmentedContent> {
  const systemPrompt = `You are a document analysis expert. Categorize tender document content into three categories:

1. CONTEXT: Background information, objectives, scope, buyer narrative, company information
2. INSTRUCTIONS: Compliance rules, evaluation criteria, submission requirements, formatting guidelines  
3. QUESTIONS: Items requiring vendor responses (questions, requirements, requests for information)

FLEXIBLE HANDLING:
- For full RFP documents: Extract all three categories
- For simple question lists: Context/Instructions may be empty - focus on Questions
- Questions can be direct questions (?), imperatives (Describe..., Provide...), or numbered requirements
- Extract questions EXACTLY as written - no paraphrasing
- ALWAYS return all three arrays, even if some are empty

Return JSON format:
{
  "context": ["item1", "item2"],
  "instructions": ["instruction1", "instruction2"], 
  "questions": [{"question_number": 1, "question_text": "exact question text"}]
}`;

  const userPrompt = `Categorize this document content:

${text}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI segmentation failed:', response.status, await response.text());
      throw new Error('Segmentation failed');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    // Ensure structured questions format
    let questions: QuestionItem[] = [];
    if (Array.isArray(result.questions)) {
      questions = result.questions.map((q: any, index: number) => {
        if (typeof q === 'string') {
          return { question_number: index + 1, question_text: q };
        }
        return {
          question_number: q.question_number || index + 1,
          question_text: q.question_text || q
        };
      });
    }

    return {
      context: Array.isArray(result.context) ? result.context : [],
      instructions: Array.isArray(result.instructions) ? result.instructions : [],
      questions
    };

  } catch (error) {
    console.error('Content segmentation failed, using fallback detection:', error);
    // Fallback: Use pattern-based question detection
    const detectedQuestions = detectQuestions(text);
    
    return {
      context: [],
      instructions: [],
      questions: detectedQuestions.length > 0 ? detectedQuestions : [{ question_number: 1, question_text: "Please describe your company's capabilities and experience relevant to this opportunity." }]
    };
  }
}

// ============= RESPONSE GENERATION =============

async function generateResponse(
  question: QuestionItem, 
  companyProfile: any, 
  context: string[], 
  instructions: string[], 
  openAIApiKey: string
): Promise<string> {
  
  const systemPrompt = `You are an expert tender response writer. Generate professional, accurate responses to tender questions using the company's profile and any provided context.

RESPONSE GUIDELINES:
- Be specific and detailed where possible
- Use professional, formal language appropriate for government/corporate tenders
- If information is not available in the company profile, indicate this clearly
- Follow any specific instructions provided
- Ensure compliance with requirements mentioned in the instructions`;

  let userPrompt = `Company Profile:
Company Name: ${companyProfile.company_name}
Industry: ${companyProfile.industry}
Team Size: ${companyProfile.team_size}
Services: ${companyProfile.services_offered?.join(', ') || 'Not specified'}
Specializations: ${companyProfile.specializations}
Mission: ${companyProfile.mission}
Values: ${companyProfile.values}
Past Projects: ${companyProfile.past_projects}
Years in Business: ${companyProfile.years_in_business}`;

  if (companyProfile.accreditations) {
    userPrompt += `\nAccreditations: ${companyProfile.accreditations}`;
  }
  if (companyProfile.policies) {
    userPrompt += `\nPolicies: ${companyProfile.policies}`;
  }

  if (context.length > 0) {
    userPrompt += `\n\nTender Context:\n${context.join('\n')}`;
  }

  if (instructions.length > 0) {
    userPrompt += `\n\nSubmission Instructions:\n${instructions.join('\n')}`;
  }

  userPrompt += `\n\nQuestion ${question.question_number}: ${question.question_text}

Please provide a comprehensive response to this question based on the company profile and any relevant context provided.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      console.error('OpenAI response generation failed:', response.status);
      return 'Error generating response. Please provide a manual answer for this question.';
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate response';

  } catch (error) {
    console.error('Error generating response:', error);
    return 'Error generating response. Please provide a manual answer for this question.';
  }
}

// ============= MAIN PROCESSING FUNCTION =============

async function processTender(tenderId: string): Promise<any> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log(`Processing tender: ${tenderId}`);

    // Get tender details
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

    if (tenderError || !tender) {
      throw new Error('Failed to fetch tender data');
    }

    // Get company profile
    const { data: companyProfile, error: companyError } = await supabaseClient
      .from('company_profiles')
      .select('*')
      .eq('id', tender.company_profile_id)
      .single();

    if (companyError || !companyProfile) {
      throw new Error('Failed to fetch company profile');
    }

    // Update status to processing
    await supabaseClient
      .from('tenders')
      .update({
        status: 'processing',
        processing_stage: 'extracting_text',
        progress: 10,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    // STEP 1: Extract text from file
    let extractedText = '';
    const fileInfo = detectFileType(tender.original_filename);
    console.log(`File type: ${fileInfo.type}, needs OCR: ${fileInfo.needsOCR}`);

    if (fileInfo.needsOCR) {
      // PDF or scanned file - use Google Document AI OCR
      extractedText = await extractTextWithOCR(tender.file_url, supabaseClient);
    } else {
      // Text file - parse directly
      extractedText = await extractTextFromFile(tender.file_url, supabaseClient);
    }

    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the document');
    }

    console.log(`Extracted ${extractedText.length} characters of text`);

    // Update progress
    await supabaseClient
      .from('tenders')
      .update({
        processing_stage: 'segmenting_content',
        progress: 30,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    // STEP 2: Segment content
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const segmentedContent = await segmentContent(extractedText, openAIApiKey);
    console.log(`Segmented content: ${segmentedContent.context.length} context, ${segmentedContent.instructions.length} instructions, ${segmentedContent.questions.length} questions`);

    // STEP 3: Store questions in database
    const questionsForStorage = segmentedContent.questions.map(q => q.question_text);
    
    await supabaseClient
      .from('tenders')
      .update({
        parsed_data: { questions: questionsForStorage },
        extracted_context: segmentedContent.context,
        extracted_instructions: segmentedContent.instructions,
        extracted_questions: questionsForStorage,
        total_questions: segmentedContent.questions.length,
        processing_stage: 'generating_responses',
        progress: 50,
        file_type_detected: fileInfo.type,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    if (segmentedContent.questions.length === 0) {
      // Complete with no questions
      await supabaseClient
        .from('tenders')
        .update({
          status: 'completed',
          processing_stage: 'completed',
          progress: 100,
          error_message: 'No questions were found in the document. You can add questions manually.',
          last_activity_at: new Date().toISOString()
        })
        .eq('id', tenderId);

      return {
        success: true,
        tenderId,
        questionsFound: 0,
        status: 'completed',
        message: 'No questions found'
      };
    }

    // STEP 4: Generate responses for each question
    for (let i = 0; i < segmentedContent.questions.length; i++) {
      const question = segmentedContent.questions[i];
      console.log(`Generating response for question ${question.question_number}/${segmentedContent.questions.length}: ${question.question_text.substring(0, 50)}...`);

      const response = await generateResponse(
        question, 
        companyProfile, 
        segmentedContent.context, 
        segmentedContent.instructions, 
        openAIApiKey
      );

      // Save response to database
      await supabaseClient
        .from('tender_responses')
        .insert({
          tender_id: tenderId,
          company_profile_id: companyProfile.id,
          question: question.question_text,
          question_index: question.question_number - 1,
          ai_generated_answer: response,
          model_used: 'gpt-5-mini-2025-08-07',
          response_length: response.length,
          is_approved: false
        });

      // Update progress
      const progress = Math.min(95, 50 + Math.round(((i + 1) / segmentedContent.questions.length) * 45));
      await supabaseClient
        .from('tenders')
        .update({
          processed_questions: i + 1,
          progress: progress,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', tenderId);
    }

    // STEP 5: Mark as draft
    await supabaseClient
      .from('tenders')
      .update({
        status: 'draft',
        processing_stage: 'completed',
        progress: 100,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    // Return summary
    const questionPreviews = segmentedContent.questions.slice(0, 3).map(q => q.question_text);
    const hasContext = segmentedContent.context.length > 0;
    const hasInstructions = segmentedContent.instructions.length > 0;
    
    return {
      success: true,
      tenderId,
      questionsFound: segmentedContent.questions.length,
      questionPreviews: questionPreviews,
      hasContext,
      hasInstructions,
      status: 'draft',
      message: `Successfully processed ${segmentedContent.questions.length} questions${hasContext ? ' with context' : ''}${hasInstructions ? ' and instructions' : ''}`
    };

  } catch (error) {
    console.error('Error processing tender:', error);
    
    // Mark as failed
    await supabaseClient
      .from('tenders')
      .update({
        status: 'failed',
        processing_stage: 'failed',
        error_message: error.message,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    throw error;
  }
}

// ============= MAIN SERVE FUNCTION =============

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenderId }: ProcessTenderRequest = await req.json();

    if (!validateTenderId(tenderId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid tender ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Process the tender
    const result = await processTender(tenderId);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-tender function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});