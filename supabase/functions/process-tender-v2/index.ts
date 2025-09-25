import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getErrorMessage, asError } from "../_shared/errors.ts";

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
  answers?: any[]; // Add answers array for frontend debugging
  enrichment?: {
    companyProfile: any;
    retrievedSnippets: any[];
    documentContext: any[];
    instructions: any[];
  };
}

interface ProcessTenderRequest {
  tenderId: string;
  filePath?: string;
  extractedText?: string;
}

// File extraction helper - routes by file type with comprehensive error handling
async function extractText(filePath: string, mimeOrExt: string, supabaseClient: any): Promise<string> {
  console.log(`[DIAGNOSTIC] Extracting text from ${filePath}, type: ${mimeOrExt}`);
  
  try {
    // Download file from storage
    console.log(`[DIAGNOSTIC] Downloading file from storage...`);
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('tender-documents')
      .download(filePath);

    if (fileError || !fileData) {
      const errorMsg = `Failed to download file: ${fileError?.message || 'No file data'}`;
      console.error(`[DIAGNOSTIC] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const extension = filePath.toLowerCase().split('.').pop() || '';
    const mimeType = fileData.type || '';
    const fileSize = fileData.size || 0;
    
    console.log(`[DIAGNOSTIC] File details - Extension: ${extension}, MIME: ${mimeType}, Size: ${fileSize} bytes`);

    // Route by file type with detailed logging
    let extractedText = '';
    switch (extension) {
      case 'txt':
        console.log(`[DIAGNOSTIC] Processing TXT file...`);
        extractedText = await extractTxtText(fileData);
        break;
      
      case 'docx':
        console.log(`[DIAGNOSTIC] Processing DOCX file...`);
        extractedText = await extractDocxText(fileData);
        break;
      
      case 'rtf':
        console.log(`[DIAGNOSTIC] Processing RTF file...`);
        extractedText = await extractRtfText(fileData);
        break;
      
      case 'xlsx':
      case 'xls':
        console.log(`[DIAGNOSTIC] Processing XLSX file...`);
        extractedText = await extractXlsxText(fileData);
        break;
      
      case 'pdf':
        console.log(`[DIAGNOSTIC] Processing PDF file (OCR stub)...`);
        extractedText = await extractPdfText(fileData);
        break;
      
      default:
        console.log(`[DIAGNOSTIC] Unknown file type ${extension}, trying as plain text`);
        extractedText = await extractTxtText(fileData);
    }
    
    console.log(`[DIAGNOSTIC] Text extraction complete - Length: ${extractedText.length} characters`);
    return extractedText;
    
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const errorMsg = `Text extraction failed for ${filePath}: ${errorMessage}`;
    console.error(`[DIAGNOSTIC] ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

// TXT text extraction with error handling
async function extractTxtText(fileData: Blob): Promise<string> {
  try {
    const text = await fileData.text();
    const cleanText = text.trim();
    console.log(`[DIAGNOSTIC] TXT extraction successful - ${cleanText.length} characters`);
    return cleanText;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`TXT file reading failed: ${errorMessage}`);
    }
}

// DOCX text extraction with improved error handling
async function extractDocxText(fileData: Blob): Promise<string> {
  try {
    console.log(`[DIAGNOSTIC] Attempting DOCX text extraction...`);
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Basic DOCX content extraction (simplified approach)
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(uint8Array);
    
    // Extract readable text using regex patterns
    const textMatches = content.match(/[\w\s\.,;:!?\-'"()]{10,}/g);
    if (textMatches) {
      const text = textMatches
        .filter(match => match.length > 10)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length >= 50) {
        console.log(`[DIAGNOSTIC] DOCX extraction successful - ${text.length} characters`);
        return text;
      }
    }
    
    throw new Error('Unable to extract sufficient text from DOCX file');
    
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const errorMsg = `DOCX extraction failed: ${errorMessage}`;
    console.error(`[DIAGNOSTIC] ${errorMsg}`);
    throw new Error('DOCX file parsing failed - please convert to TXT format for better results');
  }
}

// RTF text extraction with error handling
async function extractRtfText(fileData: Blob): Promise<string> {
  try {
    const text = await fileData.text();
    
    // Basic RTF parsing - remove control words and formatting
    let cleaned = text
      .replace(/^{\s*\\rtf\d+[^}]*}/, '') // Remove RTF header
      .replace(/\\[a-z]+\d*/g, '') // Remove control words
      .replace(/\\[^a-z\s]/g, '') // Remove control symbols
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\s+/g, ' ') // Clean up whitespace
      .trim();
    
    if (cleaned.length < 20) {
      throw new Error('Insufficient text content extracted from RTF');
    }
    
    console.log(`[DIAGNOSTIC] RTF extraction successful - ${cleaned.length} characters`);
    return cleaned;
    
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`RTF extraction failed: ${errorMessage}`);
    }
}

// XLSX text extraction with improved error handling
async function extractXlsxText(fileData: Blob): Promise<string> {
  try {
    console.log(`[DIAGNOSTIC] Attempting XLSX text extraction...`);
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Basic XLSX content extraction (looking for readable text)
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(uint8Array);
    
    // Look for cell content and questions
    const textMatches = content.match(/[\w\s\.,;:!?\-'"()]{5,}/g);
    if (textMatches) {
      const text = textMatches
        .filter(match => match.length > 5)
        .filter(match => !/^[\d\s\.,]+$/.test(match)) // Filter out pure numbers
        .join(', ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length >= 30) {
        console.log(`[DIAGNOSTIC] XLSX extraction successful - ${text.length} characters`);
        return text;
      }
    }
    
    throw new Error('Unable to extract meaningful text from XLSX');
    
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const errorMsg = `XLSX extraction failed: ${errorMessage}`;
    console.error(`[DIAGNOSTIC] ${errorMsg}`);
    throw new Error('XLSX file parsing failed - please convert to CSV or TXT format');
  }
}

// PDF text extraction - OCR stub with proper error handling
async function extractPdfText(fileData: Blob): Promise<string> {
  try {
    console.log(`[DIAGNOSTIC] PDF OCR processing requested`);
    
    // Check if Google Document AI is configured
    const serviceAccountJson = Deno.env.get('GOOGLE_DOCAI_SERVICE_ACCOUNT_JSON');
    const processorId = Deno.env.get('GOOGLE_DOCAI_PROCESSOR_ID');
    
    if (!serviceAccountJson || !processorId) {
      console.log(`[DIAGNOSTIC] Google Document AI not configured`);
      throw new Error('PDF processing requires Google Document AI configuration - please contact support');
    }
    
    // For now, return a stub message indicating OCR would happen here
    const stubText = "This PDF would be processed using Google Document AI OCR. Integration pending.";
    console.log(`[DIAGNOSTIC] PDF stub processing - returning placeholder text`);
    return stubText;
    
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`PDF processing failed: ${errorMessage}`);
    }
}

// Text segmentation function with improved error handling and rule-based classification
async function segmentContent(rawText: string): Promise<{
  questions: any[];
  context: any[];
  instructions: any[];
}> {
  console.log(`[DIAGNOSTIC] Starting segmentation - ${rawText.length} chars to analyze`);
  
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('OpenAI API key not configured, using regex-only segmentation');
    return enhancedRegexSegmentation(rawText);
  }

  // Initialize results container with proper typing
  const allSegments: {
    questions: any[];
    context: any[];
    instructions: any[];
  } = {
    questions: [],
    context: [],
    instructions: []
  };

  try {
    // Step 1: Extract obvious questions using regex patterns
    const obviousQuestions = extractObviousQuestions(rawText);
    console.log(`Found ${obviousQuestions.length} obvious questions via regex`);
    allSegments.questions.push(...obviousQuestions);

    // Step 2: Rule-based classification for context and instructions BEFORE AI processing
    const ruleBasedResults = classifyByRules(rawText);
    console.log(`Rule-based classification found: ${ruleBasedResults.context.length} context, ${ruleBasedResults.instructions.length} instructions`);
    allSegments.context.push(...ruleBasedResults.context);
    allSegments.instructions.push(...ruleBasedResults.instructions);

    // Step 3: Split remaining text into chunks for AI processing
    const chunks = splitTextIntoChunks(rawText, 2500, 500);
    console.log(`Split text into ${chunks.length} chunks for AI processing`);

    // Step 4: Process each chunk with AI (with resilient error handling)
    let successfulChunks = 0;
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        const chunkSegments = await classifyChunkWithAI(chunks[i], openAIApiKey);
        
        // Merge results if classification succeeded
        if (chunkSegments) {
          allSegments.questions.push(...(chunkSegments.questions || []));
          allSegments.context.push(...(chunkSegments.context || []));
          allSegments.instructions.push(...(chunkSegments.instructions || []));
          successfulChunks++;
        }
        
      } catch (chunkError) {
        const errorMsg = chunkError instanceof Error ? chunkError.message : 'Unknown error';
        console.error(`Error processing chunk ${i + 1}:`, errorMsg);
        failedChunks++;
        // Continue with other chunks - don't fail entire segmentation
      }
    }

    console.log(`Chunk processing complete: ${successfulChunks} successful, ${failedChunks} failed`);

    // Step 5: Deduplicate and clean up results
    const rawQuestionCount = allSegments.questions.length;
    allSegments.questions = deduplicateQuestions(allSegments.questions);
    allSegments.context = deduplicateTextItems(allSegments.context);
    allSegments.instructions = deduplicateTextItems(allSegments.instructions);
    
    console.log(`Final segmentation: ${allSegments.questions.length} questions (from ${rawQuestionCount} raw), ${allSegments.context.length} context items, ${allSegments.instructions.length} instructions`);
    
    return allSegments;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI segmentation failed, falling back to enhanced regex-only:', errorMsg);
    
    // Fallback: use enhanced regex-only approach but keep any partial AI results
    try {
      const regexResults = enhancedRegexSegmentation(rawText);
      
      // Merge with any partial AI results (avoid duplicates)
      allSegments.questions.push(...regexResults.questions);
      allSegments.context.push(...regexResults.context);
      allSegments.instructions.push(...regexResults.instructions);
      
      // Deduplicate merged results
      allSegments.questions = deduplicateQuestions(allSegments.questions);
      allSegments.context = deduplicateTextItems(allSegments.context);
      allSegments.instructions = deduplicateTextItems(allSegments.instructions);
      
      console.log(`Fallback segmentation: ${allSegments.questions.length} questions, ${allSegments.context.length} context items, ${allSegments.instructions.length} instructions`);
      
      return allSegments;
      
    } catch (fallbackError) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
      console.error('Even enhanced regex fallback failed:', fallbackMsg);
      
      // Final fallback - return whatever we have
      return {
        questions: [],
        context: [{ text: rawText.substring(0, 1000) + '...', source: 'fallback' }],
        instructions: []
      };
    }
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

// Split text into overlapping chunks with better size and overlap
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
  
  console.log(`Created ${chunks.length} chunks: avg size ${Math.round(text.length / chunks.length)}, overlap ${overlap}`);
  return chunks;
}

// Classify a text chunk using OpenAI JSON mode with improved error handling
async function classifyChunkWithAI(chunk: string, apiKey: string): Promise<{
  questions: any[];
  context: any[];
  instructions: any[];
} | null> {
  const systemPrompt = `You are a document analyzer that classifies text paragraphs into categories.

CLASSIFICATION RULES:
- QUESTION: Any text that asks for information, requests data, or requires a vendor response
- CONTEXT: Background information, company details, project scope, objectives, technical specifications
- INSTRUCTION: Formatting rules, submission requirements, evaluation criteria, compliance rules
- OTHER: Headers, footers, navigation, irrelevant content (ignore these)

CRITICAL REQUIREMENTS:
- Extract text EXACTLY as written - no paraphrasing
- If no items exist for a category, return empty array
- Be conservative - only classify clear matches
- Focus on substance, not format
- Context should include project background, technical requirements, scope details

Return JSON format:
{
  "questions": [{"text": "exact question text", "confidence": 0.8}],
  "context": [{"text": "exact context text", "confidence": 0.8}], 
  "instructions": [{"text": "exact instruction text", "confidence": 0.8}]
}`;

  try {
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
          { role: 'user', content: `Classify this text chunk:\n\n${chunk}` }
        ],
        max_completion_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('No content returned from OpenAI');
      return null;
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return null;
    }
    
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
    
  } catch (error) {
    console.error('Error in OpenAI chunk classification:', error);
    return null;
  }
}

// Normalize and deduplicate questions based on similarity
function deduplicateQuestions(questions: any[]): any[] {
  const deduplicated = [];
  const seen = new Set();
  
  console.log(`Starting deduplication with ${questions.length} raw questions`);
  
  for (const question of questions) {
    let questionText = question.question_text || '';
    
    // Step 1: Clean and normalize the text
    let cleanText = questionText
      .trim()
      .replace(/\s+/g, ' '); // Collapse multiple spaces
    
    // Step 2: Strip leading numeric or bullet labels 
    // Remove patterns like "1.", "Q2:", "##", "2)", "Question 1:", "(a)", "a)", etc.
    cleanText = cleanText
      .replace(/^(\d+[\.\)\-]?\s+)/i, '') // "1.", "2)", "3-", etc. (require space after)
      .replace(/^(q\d*[\.\:\)\-]?\s+)/i, '') // "Q1:", "Q.", "Q2)", etc. (require space after)
      .replace(/^(question\s*\d*[\.\:\)\-]?\s+)/i, '') // "Question 1:", "Question:", etc. (require space after)
      .replace(/^([\#\*\•\-\+\>\◦]\s+)/g, '') // Bullets: "#", "*", "•", "-", "+", ">", "◦" (require space after)
      .replace(/^(\([a-zA-Z0-9]+\)\s*)/i, '') // "(a)", "(1)", "(i)", etc.
      .replace(/^([a-zA-Z][\.\)]\s+)/i, '') // "a.", "b)", "A.", etc. (only with punctuation + space)
      .trim();
    
    // Skip if text becomes too short after cleaning
    if (cleanText.length < 10) {
      console.log(`Skipping short question after cleanup: "${questionText}" -> "${cleanText}"`);
      continue;
    }
    
    // Step 3: Create deduplication key (lowercase, no punctuation)
    const dedupeKey = cleanText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Remove all punctuation
      .replace(/\s+/g, ' ') // Normalize spaces again
      .trim();
    
    // Skip if deduplication key is too short
    if (dedupeKey.length < 10) {
      console.log(`Skipping question with short deduplication key: "${cleanText}"`);
      continue;
    }
    
    // Step 4: Check for duplicates using the key
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      
      // Store the cleaned version as the question text
      deduplicated.push({
        ...question,
        question_text: cleanText,
        original_text: questionText, // Preserve original for debugging
        dedupe_key: dedupeKey // For debugging
      });
    } else {
      console.log(`Duplicate detected: "${cleanText}" (key: "${dedupeKey}")`);
    }
  }
  
  // Step 5: Re-index questions sequentially starting at 1
  const reindexed = deduplicated.map((q, index) => ({
    ...q,
    question_number: index + 1
  }));
  
  console.log(`✅ Unique questions detected: ${reindexed.length} after deduplication (from original ${questions.length})`);
  
  // Log the final question list for debugging
  reindexed.forEach((q, idx) => {
    console.log(`Q${idx + 1}: "${q.question_text}"`);
  });
  
  return reindexed;
}

// Rule-based classification for context and instructions based on section headers
function classifyByRules(text: string): {
  context: any[];
  instructions: any[];
} {
  const context = [];
  const instructions = [];
  
  // Split text into paragraphs and sections
  const sections = splitIntoSections(text);
  
  for (const section of sections) {
    const header = section.header.toLowerCase();
    const content = section.content;
    
    // Skip if content is too short or is likely a question
    if (content.length < 50 || content.endsWith('?')) continue;
    
    // INSTRUCTION patterns - based on section headers
    if (header.includes('requirement') || header.includes('submission') || 
        header.includes('terms') || header.includes('proposal') ||
        header.includes('format') || header.includes('deadline') ||
        header.includes('evaluation') || header.includes('criteria') ||
        header.includes('compliance') || header.includes('mandatory') ||
        header.includes('must') || header.includes('should')) {
      instructions.push({ 
        text: content, 
        source: 'rule-based', 
        section_header: section.header,
        confidence: 0.9 
      });
    }
    // CONTEXT patterns - based on section headers  
    else if (header.includes('introduction') || header.includes('background') || 
             header.includes('objectives') || header.includes('scope') ||
             header.includes('overview') || header.includes('purpose') ||
             header.includes('about') || header.includes('project') ||
             header.includes('technical') || header.includes('specification')) {
      context.push({ 
        text: content, 
        source: 'rule-based', 
        section_header: section.header,
        confidence: 0.9 
      });
    }
  }
  
  return { context, instructions };
}

// Split text into sections based on headers
function splitIntoSections(text: string): Array<{ header: string; content: string }> {
  const sections = [];
  const lines = text.split('\n');
  
  let currentHeader = '';
  let currentContent = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    
    // Detect section headers - various patterns
    const isHeader = (
      // Numbered headers: "1. Introduction", "2.1 Background"
      /^\d+(\.\d+)*\s+[A-Z]/.test(trimmed) ||
      // All caps headers: "INTRODUCTION", "BACKGROUND INFORMATION"
      /^[A-Z\s]{5,}$/.test(trimmed) ||
      // Title case headers followed by colon: "Project Background:"
      /^[A-Z][a-z\s]+:$/.test(trimmed) ||
      // Headers with special formatting: "=== REQUIREMENTS ==="
      /^[=\-]{3,}/.test(trimmed) ||
      // Bold-style headers (assume single line, title case, no punctuation at end)
      (/^[A-Z][a-zA-Z\s]{10,}$/.test(trimmed) && !trimmed.endsWith('.') && !trimmed.endsWith('?'))
    );
    
    if (isHeader) {
      // Save previous section if it has content
      if (currentHeader && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content.length > 50) {
          sections.push({
            header: currentHeader,
            content: content
          });
        }
      }
      
      // Start new section
      currentHeader = trimmed;
      currentContent = [];
    } else {
      // Add to current section content
      currentContent.push(trimmed);
    }
  }
  
  // Don't forget the last section
  if (currentHeader && currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content.length > 50) {
      sections.push({
        header: currentHeader,
        content: content
      });
    }
  }
  
  console.log(`Detected ${sections.length} sections with headers`);
  return sections;
}

// Enhanced regex-only segmentation with better heuristics
function enhancedRegexSegmentation(text: string): {
  questions: any[];
  context: any[];
  instructions: any[];
} {
  const questions = extractObviousQuestions(text);
  
  // Use rule-based classification first
  const ruleBasedResults = classifyByRules(text);
  
  // Additional heuristics for remaining content
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 30);
  const additionalContext = [];
  const additionalInstructions = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Skip if already classified by rules or is a question
    const alreadyClassified = 
      ruleBasedResults.context.some(c => c.text.includes(line.substring(0, 50))) ||
      ruleBasedResults.instructions.some(i => i.text.includes(line.substring(0, 50))) ||
      line.endsWith('?');
      
    if (alreadyClassified) continue;
    
    // Additional instruction patterns
    if (lowerLine.includes('submit') || lowerLine.includes('provide') || 
        lowerLine.includes('include') || lowerLine.includes('attach') ||
        lowerLine.includes('complete') || lowerLine.includes('demonstrate') ||
        lowerLine.includes('ensure') || lowerLine.includes('comply')) {
      additionalInstructions.push({ text: line, source: 'enhanced-regex', confidence: 0.6 });
    }
    // Additional context patterns
    else if (lowerLine.includes('company') || lowerLine.includes('organization') ||
             lowerLine.includes('industry') || lowerLine.includes('experience') ||
             lowerLine.includes('established') || lowerLine.includes('specializes')) {
      additionalContext.push({ text: line, source: 'enhanced-regex', confidence: 0.6 });
    }
  }
  
  // Combine results
  const allContext = [...ruleBasedResults.context, ...additionalContext];
  const allInstructions = [...ruleBasedResults.instructions, ...additionalInstructions];
  
  return { 
    questions, 
    context: allContext, 
    instructions: allInstructions 
  };
}

// Deduplicate text items based on content similarity
function deduplicateTextItems(items: any[]): any[] {
  if (!items || items.length === 0) return [];
  
  const deduplicated = [];
  const seen = new Set();
  
  for (const item of items) {
    const text = item.text || '';
    if (text.length < 20) continue;
    
    // Create a normalized key for deduplication
    const key = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Use first 100 chars for comparison
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(item);
    }
  }
  
  console.log(`Deduplicated text items: ${items.length} -> ${deduplicated.length}`);
  return deduplicated;
}

// Fetch company profile with fallback values
async function fetchCompanyProfile(companyProfileId: string, supabaseClient: any): Promise<any> {
  console.log(`Fetching company profile: ${companyProfileId}`);
  
  try {
    const { data: profile, error } = await supabaseClient
      .from('company_profiles')
      .select('*')
      .eq('id', companyProfileId)
      .single();

    if (error || !profile) {
      console.log('Company profile not found, using N/A placeholders');
      return {
        company_name: 'N/A',
        industry: 'N/A',
        team_size: 'N/A',
        services_offered: ['N/A'],
        specializations: 'N/A',
        mission: 'N/A',
        values: 'N/A',
        policies: 'N/A',
        past_projects: 'N/A',
        accreditations: 'N/A',
        years_in_business: 'N/A'
      };
    }

    // Ensure all expected fields exist with fallbacks
    return {
      company_name: profile.company_name || 'N/A',
      industry: profile.industry || 'N/A',
      team_size: profile.team_size || 'N/A',
      services_offered: profile.services_offered && profile.services_offered.length > 0 ? profile.services_offered : ['N/A'],
      specializations: profile.specializations || 'N/A',
      mission: profile.mission || 'N/A',
      values: profile.values || 'N/A',
      policies: profile.policies || 'N/A',
      past_projects: profile.past_projects || 'N/A',
      accreditations: profile.accreditations || 'N/A',
      years_in_business: profile.years_in_business || 'N/A',
      id: profile.id
    };

  } catch (error) {
    console.error('Error fetching company profile:', error);
    return {
      company_name: 'N/A',
      industry: 'N/A',
      team_size: 'N/A',
      services_offered: ['N/A'],
      specializations: 'N/A',
      mission: 'N/A',
      values: 'N/A',
      policies: 'N/A',
      past_projects: 'N/A',
      accreditations: 'N/A',
      years_in_business: 'N/A'
    };
  }
}

// Perform vector search for questions using qa_memory
async function performVectorSearch(questions: any[], companyProfileId: string, supabaseClient: any): Promise<any[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.log('OpenAI API key not available for vector search');
    return [];
  }

  const allSnippets = [];
  
  for (const question of questions.slice(0, 10)) { // Limit to first 10 questions for performance
    try {
      console.log(`Performing vector search for question ${question.question_number}`);
      
      // Generate embedding for the question
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: question.question_text
        }),
      });

      if (!embeddingResponse.ok) {
        console.error(`Embedding generation failed for question ${question.question_number}`);
        continue;
      }

      const embeddingData = await embeddingResponse.json();
      const questionEmbedding = embeddingData.data[0].embedding;

      // Search for similar questions in qa_memory
      const { data: matches, error: searchError } = await supabaseClient
        .rpc('match_qa_memory', {
          query_embedding: questionEmbedding,
          company_id: companyProfileId,
          match_threshold: 0.7,
          match_count: 5
        });

      if (searchError) {
        console.error(`Vector search error for question ${question.question_number}:`, searchError);
        continue;
      }

      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} similar snippets for question ${question.question_number}`);
        
        const questionSnippets = matches.map((match: any) => ({
          question_number: question.question_number,
          original_question: question.question_text,
          similar_question: match.question,
          answer: match.answer,
          similarity: match.similarity,
          confidence_score: match.confidence_score,
          usage_count: match.usage_count
        }));
        
        allSnippets.push(...questionSnippets);
      }

    } catch (error) {
      console.error(`Error in vector search for question ${question.question_number}:`, error);
      continue;
    }
  }

  console.log(`Vector search completed. Found ${allSnippets.length} total snippets`);
  return allSnippets;
}

// Generate answers for questions using OpenAI with improved context handling
async function generateAnswersForBatch(
  questionBatch: any[],
  enrichment: any,
  openAIApiKey: string
): Promise<any[]> {
  const systemPrompt = `Use the following company profile context when answering. Personalise each response to reflect this company. If profile fields are missing, use "N/A" but do not hallucinate.

You are an expert tender response writer specializing in UK government and corporate procurement. Generate professional, compliant responses in UK English.

RESPONSE REQUIREMENTS:
- Use UK English spelling and terminology throughout
- Be concise: short answers for closed questions, 1-2 paragraphs for open questions
- No padding or filler content
- Professional, formal tone appropriate for UK procurement
- Be specific and factual based on provided company information
- Always reference company-specific details where relevant (services, industry, experience, etc.)

COMPLIANCE RULES:
- Follow all MANDATORY COMPLIANCE requirements exactly
- Address evaluation criteria mentioned in instructions
- Use company-specific information where available
- If information is unavailable, state this clearly rather than making assumptions

Return JSON format:
{
  "answers": [
    {
      "question": "exact question text from input",
      "answer": "professional UK English response"
    }
  ]
}`;

  const questions = questionBatch.map(q => `Q${q.question_number}: ${q.question_text}`).join('\n\n');
  
  let userPrompt = `COMPANY PROFILE:
Company Name: ${enrichment.companyProfile.company_name}
Industry: ${enrichment.companyProfile.industry}
Team Size: ${enrichment.companyProfile.team_size}
Services Offered: ${Array.isArray(enrichment.companyProfile.services_offered) ? enrichment.companyProfile.services_offered.join(', ') : enrichment.companyProfile.services_offered}
Specialisations: ${enrichment.companyProfile.specializations}
Mission: ${enrichment.companyProfile.mission}
Values: ${enrichment.companyProfile.values}
Past Projects: ${enrichment.companyProfile.past_projects}
Years in Business: ${enrichment.companyProfile.years_in_business}`;

  if (enrichment.companyProfile.accreditations && enrichment.companyProfile.accreditations !== 'N/A') {
    userPrompt += `\nAccreditations: ${enrichment.companyProfile.accreditations}`;
  }
  if (enrichment.companyProfile.policies && enrichment.companyProfile.policies !== 'N/A') {
    userPrompt += `\nPolicies: ${enrichment.companyProfile.policies}`;
  }

  // Add retrieved snippets if available
  if (enrichment.retrievedSnippets && enrichment.retrievedSnippets.length > 0) {
    userPrompt += `\n\nRELEVANT EXPERIENCE (from previous tenders):`;
    enrichment.retrievedSnippets.forEach((snippet: any, index: number) => {
      userPrompt += `\n${index + 1}. Q: ${snippet.similar_question}\n   A: ${snippet.answer}`;
    });
  }

  // Add document context if available - TRUNCATE TO ~1000 WORDS TO AVOID TOKEN OVERFLOW
  if (enrichment.documentContext && enrichment.documentContext.length > 0) {
    console.log(`Adding document context: ${enrichment.documentContext.length} items`);
    
    let contextText = '';
    let wordCount = 0;
    const maxWords = 1000;
    
    for (const contextItem of enrichment.documentContext) {
      const itemText = typeof contextItem === 'string' ? contextItem : (contextItem.text || '');
      const itemWords = itemText.split(/\s+/).length;
      
      if (wordCount + itemWords > maxWords) {
        const remainingWords = maxWords - wordCount;
        if (remainingWords > 20) {
          // Take partial text if we have room for meaningful content
          const partialText = itemText.split(/\s+/).slice(0, remainingWords).join(' ') + '...';
          contextText += `\n- ${partialText}`;
        }
        console.log(`Context truncated at ${wordCount} words (max ${maxWords})`);
        break;
      } else {
        contextText += `\n- ${itemText}`;
        wordCount += itemWords;
      }
    }
    
    if (contextText.trim()) {
      userPrompt += `\n\nTENDER CONTEXT:${contextText}`;
    }
  }

  // Add mandatory compliance instructions
  if (enrichment.instructions && enrichment.instructions.length > 0) {
    userPrompt += `\n\nMANDATORY COMPLIANCE REQUIREMENTS:`;
    enrichment.instructions.forEach((instruction: any) => {
      const instructionText = typeof instruction === 'string' ? instruction : (instruction.text || instruction);
      userPrompt += `\n- ${instructionText}`;
    });
  }

  userPrompt += `\n\nQUESTIONS TO ANSWER:\n${questions}

Please provide professional responses to each question based on the company profile and requirements above.`;

  // Log payload size for debugging
  const payloadSize = (systemPrompt + userPrompt).length;
  console.log(`Generating answers for ${questionBatch.length} questions - payload size: ${payloadSize} chars`);
  if (payloadSize > 50000) {
    console.warn(`Large payload detected: ${payloadSize} chars - may cause API issues`);
  }

  // Try generating answers with retry logic
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`Generating answers for batch (attempt ${attempt})`);
      
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
        const errorText = await response.text();
        console.error(`OpenAI API error ${response.status}: ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error('No content returned from OpenAI - response:', data);
        throw new Error('No content returned from OpenAI');
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse OpenAI JSON response:', content);
        const errorMessage = getErrorMessage(parseError);
        throw new Error(`Invalid JSON response from OpenAI: ${errorMessage}`);
      }
      
      if (!result.answers || !Array.isArray(result.answers)) {
        console.error('Invalid response format from OpenAI:', result);
        throw new Error('Invalid response format: missing answers array');
      }

      console.log(`Successfully generated ${result.answers.length} answers`);
      return result.answers;

    } catch (error) {
      console.error(`Answer generation attempt ${attempt} failed:`, error);
      
      if (attempt === 2) {
        // Final attempt failed, return fallback answers
        console.log('Using fallback answers for failed batch');
        return questionBatch.map(q => ({
          question: q.question_text,
          answer: `We are unable to provide a detailed response to this question at this time. Please contact ${enrichment.companyProfile.company_name} directly to discuss your specific requirements and how our services can meet your needs.`
        }));
      }
    }
  }

  return [];
}

// Progressive save to tender_responses table
async function saveAnswerBatch(
  answers: any[],
  questionBatch: any[],
  tenderId: string,
  companyProfileId: string,
  supabaseClient: any
): Promise<any> {
  const batchAnswers = [];
  
  for (let i = 0; i < answers.length && i < questionBatch.length; i++) {
    const answer = answers[i];
    const question = questionBatch[i];
    
    batchAnswers.push({
      tender_id: tenderId,
      company_profile_id: companyProfileId,
      question: question.question_text,
      question_index: question.question_number,
      ai_generated_answer: answer.answer,
      is_approved: false,
      model_used: 'gpt-5-mini-2025-08-07',
      question_type: 'standard',
      response_length: answer.answer.length,
      processing_time_ms: 0
    });
  }
  
  const { data, error } = await supabaseClient
    .from("tender_responses")
    .upsert(batchAnswers, {
      onConflict: "tender_id,question_index"
    });

  if (error) {
    console.error("❌ Error saving answers batch:", error, batchAnswers);
    return { error, unsaved: batchAnswers };
  }

  console.log(`✅ Saved ${data?.length ?? 0} answers for tender ${tenderId}`);
  return data;
}

// Generate all answers with progressive saving
async function generateAllAnswers(
  segments: { questions: any[] },
  enrichment: any,
  tenderId: string,
  companyProfileId: string,
  supabaseClient: any
): Promise<{ totalAnswers: number; batchesProcessed: number; allAnswers: any[] }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('OpenAI API key not available for answer generation');
    return { totalAnswers: 0, batchesProcessed: 0, allAnswers: [] };
  }

  if (!segments.questions || segments.questions.length === 0) {
    console.log('No questions to process');
    return { totalAnswers: 0, batchesProcessed: 0, allAnswers: [] };
  }

  const batchSize = 5; // Process 5 questions at a time for optimal performance
  const batches = [];
  
  // Split questions into batches
  for (let i = 0; i < segments.questions.length; i += batchSize) {
    batches.push(segments.questions.slice(i, i + batchSize));
  }

  console.log(`Processing ${segments.questions.length} questions in ${batches.length} batches`);
  
  let totalAnswers = 0;
  let batchesProcessed = 0;
  let allAnswers: any[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} questions)`);
    
    try {
      // Generate answers for this batch
      const answers = await generateAnswersForBatch(batch, enrichment, openAIApiKey);
      
      // Save answers to database
      const saveResult = await saveAnswerBatch(answers, batch, tenderId, companyProfileId, supabaseClient);
      
      if (!saveResult.error) {
        // Collect answers for response envelope
        for (let i = 0; i < answers.length && i < batch.length; i++) {
          allAnswers.push({
            question: batch[i].question_text,
            question_number: batch[i].question_number,
            answer: answers[i].answer
          });
        }
        
        totalAnswers += answers.length;
        batchesProcessed++;
        console.log(`Batch ${batchIndex + 1} completed: ${answers.length} answers saved`);
      } else {
        console.error(`Batch ${batchIndex + 1} save failed:`, saveResult.error);
      }
      
    } catch (batchError) {
      console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
      // Continue with next batch rather than failing completely
    }
  }

  console.log(`Answer generation complete: ${totalAnswers} answers generated in ${batchesProcessed} batches`);
  return { totalAnswers, batchesProcessed, allAnswers };
}

// Build enrichment context bundle
function buildEnrichmentBundle(
  companyProfile: any,
  retrievedSnippets: any[],
  segments: { questions: any[]; context: any[]; instructions: any[]; }
): any {
  return {
    companyProfile,
    retrievedSnippets,
    documentContext: segments.context,
    instructions: segments.instructions
  };
}

// Main processing function with comprehensive error handling
async function processTenderV2(request: ProcessTenderRequest): Promise<ProcessTenderResponse> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Initialize response with safe defaults
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
    status: 'failed',
    message: 'Processing not started',
    error: undefined,
    answers: [] // Add answers array for debugging
  };

  // Top-level try/catch to ensure function always returns JSON
  try {
    console.log(`[DIAGNOSTIC] Starting tender processing: ${request.tenderId}`);

    // Step 1: Validate tender exists
    let tender = null;
    try {
      console.log(`[DIAGNOSTIC] ✅ Starting Step 1: Validating tender exists...`);
      const { data: tenderData, error: tenderError } = await supabaseClient
        .from('tenders')
        .select('*')
        .eq('id', request.tenderId)
        .single();

      if (tenderError || !tenderData) {
        response.error = 'Tender not found in database';
        response.message = 'The specified tender ID does not exist';
        console.error(`[DIAGNOSTIC] ❌ Tender validation failed: ${tenderError?.message || 'No data'}`);
        return response;
      }
      
      tender = tenderData;
      console.log(`[DIAGNOSTIC] ✅ Tender validated - Company: ${tender.company_profile_id}`);
      
    } catch (error) {
      response.error = 'Database connection failed';
      response.message = 'Unable to connect to database to validate tender';
      console.error(`[DIAGNOSTIC] ❌ Database error during tender validation:`, error);
      return response;
    }

    // Step 2: Extract text from file or use provided text
    let rawText = '';
    try {
      console.log(`[DIAGNOSTIC] ✅ Starting Step 2: Text extraction...`);
      if (request.extractedText && request.extractedText.trim().length >= 50) {
        console.log(`[DIAGNOSTIC] Using provided extracted text - ${request.extractedText.length} characters`);
        rawText = request.extractedText.trim();
      } else if (request.filePath) {
        console.log(`[DIAGNOSTIC] Extracting text from file: ${request.filePath}`);
        const extension = request.filePath.toLowerCase().split('.').pop() || 'unknown';
        console.log(`[DIAGNOSTIC] File extension detected: ${extension}`);
        
        rawText = await extractText(request.filePath, extension, supabaseClient);
        console.log(`[DIAGNOSTIC] File extraction successful - ${rawText.length} characters extracted`);
      } else {
        response.error = 'No text source provided';
        response.message = 'Either extractedText or filePath must be provided';
        console.error(`[DIAGNOSTIC] ❌ No text source in request`);
        return response;
      }

      // Validate minimum text length
      if (rawText.length < 50) {
        response.error = 'Insufficient text content';
        response.message = `Document contains only ${rawText.length} characters - minimum 50 required`;
        console.error(`[DIAGNOSTIC] ❌ Text too short: ${rawText.length} characters`);
        return response;
      }
      
      console.log(`[DIAGNOSTIC] ✅ File parsed - ${rawText.length} characters available`);
      
    } catch (extractError) {
      response.error = 'Text extraction failed';
      const errorMessage = getErrorMessage(extractError);
      response.message = `Unable to extract text: ${errorMessage}`;
      console.error(`[DIAGNOSTIC] ❌ Text extraction error:`, extractError);
      return response;
    }

    // Step 3: Segment the extracted text with comprehensive error handling
    let segments: { questions: any[]; context: any[]; instructions: any[]; } = { questions: [], context: [], instructions: [] };
    try {
      console.log(`[DIAGNOSTIC] ✅ Starting Step 3: Text segmentation...`);
      console.log(`[DIAGNOSTIC] Chars extracted: ${rawText.length}, will attempt AI segmentation`);
      
      segments = await segmentContent(rawText);
      
      console.log(`[DIAGNOSTIC] ✅ Segmentation complete - Questions: ${segments.questions.length}, Context: ${segments.context.length}, Instructions: ${segments.instructions.length}`);
      console.log(`[DIAGNOSTIC] Context items found: ${segments.context.length}`);
      console.log(`[DIAGNOSTIC] Questions found: ${segments.questions.length}`);
      console.log(`[DIAGNOSTIC] Instructions found: ${segments.instructions.length}`);
      
      // Update response with segmentation progress
      response.segments = segments;
      response.questionsFound = segments.questions.length;
      response.contextFound = segments.context.length;
      response.instructionsFound = segments.instructions.length;
      response.rawText = rawText;
      response.status = 'segmented';
      
    } catch (segmentError) {
      const errorMsg = segmentError instanceof Error ? segmentError.message : 'Unknown segmentation error';
      console.error(`[DIAGNOSTIC] ❌ Segmentation failed:`, errorMsg);
      // Don't fail completely - continue with minimal segmentation
      segments = {
        questions: [],
        context: [{ text: rawText.substring(0, Math.min(1000, rawText.length)), source: 'fallback' }],
        instructions: []
      };
      response.segments = segments;
      response.contextFound = 1;
      response.rawText = rawText;
      response.status = 'segmented';
      response.error = `Segmentation partially failed: ${errorMsg}`;
      console.log(`[DIAGNOSTIC] Using fallback segmentation with ${segments.context.length} context items`);
    }

    // Step 4: Perform enrichment (company profile + vector search) with error resilience
    let enrichment = null;
    try {
      console.log(`[DIAGNOSTIC] ✅ Starting Step 4: Enrichment phase...`);
      
      // Fetch company profile
      const companyProfile = await fetchCompanyProfile(tender.company_profile_id, supabaseClient);
      console.log(`[DIAGNOSTIC] Company profile fetched: ${companyProfile.company_name}`);
      
      // Perform vector search for questions (only if we have questions)
      let retrievedSnippets = [];
      if (segments.questions.length > 0) {
        console.log(`[DIAGNOSTIC] Performing vector search for ${segments.questions.length} questions...`);
        try {
          retrievedSnippets = await performVectorSearch(segments.questions, tender.company_profile_id, supabaseClient);
          console.log(`[DIAGNOSTIC] Vector search complete - ${retrievedSnippets.length} snippets retrieved`);
        } catch (vectorError) {
          console.error(`[DIAGNOSTIC] Vector search failed (continuing):`, vectorError);
          retrievedSnippets = [];
        }
      }
      
      // Build enrichment bundle
      enrichment = buildEnrichmentBundle(companyProfile, retrievedSnippets, segments);
      console.log(`[DIAGNOSTIC] ✅ Enrichment complete`);
      console.log(`[DIAGNOSTIC] Enrichment bundle: profile=${companyProfile.company_name}, snippets=${retrievedSnippets.length}, context=${segments.context.length}, instructions=${segments.instructions.length}`);
      
      response.enrichment = enrichment;
      response.status = 'enriched';
      
    } catch (enrichmentError) {
      console.error(`[DIAGNOSTIC] ❌ Enrichment failed:`, enrichmentError);
      // Create minimal enrichment to allow processing to continue
      try {
        const fallbackProfile = await fetchCompanyProfile(tender.company_profile_id, supabaseClient);
        enrichment = buildEnrichmentBundle(fallbackProfile, [], segments);
        console.log(`[DIAGNOSTIC] Using fallback enrichment with minimal profile`);
        response.status = 'enriched';
      } catch (fallbackError) {
        console.error(`[DIAGNOSTIC] ❌ Even fallback enrichment failed:`, fallbackError);
        response.status = 'segmented';
        const errorMessage = getErrorMessage(fallbackError);
        response.error = `Enrichment failed: ${errorMessage}`;
      }
    }

    // Step 5: Generate answers if we have enrichment and questions
    let answerStats: { totalAnswers: number; batchesProcessed: number; allAnswers: any[] } = { totalAnswers: 0, batchesProcessed: 0, allAnswers: [] };
    if (enrichment && segments.questions.length > 0) {
      try {
        console.log(`[DIAGNOSTIC] ✅ Starting Step 5: Answer generation for ${segments.questions.length} questions...`);
        answerStats = await generateAllAnswers(
          segments, 
          enrichment, 
          request.tenderId, 
          tender.company_profile_id, 
          supabaseClient
        );
        
        console.log(`[DIAGNOSTIC] ✅ Answers generated - ${answerStats.totalAnswers} answers in ${answerStats.batchesProcessed} batches`);
        
      } catch (answerError) {
        console.error(`[DIAGNOSTIC] ❌ Answer generation failed (continuing):`, answerError);
        // Continue without failing the entire process
      }
    }

    // Step 6: Always update tender status to draft and finalize
    try {
      console.log(`[DIAGNOSTIC] ✅ Starting Step 6: Finalizing tender status...`);
      
      const { error: statusError } = await supabaseClient
        .from('tenders')
        .update({ 
          status: 'draft',
          processed_questions: answerStats.totalAnswers,
          total_questions: segments.questions.length,
          progress: 100
        })
        .eq('id', request.tenderId);
      
      if (statusError) {
        console.error("❌ Failed to update tender status:", statusError);
      } else {
        console.log(`✅ DB save complete - Tender ${request.tenderId} marked as draft`);
      }
      
      response.status = 'draft';
    } catch (updateError) {
      console.error(`[DIAGNOSTIC] ❌ Failed to update tender status:`, updateError);
      // Don't fail the entire process for this
    }

    // Add answers to JSON response for visibility in Review UI
    response.answers = answerStats.allAnswers;

    // Final response success state
    response.success = true;
    
    // Build comprehensive message with unique question count
    console.log(`[DIAGNOSTIC] ✅ Processing complete - ${segments.questions.length} unique questions detected and saved`);
    
    let message = `Successfully processed ${rawText.length} characters: ${segments.questions.length} unique questions, ${segments.context.length} context items, ${segments.instructions.length} instructions`;
    if (enrichment) {
      message += `, ${enrichment.retrievedSnippets.length} retrieved snippets`;
    }
    if (answerStats.totalAnswers > 0) {
      message += `, ${answerStats.totalAnswers} personalized answers generated`;
    }
    response.message = message;

    console.log(`[DIAGNOSTIC] ✅ Final Status: ${response.status}, Success: ${response.success}`);
    return response;

  } catch (fatalError) {
    // Top-level catch ensures function always returns JSON, even on unexpected failures
    console.error(`[DIAGNOSTIC] ❌ Fatal error in processTenderV2:`, fatalError);
    
    // Always set status to failed and update database
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('tenders')
        .update({ status: 'failed' })
        .eq('id', request.tenderId);
        
      console.log(`[DIAGNOSTIC] Tender ${request.tenderId} marked as failed due to fatal error`);
    } catch (dbError) {
      console.error(`[DIAGNOSTIC] Failed to update tender status to failed:`, dbError);
    }
    
    response.success = false;
    response.status = 'failed';
    response.error = 'Unexpected processing error';
    const errorMessage = getErrorMessage(fatalError);
    response.message = `Processing failed due to unexpected error: ${errorMessage}`;
    
    return response;
  }
}

// HTTP server with hardened error handling - ALWAYS returns HTTP 200 with JSON envelope
serve(async (req) => {
  // Standard response envelope for all errors
  const createErrorResponse = (error: string, message: string, tenderId: string | null = null) => ({
    success: false,
    tenderId,
    questionsFound: 0,
    contextFound: 0,
    instructionsFound: 0,
    segments: { questions: [], context: [], instructions: [] },
    rawText: '',
    status: 'failed',
    message,
    error
  });

  // Handle CORS preflight - always return 200
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log(`[DIAGNOSTIC] HTTP ${req.method} request received`);

    // Validate HTTP method
    if (req.method !== 'POST') {
      console.log(`[DIAGNOSTIC] Invalid method: ${req.method}`);
      return new Response(
        JSON.stringify(createErrorResponse(
          'Method not allowed',
          'Only POST requests are supported'
        )),
        { 
          status: 200, // Always return 200
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body with error handling
    let requestBody: any;
    try {
      requestBody = await req.json();
      console.log(`[DIAGNOSTIC] Request parsed successfully`);
    } catch (parseError) {
      console.error(`[DIAGNOSTIC] JSON parse error:`, parseError);
      return new Response(
        JSON.stringify(createErrorResponse(
          'Invalid JSON',
          'Request body must be valid JSON'
        )),
        { 
          status: 200, // Always return 200
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    if (!requestBody || !requestBody.tenderId) {
      console.log(`[DIAGNOSTIC] Missing tenderId in request`);
      return new Response(
        JSON.stringify(createErrorResponse(
          'Missing required field: tenderId',
          'tenderId is required in request body',
          requestBody?.tenderId || null
        )),
        { 
          status: 200, // Always return 200
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[DIAGNOSTIC] Processing request for tender: ${requestBody.tenderId}`);

    // Process the tender - this function handles all its own errors
    const result = await processTenderV2(requestBody);

    console.log(`[DIAGNOSTIC] Processing completed - Success: ${result.success}, Status: ${result.status}`);

    // Always return 200 with the result
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, // Always return 200 regardless of processing result
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (serverError) {
    // Final catch-all for any unexpected server errors
    console.error(`[DIAGNOSTIC] Unexpected server error:`, serverError);
    
    return new Response(
      JSON.stringify(createErrorResponse(
        'Server error',
        `An unexpected server error occurred: ${serverError instanceof Error ? serverError.message : 'Unknown server error'}`
      )),
      { 
        status: 200, // Always return 200 even for server errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});