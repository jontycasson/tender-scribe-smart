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

    // Update response with success
    response.success = true;
    response.rawText = rawText;
    response.status = 'extracted';
    response.message = `Successfully extracted ${rawText.length} characters of text`;

    console.log(`Successfully extracted ${rawText.length} characters from tender ${request.tenderId}`);
    
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