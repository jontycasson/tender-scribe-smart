import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard JSON envelope - always returned
interface ProcessTenderResponse {
  success: boolean;
  tenderId: string | null;
  questionsFound: number;
  contextFound: number;
  instructionsFound: number;
  segments: {
    questions: any[];
    context: any[];
    instructions: any[];
  };
  rawText: string;
  status: string;
  message: string;
  error?: string;
}

interface ProcessTenderRequest {
  tenderId: string;
  filePath?: string;
  extractedText?: string;
}

// File extraction helper - routes by file type
async function extractText(filePath: string, mimeOrExt: string, supabaseClient: any): Promise<string> {
  console.log(`Extracting text from ${filePath}, type: ${mimeOrExt}`);
  
  try {
    // Download file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('tender-documents')
      .download(filePath);

    if (fileError || !fileData) {
      throw new Error(`Failed to download file: ${fileError?.message || 'No file data'}`);
    }

    const extension = filePath.toLowerCase().split('.').pop() || '';
    const mimeType = fileData.type || '';

    // Route by file type
    switch (extension) {
      case 'txt':
        return await extractTxtText(fileData);
      
      case 'docx':
        return await extractDocxText(fileData);
      
      case 'rtf':
        return await extractRtfText(fileData);
      
      case 'xlsx':
      case 'xls':
        return await extractXlsxText(fileData);
      
      case 'pdf':
        return await extractPdfText(fileData); // Stub for now
      
      default:
        // Try as plain text fallback
        console.log(`Unknown file type ${extension}, trying as plain text`);
        return await extractTxtText(fileData);
    }
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    throw error;
  }
}

// TXT text extraction
async function extractTxtText(fileData: Blob): Promise<string> {
  const text = await fileData.text();
  return text.trim();
}

// DOCX text extraction using mammoth-like approach
async function extractDocxText(fileData: Blob): Promise<string> {
  try {
    // DOCX files are ZIP archives containing XML
    // For now, we'll use a simple approach to extract basic text
    // This is a placeholder - full DOCX parsing is complex
    
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Look for text content in the DOCX structure
    // This is a very basic approach - real DOCX parsing would need a proper library
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(uint8Array);
    
    // Extract readable text using regex (basic approach)
    const textMatches = content.match(/[\w\s\.,;:!?\-'"()]+/g);
    if (textMatches) {
      text = textMatches
        .filter(match => match.length > 3)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    if (text.length < 50) {
      throw new Error('Unable to extract meaningful text from DOCX file');
    }
    
    return text;
  } catch (error) {
    console.error('DOCX extraction failed:', error);
    throw new Error('DOCX file parsing failed - consider converting to TXT');
  }
}

// RTF text extraction - strip control words
async function extractRtfText(fileData: Blob): Promise<string> {
  const text = await fileData.text();
  
  // Basic RTF parsing - remove control words and formatting
  let cleaned = text
    // Remove RTF header
    .replace(/^{\s*\\rtf\d+[^}]*}/, '')
    // Remove control words (\keyword)
    .replace(/\\[a-z]+\d*/g, '')
    // Remove control symbols
    .replace(/\\[^a-z\s]/g, '')
    // Remove braces
    .replace(/[{}]/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

// XLSX text extraction - flatten to CSV-like text
async function extractXlsxText(fileData: Blob): Promise<string> {
  try {
    // XLSX files are ZIP archives with XML sheets
    // This is a placeholder for proper XLSX parsing
    // Real implementation would need xlsx library
    
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try to extract text content
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(uint8Array);
    
    // Look for sheet data and extract text
    const textMatches = content.match(/[\w\s\.,;:!?\-'"()]+/g);
    if (textMatches) {
      const text = textMatches
        .filter(match => match.length > 2)
        .join(', ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length > 20) {
        return text;
      }
    }
    
    throw new Error('Unable to extract text from XLSX file');
  } catch (error) {
    console.error('XLSX extraction failed:', error);
    throw new Error('XLSX file parsing failed - consider converting to CSV or TXT');
  }
}

// PDF text extraction - placeholder for Google Document AI OCR
async function extractPdfText(fileData: Blob): Promise<string> {
  // TODO: Implement Google Document AI OCR integration
  console.log('PDF OCR extraction not yet implemented');
  throw new Error('PDF processing requires OCR - feature coming soon');
}

// Text segmentation function
async function segmentContent(rawText: string): Promise<{
  questions: any[];
  context: any[];
  instructions: any[];
}> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('OpenAI API key not configured, using regex-only segmentation');
    return regexOnlySegmentation(rawText);
  }

  try {
    // Step 1: Extract obvious questions using regex patterns
    const obviousQuestions = extractObviousQuestions(rawText);
    console.log(`Found ${obviousQuestions.length} obvious questions via regex`);

    // Step 2: Split text into overlapping chunks for AI processing
    const chunks = splitTextIntoChunks(rawText, 2000, 200);
    console.log(`Split text into ${chunks.length} chunks for AI processing`);

    // Step 3: Process each chunk with OpenAI
    const allSegments = {
      questions: [...obviousQuestions],
      context: [],
      instructions: []
    };

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        const chunkSegments = await classifyChunkWithAI(chunks[i], openAIApiKey);
        
        // Merge results
        allSegments.questions.push(...chunkSegments.questions);
        allSegments.context.push(...chunkSegments.context);
        allSegments.instructions.push(...chunkSegments.instructions);
        
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        // Continue with other chunks
      }
    }

    // Step 4: Deduplicate questions
    allSegments.questions = deduplicateQuestions(allSegments.questions);
    
    console.log(`Final segmentation: ${allSegments.questions.length} questions, ${allSegments.context.length} context items, ${allSegments.instructions.length} instructions`);
    
    return allSegments;

  } catch (error) {
    console.error('AI segmentation failed, falling back to regex-only:', error);
    return regexOnlySegmentation(rawText);
  }
}

// Extract obvious questions using regex patterns
function extractObviousQuestions(text: string): any[] {
  const questions = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let questionNumber = 1;

  for (const line of lines) {
    if (line.length < 10) continue; // Skip very short lines
    
    const cleanLine = line.replace(/^[\d\.\)\-\*\•\s]+/, '').trim();
    if (cleanLine.length < 10) continue;
    
    // Regex patterns for obvious questions
    const isDirectQuestion = cleanLine.endsWith('?');
    const isNumberedQuestion = /^(question\s*\d+|q\d+|q\.\d+)/i.test(line);
    const isImperative = /^(describe|provide|explain|tell|list|outline|detail|specify|identify|confirm|state|indicate|demonstrate|show|what|when|where|why|how|which|do you|can you|will you|have you|are you)/i.test(cleanLine);
    const isBulletQuestion = /^[\*\•\-]\s*(what|when|where|why|how|which|describe|provide|explain|tell|list|do you|can you)/i.test(line);
    
    if (isDirectQuestion || isNumberedQuestion || isImperative || isBulletQuestion) {
      questions.push({
        question_number: questionNumber++,
        question_text: cleanLine,
        source: 'regex',
        confidence: isDirectQuestion ? 0.9 : 0.7
      });
    }
  }

  return questions;
}

// Split text into overlapping chunks
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    
    if (end >= text.length) break;
    start = end - overlap; // Overlap for context continuity
  }
  
  return chunks;
}

// Classify a text chunk using OpenAI JSON mode
async function classifyChunkWithAI(chunk: string, apiKey: string): Promise<{
  questions: any[];
  context: any[];
  instructions: any[];
}> {
  const systemPrompt = `You are a document analyzer that classifies text paragraphs into categories.

CLASSIFICATION RULES:
- QUESTION: Any text that asks for information, requests data, or requires a vendor response
- CONTEXT: Background information, company details, project scope, objectives
- INSTRUCTION: Formatting rules, submission requirements, evaluation criteria, compliance rules
- OTHER: Headers, footers, navigation, irrelevant content (ignore these)

CRITICAL REQUIREMENTS:
- Extract text EXACTLY as written - no paraphrasing
- If no items exist for a category, return empty array
- Be conservative - only classify clear matches
- Focus on substance, not format

Return JSON format:
{
  "questions": [{"text": "exact question text", "confidence": 0.8}],
  "context": [{"text": "exact context text", "confidence": 0.8}],
  "instructions": [{"text": "exact instruction text", "confidence": 0.8}]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Classify this text:\n\n${chunk}` }
      ],
      max_completion_tokens: 1500,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }

  const result = JSON.parse(content);
  
  // Normalize and add question numbers
  const questions = (result.questions || []).map((q: any, index: number) => ({
    question_number: index + 1,
    question_text: typeof q === 'string' ? q : q.text,
    source: 'ai',
    confidence: typeof q === 'object' ? q.confidence : 0.8
  }));

  return {
    questions,
    context: result.context || [],
    instructions: result.instructions || []
  };
}

// Deduplicate questions based on similarity
function deduplicateQuestions(questions: any[]): any[] {
  const deduplicated = [];
  const seen = new Set();
  
  for (const question of questions) {
    const text = question.question_text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const key = text.substring(0, 50); // Use first 50 chars as similarity key
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(question);
    }
  }
  
  // Renumber questions
  return deduplicated.map((q, index) => ({
    ...q,
    question_number: index + 1
  }));
}

// Fallback regex-only segmentation
function regexOnlySegmentation(text: string): {
  questions: any[];
  context: any[];
  instructions: any[];
} {
  const questions = extractObviousQuestions(text);
  
  // Basic heuristics for context and instructions
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 20);
  const context = [];
  const instructions = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Instruction patterns
    if (lowerLine.includes('submit') || lowerLine.includes('format') || 
        lowerLine.includes('requirement') || lowerLine.includes('must') ||
        lowerLine.includes('should') || lowerLine.includes('criteria')) {
      instructions.push({ text: line, source: 'regex' });
    }
    // Context patterns (but not questions)
    else if (!line.endsWith('?') && 
             (lowerLine.includes('background') || lowerLine.includes('objective') ||
              lowerLine.includes('scope') || lowerLine.includes('about'))) {
      context.push({ text: line, source: 'regex' });
    }
  }
  
  return { questions, context, instructions };
}

// Main processing function
async function processTenderV2(request: ProcessTenderRequest): Promise<ProcessTenderResponse> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const response: ProcessTenderResponse = {
    success: false,
    tenderId: request.tenderId,
    questionsFound: 0,
    contextFound: 0,
    instructionsFound: 0,
    segments: {
      questions: [],
      context: [],
      instructions: []
    },
    rawText: '',
    status: 'error',
    message: '',
    error: undefined
  };

  try {
    console.log(`Processing tender v2: ${request.tenderId}`);

    // Validate tender exists
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', request.tenderId)
      .single();

    if (tenderError || !tender) {
      response.error = 'Tender not found';
      response.message = 'Failed to fetch tender data';
      return response;
    }

    // Extract text - prioritize extractedText if provided
    let rawText = '';
    
    if (request.extractedText && request.extractedText.trim().length >= 50) {
      console.log('Using provided extracted text');
      rawText = request.extractedText.trim();
    } else if (request.filePath) {
      console.log(`Extracting text from file: ${request.filePath}`);
      try {
        const extension = request.filePath.toLowerCase().split('.').pop() || '';
        rawText = await extractText(request.filePath, extension, supabaseClient);
      } catch (extractError) {
        console.error('File extraction failed:', extractError);
        response.error = extractError.message;
        response.message = 'Failed to extract text from file';
        return response;
      }
    } else {
      response.error = 'No text source provided';
      response.message = 'Either extractedText or filePath must be provided';
      return response;
    }

    // Check minimum text length
    if (rawText.length < 50) {
      response.error = 'Insufficient text content';
      response.message = 'No readable text found - document must contain at least 50 characters';
      return response;
    }

    // Segment the extracted text
    console.log('Starting text segmentation...');
    const segments = await segmentContent(rawText);
    
    // Update response with segmentation results
    response.success = true;
    response.rawText = rawText;
    response.segments = segments;
    response.questionsFound = segments.questions.length;
    response.contextFound = segments.context.length;
    response.instructionsFound = segments.instructions.length;
    response.status = 'segmented';
    response.message = `Successfully processed ${rawText.length} characters: ${segments.questions.length} questions, ${segments.context.length} context items, ${segments.instructions.length} instructions`;

    console.log(`Successfully processed tender ${request.tenderId}: ${segments.questions.length} questions found`);
    
    return response;

  } catch (error) {
    console.error('Error processing tender v2:', error);
    response.error = error.message;
    response.message = 'Unexpected error during processing';
    return response;
  }
}

// HTTP server
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed',
          message: 'Only POST requests are supported'
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestBody = await req.json();
    console.log('Received request:', requestBody);

    // Validate required fields
    if (!requestBody.tenderId) {
      return new Response(
        JSON.stringify({
          success: false,
          tenderId: null,
          questionsFound: 0,
          contextFound: 0,
          instructionsFound: 0,
          segments: { questions: [], context: [], instructions: [] },
          rawText: '',
          status: 'error',
          message: 'tenderId is required',
          error: 'Missing required field: tenderId'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process the tender
    const result = await processTenderV2(requestBody);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Server error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        tenderId: null,
        questionsFound: 0,
        contextFound: 0,
        instructionsFound: 0,
        segments: { questions: [], context: [], instructions: [] },
        rawText: '',
        status: 'error',
        message: 'Server error occurred',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});