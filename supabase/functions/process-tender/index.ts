import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting store (in-memory for this deployment)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Input validation helpers
function validateTenderId(tenderId: string): boolean {
  return typeof tenderId === 'string' && tenderId.length > 0 && tenderId.length < 100;
}

function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  // Remove potential XSS and injection patterns
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/javascript:/gi, '')
             .replace(/on\w+\s*=/gi, '')
             .trim();
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userKey = `user_${userId}`;
  const userLimit = rateLimitStore.get(userKey);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

interface ProcessTenderRequest {
  tenderId: string;
  extractedText?: string;
  extractedTextPath?: string;
  filePath?: string;
  batchStart?: number;
  questions?: string[];
}

function extractQuestionsFromText(text: string): string[] {
  const questions: string[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`Processing ${lines.length} lines from extracted text`);
  
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
          console.log(`Linking sub-question to parent`);
        } else if (!isSubQuestion) {
          // This is a main question, remember it for future sub-questions
          lastMainQuestion = bestMatch;
        }
        
        questions.push(bestMatch);
        console.log(`Added question ${questions.length} (confidence: ${bestConfidence.toFixed(2)})`);
      }
    }
  }
  
  console.log(`Extracted ${questions.length} questions from text`);
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

// ============= HELPER FUNCTIONS FOR BASE64 =============

/**  
 * Normalizes a Base64 string by removing whitespace and handling URL-safe characters
 */
function normalizeBase64(base64String: string): string {
  return base64String
    .replace(/\s+/g, '') // Remove all whitespace including newlines
    .replace(/-/g, '+')  // Convert URL-safe Base64 to standard Base64
    .replace(/_/g, '/'); // Convert URL-safe Base64 to standard Base64
}

/**
 * Parses service account JSON from environment with robust Base64 handling
 */
function parseServiceAccountEnv(envValue: string): any {
  // First, try parsing as direct JSON
  try {
    return JSON.parse(envValue);
  } catch (jsonError) {
    // If direct JSON fails, try Base64 decoding
    try {
      const normalizedBase64 = normalizeBase64(envValue);
      const decoded = atob(normalizedBase64);
      return JSON.parse(decoded);
    } catch (base64Error) {
      throw new Error('Failed to parse service account JSON');
    }
  }
}

// ============= END HELPER FUNCTIONS =============

// JWT creation function for Google OAuth
async function createJWT(serviceAccountKey: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour expiry
    iat: now
  };

  // Base64URL encoding helper
  const base64URLEncode = (obj: any): string => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64URLEncode(header);
  const encodedPayload = base64URLEncode(payload);
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  try {
    // Clean and prepare the private key
    const privateKeyPem = serviceAccountKey.private_key;
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    
    const pemContents = privateKeyPem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
    
    // Convert PEM to ArrayBuffer
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the private key
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyData,
      new TextEncoder().encode(message)
    );

    // Base64URL encode the signature
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${message}.${encodedSignature}`;
  } catch (error) {
    console.error('JWT creation failed');
    throw new Error('Failed to create JWT for authentication');
  }
}

// ============= CONTENT SEGMENTATION FUNCTIONS =============

// Function to categorize content into segments using AI
async function categorizeContent(text: string, openAIApiKey: string): Promise<{
  context: string[];
  instructions: string[];
  questions: string[];
  other: string[];
}> {
  try {
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
            content: `You are an expert at analyzing tender documents and categorizing content. Your task is to analyze the given text and categorize each paragraph/section into one of four categories:

1. CONTEXT: Background information, company details, project scope, objectives, requirements overview
2. INSTRUCTIONS: Submission rules, format requirements, evaluation criteria, timelines, compliance requirements  
3. QUESTIONS: Specific items requiring vendor responses (numbered requirements, "Describe...", "Provide...", "What...", "How...", etc.)
4. OTHER: Terms and conditions, legal text, appendices, contact information

Return your response as a JSON object with four arrays: "context", "instructions", "questions", and "other". Each array should contain the relevant text segments.

Focus on identifying vendor response items for the "questions" category - these are specific requirements that need answers from bidders.`
          },
          {
            role: 'user', 
            content: `Please categorize the following tender document text:\n\n${text.substring(0, 15000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      return JSON.parse(content);
    } catch {
      // Fallback if JSON parsing fails
      console.warn('Failed to parse categorization JSON, using fallback');
      return {
        context: [text.substring(0, 1000)],
        instructions: [],
        questions: [],
        other: []
      };
    }
  } catch (error) {
    console.error('Error in content categorization:', error);
    // Fallback categorization
    return {
      context: [text.substring(0, 1000)],
      instructions: [],
      questions: [],
      other: []
    };
  }
}

// Enhanced function to extract vendor-specific questions
async function extractVendorQuestions(categorizedContent: any, openAIApiKey: string): Promise<string[]> {
  const allQuestionText = [
    ...categorizedContent.questions,
    ...categorizedContent.instructions.filter((item: string) => 
      item.toLowerCase().includes('describe') || 
      item.toLowerCase().includes('provide') ||
      item.toLowerCase().includes('explain')
    )
  ].join('\n');

  if (!allQuestionText.trim()) {
    return [];
  }

  try {
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
            content: `Extract individual vendor response requirements from tender text. Look for:
- Numbered requirements or questions
- Items starting with "Describe", "Provide", "Explain", "What", "How"  
- Specific deliverables or information requests
- Evaluation criteria that require vendor input

Return each question as a separate line. Preserve original numbering where possible. Focus only on items requiring vendor responses, not general information.`
          },
          {
            role: 'user',
            content: allQuestionText.substring(0, 10000)
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return content.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 10)
      .slice(0, 50); // Limit to 50 questions max
      
  } catch (error) {
    console.error('Error extracting vendor questions:', error);
    // Fallback to simple extraction
    return allQuestionText.split('\n')
      .filter((line: string) => line.trim().length > 10)
      .slice(0, 20);
  }
}

// Function to detect file type from filename and content
function detectFileType(fileName: string, extractedText?: string): string {
  const name = fileName.toLowerCase();
  
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx'; 
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (name.endsWith('.txt')) return 'txt';
  if (name.endsWith('.rtf')) return 'rtf';
  
  // Fallback detection based on content patterns
  if (extractedText) {
    if (extractedText.includes('===') && extractedText.includes('|')) return 'xlsx';
  }
  
  return 'unknown';
}

// ============= END CONTENT SEGMENTATION FUNCTIONS =============

const BATCH_SIZE = 8; // Process 8 questions per batch to avoid timeouts

// Background processing function with batched processing
async function processTenderInBackground(tenderId: string, extractedText?: string, extractedTextPath?: string, filePath?: string, batchStart = 0, questions?: string[]) {
  let supabaseClient: any = null;
  
  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Input validation
    if (!validateTenderId(tenderId)) {
      throw new Error('Invalid tender ID format');
    }

    // Get the tender details early to access metadata needed for processing
    const { data: tenderData, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*, company_profiles(*)')
      .eq('id', tenderId)
      .single();

    if (tenderError || !tenderData) {
      console.error('Failed to fetch tender data');
      throw new Error('Failed to fetch tender data');
    }

    // Distinguish between initial batch (needs text/file) and subsequent batches (need questions array)
    const isInitialBatch = batchStart === 0;
    const isSubsequentBatch = !isInitialBatch && questions && questions.length > 0;
    
    if (isInitialBatch && (!extractedText && !extractedTextPath && !filePath)) {
      throw new Error('Initial batch missing required text/file fields');
    }
    
    if (!isInitialBatch && !isSubsequentBatch) {
      throw new Error('Subsequent batch missing questions array');
    }

    let textToProcess = extractedText ? sanitizeText(extractedText) : undefined;
    
    // If no inline text but we have a text path, download the text from storage
    if (!textToProcess && extractedTextPath) {
      console.log('Downloading extracted text from storage');
      try {
        const { data: textData, error: textError } = await supabaseClient.storage
          .from('tender-documents')
          .download(extractedTextPath);

        if (textError || !textData) {
          console.error('Failed to download extracted text');
          // Continue to try other methods
        } else {
          const rawText = await textData.text();
          textToProcess = sanitizeText(rawText);
          console.log(`Successfully loaded text from storage (${textToProcess.length} characters)`);
        }
      } catch (error) {
        console.error('Error downloading extracted text');
        // Continue to try other methods
      }
    }

    // If still no text and we have filePath, try to find a derived .txt file for reprocessing
    if (!textToProcess && filePath) {
      const derivedTextPath = `${filePath}.txt`;
      console.log(`Checking for derived text file: ${derivedTextPath}`);
      try {
        const { data: derivedTextData, error: derivedTextError } = await supabaseClient.storage
          .from('tender-documents')
          .download(derivedTextPath);

        if (!derivedTextError && derivedTextData) {
          const rawText = await derivedTextData.text();
          textToProcess = sanitizeText(rawText);
          console.log(`Successfully loaded text from derived file (${textToProcess.length} characters)`);
        }
      } catch (error) {
        console.log('No derived text file found, will use OCR');
      }
    }

    // If no text available yet and filePath is provided, use Google Document AI to extract text
    if (!textToProcess && filePath) {
      console.log('Using Google Document AI to extract text');
      
      const googleServiceAccountJson = Deno.env.get('GOOGLE_DOCAI_SERVICE_ACCOUNT_JSON');
      
      if (!googleServiceAccountJson) {
        console.error('Missing Google Document AI service account JSON');
        // Update tender with error status
        await supabaseClient
          .from('tenders')
          .update({
            status: 'error',
            error_message: 'OCR service not configured',
            last_activity_at: new Date().toISOString()
          })
          .eq('id', tenderId);
        
        throw new Error('OCR service not configured');
      }

      try {
        // Parse the service account JSON with robust Base64 handling
        const serviceAccountKey = parseServiceAccountEnv(googleServiceAccountJson);
        console.log('Successfully parsed service account JSON');

        // Validate required fields
        if (!serviceAccountKey.project_id || !serviceAccountKey.client_email || !serviceAccountKey.private_key) {
          await supabaseClient
            .from('tenders')
            .update({
              status: 'error',
              error_message: 'Service account JSON missing required fields',
              last_activity_at: new Date().toISOString()
            })
            .eq('id', tenderId);
          
          throw new Error('Service account JSON missing required fields');
        }

        // Normalize private_key (handle escaped newlines)
        if (serviceAccountKey.private_key) {
          serviceAccountKey.private_key = serviceAccountKey.private_key.replace(/\\n/g, '\n');
        }

        const projectId = serviceAccountKey.project_id;
        // Normalize location to standard regions (us, eu)
        const rawLocation = Deno.env.get('GOOGLE_DOCAI_LOCATION') || 'us';
        const location = rawLocation.toLowerCase().includes('eu') ? 'eu' : 'us';
        const processorId = Deno.env.get('GOOGLE_DOCAI_PROCESSOR_ID');
        
        if (!processorId) {
          console.error('Missing GOOGLE_DOCAI_PROCESSOR_ID environment variable');
          await supabaseClient
            .from('tenders')
            .update({
              status: 'error',
              error_message: 'Google Document AI processor ID not configured',
              last_activity_at: new Date().toISOString()
            })
            .eq('id', tenderId);
          
          throw new Error('Google Document AI processor ID not configured');
        }
        
        console.log(`Using Google Document AI with project: ${projectId}, location: ${location}`);

        // Get the file from Supabase storage
        const { data: fileData, error: fileError } = await supabaseClient.storage
          .from('tender-documents')
          .download(filePath);

        if (fileError || !fileData) {
          console.error('Failed to download file');
          throw new Error('Failed to download file for processing');
        }

        // Convert file to base64
        const fileBuffer = await fileData.arrayBuffer();
        const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
        
        // Determine MIME type
        const mimeType = fileData.type || 'application/pdf';
        console.log(`Processing file with MIME type: ${mimeType}`);

        // Get OAuth token using service account
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: await createJWT(serviceAccountKey),
          }),
        });

        if (!tokenResponse.ok) {
          const tokenError = await tokenResponse.text();
          console.error('Failed to get OAuth token');
          await supabaseClient
            .from('tenders')
            .update({
              status: 'error',
              error_message: `Google OAuth authentication failed: ${tokenResponse.status}`,
              last_activity_at: new Date().toISOString()
            })
            .eq('id', tenderId);
          
          throw new Error(`Authentication failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Call Google Document AI API
        const docAIEndpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;
        
        const docAIResponse = await fetch(docAIEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rawDocument: {
              content: fileBase64,
              mimeType: mimeType,
            },
          }),
        });

        if (!docAIResponse.ok) {
          const errorText = await docAIResponse.text();
          console.error('Google Document AI API error');
          await supabaseClient
            .from('tenders')
            .update({
              status: 'error',
              error_message: `Document AI processing failed: ${docAIResponse.status}`,
              last_activity_at: new Date().toISOString()
            })
            .eq('id', tenderId);
          
          throw new Error(`OCR service error: ${docAIResponse.status}`);
        }

        const docAIData = await docAIResponse.json();
        const extractedTextRaw = docAIData.document?.text || '';
        textToProcess = sanitizeText(extractedTextRaw);

        // Save the extracted text to storage for future use
        if (textToProcess) {
          const textBlob = new Blob([textToProcess], { type: 'text/plain' });
          const textFileName = `${filePath}.txt`;
          
          try {
            await supabaseClient.storage
              .from('tender-documents')
              .upload(textFileName, textBlob, {
                cacheControl: '3600',
                upsert: true
              });
            console.log('Extracted text saved to storage for future use');
          } catch (uploadError) {
            console.log('Could not save extracted text to storage (non-critical)');
          }
        }

      } catch (error) {
        console.error('Error in Google Document AI processing');
        await supabaseClient
          .from('tenders')
          .update({
            status: 'error',
            error_message: 'Document processing failed',
            last_activity_at: new Date().toISOString()
          })
          .eq('id', tenderId);
        
        throw error;
      }
    }

    let questionsToProcess: string[] = [];
    let segmentedContent: any = null;

    if (isInitialBatch && textToProcess) {
      // Get file type for processing logic
      const fileType = detectFileType(tenderData.original_filename || '', textToProcess);
      
      console.log(`Detected file type: ${fileType}`);
      
      // Segment content using AI categorization
      console.log('Starting content segmentation...');
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openAIApiKey) {
        segmentedContent = await categorizeContent(textToProcess, openAIApiKey);
        
        console.log(`Content segmented: ${segmentedContent.context.length} context items, ${segmentedContent.instructions.length} instruction items, ${segmentedContent.questions.length} question items, ${segmentedContent.other.length} other items`);
        
        // Extract vendor-specific questions from segmented content
        questionsToProcess = await extractVendorQuestions(segmentedContent, openAIApiKey);
      } else {
        // Fallback to original extraction if no OpenAI key
        console.warn('No OpenAI API key, using fallback question extraction');
        questionsToProcess = extractQuestionsFromText(textToProcess);
      }
      
      if (questionsToProcess.length === 0) {
        console.log('No questions found in document');
        await supabaseClient
          .from('tenders')
          .update({
            status: 'completed',
            processing_stage: 'completed',
            total_questions: 0,
            processed_questions: 0,
            progress: 100,
            file_type_detected: fileType,
            content_segments_count: segmentedContent ? Object.values(segmentedContent).flat().length : 0,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', tenderId);
        return;
      }

      // Update tender with segmented content and questions count
      const updateData: any = {
        total_questions: questionsToProcess.length,
        processing_stage: 'processing_questions',
        file_type_detected: fileType,
        content_segments_count: segmentedContent ? Object.values(segmentedContent).flat().length : 0,
        last_activity_at: new Date().toISOString()
      };
      
      if (segmentedContent) {
        updateData.extracted_context = segmentedContent.context;
        updateData.extracted_instructions = segmentedContent.instructions; 
        updateData.extracted_questions = segmentedContent.questions;
        updateData.extracted_other = segmentedContent.other;
      }
      
      await supabaseClient
        .from('tenders')
        .update(updateData)
        .eq('id', tenderId);

    } else if (isSubsequentBatch && questions) {
      // Use provided questions for subsequent batches
      questionsToProcess = questions.map(q => sanitizeText(q));
    } else {
      throw new Error('Unable to determine questions to process');
    }

    // Determine which questions to process in this batch
    const questionsForThisBatch = questionsToProcess.slice(batchStart, batchStart + BATCH_SIZE);
    
    if (questionsForThisBatch.length === 0) {
      console.log('No questions in this batch, marking as completed');
      await supabaseClient
        .from('tenders')
        .update({
          status: 'completed',
          processing_stage: 'completed',
          progress: 100,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', tenderId);
      return;
    }

    console.log(`Processing batch ${batchStart / BATCH_SIZE + 1}: ${questionsForThisBatch.length} questions`);

    const companyProfile = tenderData.company_profiles;
    if (!companyProfile) {
      console.error('No company profile found for tender');
      throw new Error('No company profile found for tender');
    }

    // Process each question with AI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const enableResearch = Deno.env.get('ENABLE_RESEARCH') === 'true';

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('AI service not configured');
    }

    const processedQuestions = [];
    
    for (let i = 0; i < questionsForThisBatch.length; i++) {
      const question = questionsForThisBatch[i];
      const questionIndex = batchStart + i;
      
      console.log(`Processing question ${questionIndex + 1}/${questionsToProcess.length}: ${question.substring(0, 100)}...`);

      try {
        // Classify the question
        const classification = classifyQuestion(question);
        console.log(`Question classified as: ${classification.type} (${classification.reasoning})`);

        // Fetch relevant memory
        let memoryContext = null;
        if (openAIApiKey) {
          memoryContext = await fetchRelevantMemory(question, companyProfile.id, supabaseClient, openAIApiKey);
        }

        // Fetch research if enabled and needed
        let researchSnippet = null;
        if (enableResearch && perplexityApiKey && classification.needsResearch) {
          researchSnippet = await fetchResearchSnippet(question, companyProfile.company_name, perplexityApiKey);
        }

        const startTime = Date.now();
        
        // Generate AI response with enhanced context
        const aiResponse = await generateAIResponse(
          question, 
          companyProfile, 
          classification.type,
          memoryContext,
          researchSnippet,
          segmentedContent, // Pass segmented content for context
          openAIApiKey
        );
        
        const processingTime = Date.now() - startTime;

        // Store the response in database
        const { error: insertError } = await supabaseClient
          .from('tender_responses')
          .insert({
            tender_id: tenderId,
            company_profile_id: companyProfile.id,
            question: question,
            question_index: questionIndex,
            question_type: classification.type,
            ai_generated_answer: aiResponse.answer,
            model_used: aiResponse.model_used,
            research_used: !!researchSnippet,
            response_length: aiResponse.answer.length,
            processing_time_ms: processingTime,
            is_approved: false
          });

        if (insertError) {
          console.error('Failed to insert response');
          throw insertError;
        }

        processedQuestions.push({
          question,
          answer: aiResponse.answer,
          questionIndex
        });

        console.log(`Successfully processed question ${questionIndex + 1}`);

      } catch (error) {
        console.error(`Failed to process question ${questionIndex + 1}`);
        
        // Insert error response
        await supabaseClient
          .from('tender_responses')
          .insert({
            tender_id: tenderId,
            company_profile_id: companyProfile.id,
            question: question,
            question_index: questionIndex,
            question_type: 'error',
            ai_generated_answer: 'Error processing this question. Please edit manually.',
            model_used: 'error',
            research_used: false,
            response_length: 0,
            processing_time_ms: 0,
            is_approved: false
          });
      }
    }

    // Update progress
    const totalProcessedSoFar = batchStart + processedQuestions.length;
    const progress = Math.round((totalProcessedSoFar / questionsToProcess.length) * 100);
    
    await supabaseClient
      .from('tenders')
      .update({
        processed_questions: totalProcessedSoFar,
        progress: progress,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    // Check if we need to process more batches
    const remainingQuestions = questionsToProcess.length - (batchStart + BATCH_SIZE);
    
    if (remainingQuestions > 0) {
      // Schedule next batch processing
      console.log(`Scheduling next batch: ${remainingQuestions} questions remaining`);
      
      // Call the function recursively for the next batch
      setTimeout(async () => {
        try {
          await processTenderInBackground(
            tenderId, 
            undefined, // No need to pass text again
            undefined, 
            undefined, 
            batchStart + BATCH_SIZE, 
            questionsToProcess // Pass all questions
          );
        } catch (error) {
          console.error('Error processing next batch');
          await supabaseClient
            .from('tenders')
            .update({
              status: 'error',
              error_message: 'Error processing questions batch',
              last_activity_at: new Date().toISOString()
            })
            .eq('id', tenderId);
        }
      }, 1000); // 1 second delay between batches
    } else {
      // All questions processed
      console.log('All questions processed successfully');
      await supabaseClient
        .from('tenders')
        .update({
          status: 'completed',
          processing_stage: 'completed',
          progress: 100,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', tenderId);
    }

  } catch (error) {
    console.error('Error in processTenderInBackground');
    
    if (supabaseClient) {
      await supabaseClient
        .from('tenders')
        .update({
          status: 'error',
          error_message: error.message || 'Unknown processing error',
          last_activity_at: new Date().toISOString()
        })
        .eq('id', tenderId);
    }
    
    throw error;
  }
}

// Generate AI response function
async function generateAIResponse(
  question: string, 
  companyProfile: any, 
  questionType: string,
  memoryContext: string | null,
  researchSnippet: string | null,
  segmentedContent: any | null,
  openAIApiKey: string
): Promise<{ answer: string; model_used: string }> {
  
  // Build context from company profile
  const companyContext = `
Company Name: ${companyProfile.company_name}
Industry: ${companyProfile.industry}
Team Size: ${companyProfile.team_size}
Years in Business: ${companyProfile.years_in_business}
Services Offered: ${companyProfile.services_offered?.join(', ') || 'Not specified'}
Specializations: ${companyProfile.specializations}
Mission: ${companyProfile.mission}
Values: ${companyProfile.values}
Past Projects: ${companyProfile.past_projects}
${companyProfile.policies ? `Policies: ${companyProfile.policies}` : ''}
${companyProfile.accreditations ? `Accreditations: ${companyProfile.accreditations}` : ''}
  `.trim();

  // Build document context from segmented content
  let documentContext = '';
  if (segmentedContent) {
    if (segmentedContent.context && segmentedContent.context.length > 0) {
      documentContext += `\nTENDER BACKGROUND & CONTEXT:\n${segmentedContent.context.join('\n\n')}\n`;
    }
    if (segmentedContent.instructions && segmentedContent.instructions.length > 0) {
      documentContext += `\nSUBMISSION INSTRUCTIONS & REQUIREMENTS:\n${segmentedContent.instructions.join('\n\n')}\n`;
    }
  }

  // Build the full prompt
  let systemPrompt = `You are an expert tender response writer for ${companyProfile.company_name}. Write professional, detailed responses that showcase the company's capabilities and experience.

COMPANY INFORMATION:
${companyContext}${documentContext}

RESPONSE GUIDELINES:
- Write in first person plural ("we", "our company")
- Be specific and detailed, using company information provided
- Show expertise and experience
- Address compliance and regulatory requirements when relevant
- Use professional business language
- Structure responses clearly with headings when appropriate
- Keep responses focused and relevant to the question
- Ensure responses align with any submission instructions provided above`;

  if (questionType === 'closed') {
    systemPrompt += `
- This is a Yes/No or factual question - provide a direct answer first, then elaborate briefly
- Keep the response concise but informative`;
  } else {
    systemPrompt += `
- This is an open-ended question requiring detailed explanation
- Provide comprehensive information showing your expertise
- Include specific examples and methodologies where relevant`;
  }

  let userPrompt = `Question: ${question}

Please provide a professional tender response.`;

  // Add memory context if available
  if (memoryContext) {
    userPrompt += `

RELEVANT PREVIOUS RESPONSES (for reference):
${memoryContext}

Please use these previous responses as reference but ensure your answer is specifically tailored to the current question.`;
  }

  // Add research context if available
  if (researchSnippet) {
    userPrompt += `

ADDITIONAL RESEARCH CONTEXT:
${researchSnippet}

Please incorporate relevant information from this research into your response where appropriate.`;
  }

  try {
    // Use GPT-4o-mini for reliable results
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: questionType === 'closed' ? 500 : 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error');
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiAnswer = data.choices[0]?.message?.content || 'Unable to generate response';

    return {
      answer: aiAnswer,
      model_used: 'gpt-4o-mini'
    };

  } catch (error) {
    console.error('Error generating AI response');
    return {
      answer: 'Error generating response. Please provide a manual answer for this question.',
      model_used: 'error'
    };
  }
}

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
    console.log('Fetching research snippet');
    
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
      console.error('Perplexity API error');
      return null;
    }
    
    const data = await response.json();
    const researchText = data.choices[0]?.message?.content;
    
    if (!researchText) {
      console.log('No research content received from Perplexity');
      return null;
    }
    
    console.log('Research snippet fetched successfully');
    return researchText;
    
  } catch (error) {
    console.error('Error fetching research snippet');
    return null;
  }
}

// Function to retrieve relevant memory using vector similarity
async function fetchRelevantMemory(question: string, companyProfileId: string, supabaseClient: any, openAIApiKey: string): Promise<string | null> {
  try {
    console.log('Fetching relevant memory');
    
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
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('Failed to generate embedding');
      return null;
    }

    const embeddingData = await embeddingResponse.json();
    const questionEmbedding = embeddingData.data[0].embedding;

    // Search for similar questions in memory
    const { data: memoryResults, error: memoryError } = await supabaseClient
      .rpc('match_qa_memory', {
        query_embedding: questionEmbedding,
        company_id: companyProfileId,
        match_threshold: 0.8,
        match_count: 3
      });

    if (memoryError) {
      console.error('Error fetching memory');
      return null;
    }

    if (!memoryResults || memoryResults.length === 0) {
      console.log('No relevant memory found');
      return null;
    }

    console.log(`Found ${memoryResults.length} relevant memory entries`);
    
    // Format the memory for inclusion in the prompt
    const memoryContext = memoryResults.map((memory: any, index: number) => 
      `${index + 1}. Similar Question: "${memory.question}"\n   Previous Answer: "${memory.answer}"\n   (Similarity: ${(memory.similarity * 100).toFixed(1)}%, Used ${memory.usage_count} times)`
    ).join('\n\n');

    return memoryContext;
  } catch (error) {
    console.error('Error fetching relevant memory');
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user ID from JWT for rate limiting
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract user ID from JWT (simplified - in production use proper JWT validation)
    const token = authHeader.replace('Bearer ', '');
    let userId = 'anonymous';
    
    try {
      // Decode JWT payload (Note: This is basic decoding, not verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || 'anonymous';
    } catch {
      // If JWT decode fails, use anonymous but still allow processing
      userId = 'anonymous';
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Maximum 10 requests per hour.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData = await req.json() as ProcessTenderRequest;
    
    // Input validation
    if (!requestData.tenderId || !validateTenderId(requestData.tenderId)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing tender ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing tender: ${requestData.tenderId}`);

    // Start background processing (don't wait for completion)
    processTenderInBackground(
      requestData.tenderId,
      requestData.extractedText,
      requestData.extractedTextPath,
      requestData.filePath,
      requestData.batchStart || 0,
      requestData.questions
    ).catch(error => {
      console.error('Background processing failed:', error);
    });

    // Return immediate response
    return new Response(JSON.stringify({ 
      message: 'Tender processing started successfully',
      tenderId: requestData.tenderId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in serve handler:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});