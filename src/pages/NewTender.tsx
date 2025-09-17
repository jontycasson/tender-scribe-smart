import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProcessingProgress } from "@/components/ui/processing-progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Save, Check, X, Building2, ArrowLeft, ChevronLeft, ChevronRight, Plus, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

// Utility to safely normalize error messages
const toErrMsg = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
};

interface Question {
  id: string;
  question: string;
  ai_generated_answer: string;
  user_edited_answer?: string;
  is_approved: boolean;
}

const processingStages = [
  {
    id: "uploading",
    label: "Uploading file",
    description: "Securely uploading your tender document to our servers"
  },
  {
    id: "extracting",
    label: "Extracting text",
    description: "Using advanced OCR to extract text from your document"
  },
  {
    id: "segmenting",
    label: "Segmenting content",
    description: "Categorizing content into context, instructions, and questions"
  },
  {
    id: "identifying",
    label: "Identifying questions",
    description: "Analyzing document structure to find vendor response items"
  },
  {
    id: "generating",
    label: "Generating responses",
    description: "Creating AI-powered responses using your company profile and document context"
  }
];

const MAX_INLINE_TEXT_BYTES = 400 * 1024; // 400KB threshold for inline text

const NewTender = () => {
  console.log('NewTender component mounting');
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentProcessingStage, setCurrentProcessingStage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [tenderId, setTenderId] = useState<string | null>(null);
  const [tenderTitle, setTenderTitle] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', client_name: '', description: '' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [currentPage, setCurrentPage] = useState(1);
  const [contentPreview, setContentPreview] = useState<{
    totalQuestions: number;
    sampleQuestions: string[];
    segmentCounts: {
      context: number;
      instructions: number; 
      questions: number;
      other: number;
    };
  } | null>(null);
  const questionsPerPage = 5;
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper function to extract text from supported file types
  const extractTextIfSupported = async (file: File): Promise<string | null> => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    try {
      // Handle DOCX files
      if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          fileName.endsWith('.docx')) {
        const mammoth = await import('mammoth/mammoth.browser');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return result.value || null;
      }
      
      // Handle XLSX files
      if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          fileName.endsWith('.xlsx')) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        
        let allText = '';
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          if (sheet) {
            // Add sheet name as header
            allText += `\n=== ${sheetName} ===\n`;
            
            // Convert sheet to JSON to preserve table structure
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            // Format as table with preserved structure
            jsonData.forEach((row: any[]) => {
              if (row.some(cell => cell !== '')) {
                allText += row.join(' | ') + '\n';
              }
            });
          }
        });
        
        return allText.trim() || null;
      }
      
      // Handle plain text files
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await file.text();
      }
      
      // Handle RTF files (basic implementation)
      if (fileType === 'application/rtf' || fileName.endsWith('.rtf')) {
        const text = await file.text();
        // Simple RTF tag stripping - remove everything between { and }
        const plainText = text.replace(/\{[^}]*\}/g, '').replace(/\\/g, '').trim();
        return plainText || null;
      }
      
      // For other file types, return null to indicate OCR should be used
      return null;
    } catch (error) {
      console.error('Error extracting text from file:', error);
      return null;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      console.log('File selected:', { 
        name: selectedFile.name, 
        size: selectedFile.size, 
        type: selectedFile.type 
      });
      
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate MIME types - allow common document formats
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/msword', // .doc
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-powerpoint', // .ppt
        'text/plain', // .txt
        'application/rtf', // .rtf
        'text/csv', // .csv
        'application/zip', // .zip
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/tiff'
      ];

      if (selectedFile.type && !allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, Word document, Excel file, or other supported document format.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      toast({
        title: "File selected",
        description: `${selectedFile.name} is ready to upload.`,
      });
    }
  };

  // Mount logging and auth check
  useEffect(() => {
    console.log('NewTender mounted:', { 
      hasUser: !!user, 
      userId: user?.id, 
      currentStep, 
      processing,
      hasFile: !!file 
    });
  }, []);

  // Fetch projects on component mount
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!companyProfile) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_profile_id', companyProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!companyProfile) {
        toast({
          title: "Company profile required",
          description: "Please complete your company profile first",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...newProject,
          company_profile_id: companyProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      setSelectedProject(data.id);
      setNewProject({ name: '', client_name: '', description: '' });
      setShowCreateProject(false);
      
      toast({
        title: "Project created",
        description: `Project "${data.name}" has been created successfully`,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const uploadAndProcessTender = async () => {
    console.log('Upload attempt:', { 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size,
      hasUser: !!user, 
      userId: user?.id 
    });

    if (!file) {
      console.error('No file selected');
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      console.error('User not authenticated');
      toast({
        title: "Authentication required",
        description: "Please log in to upload files.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    console.log('Starting upload and process for file:', file.name);
    setUploading(true);
    setProcessing(true);
    setCurrentProcessingStage(0);
    setProcessingProgress(10);
    setProcessingError(null);
    
    try {
      // Try to extract text from file if supported
      const extractedText = await extractTextIfSupported(file);
      console.log('Text extraction result:', { 
        hasExtractedText: !!extractedText, 
        textLength: extractedText?.length || 0 
      });

      // Get company profile for secure file path
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!companyProfile) {
        toast({
          title: "Company profile required",
          description: "Please complete your company profile first.",
          variant: "destructive",
        });
        navigate('/onboarding');
        return;
      }

      // Sanitize filename and create company-scoped path
      const { data: sanitizedName } = await supabase
        .rpc('sanitize_filename', { original_name: file.name });
      
      const timestamp = Date.now();
      const fileName = `${companyProfile.id}/${timestamp}-${sanitizedName || file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      
      console.log('Uploading file with secure path:', fileName);
      setProcessingProgress(25);

      // Log upload attempt for security monitoring
      const uploadLog = {
        user_id: user.id,
        company_profile_id: companyProfile.id,
        original_filename: file.name,
        sanitized_filename: fileName,
        file_size: file.size,
        mime_type: file.type || 'unknown',
        ip_address: 'client', // Client-side upload
        user_agent: navigator.userAgent.substring(0, 200)
      };
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tender-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);
      
      // Log successful upload
      await supabase
        .from('file_upload_logs')
        .insert({ ...uploadLog, upload_success: true });
        
      setProcessingProgress(40);

      // Handle large extracted text by uploading to storage
      let extractedTextPath: string | undefined;
      let inlineText: string | undefined;

      if (extractedText) {
        const textSize = new Blob([extractedText]).size;
        console.log(`Extracted text size: ${textSize} bytes`);

        if (textSize > MAX_INLINE_TEXT_BYTES) {
          // Upload extracted text to storage as a separate file
          const textFileName = `${uploadData.path}.txt`;
          console.log('Text too large, uploading to storage as:', textFileName);
          
          const { error: textUploadError } = await supabase.storage
            .from('tender-documents')
            .upload(textFileName, new Blob([extractedText], { type: 'text/plain' }), {
              upsert: true
            });

          if (textUploadError) {
            console.error('Failed to upload extracted text:', textUploadError);
            // Fall back to inline text despite size
            inlineText = extractedText;
          } else {
            extractedTextPath = textFileName;
            console.log('Successfully uploaded extracted text to storage');
          }
        } else {
          inlineText = extractedText;
        }
      }
      
      // Skip to stage 2 (identifying) if we extracted text, otherwise go to stage 1 (extracting)
      if (inlineText || extractedTextPath) {
        setCurrentProcessingStage(2);
      } else {
        setCurrentProcessingStage(1);
      }

      // Create tender record
      const tenderRecord = {
        user_id: user.id,
        company_profile_id: companyProfile.id,
        project_id: selectedProject || null,
        title: tenderTitle || file.name.replace(/\.[^/.]+$/, ""),
        original_filename: file.name,
        file_url: uploadData.path,
        status: 'processing'
      };
      
      console.log('Creating tender record:', tenderRecord);
      
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .insert(tenderRecord)
        .select()
        .single();

      if (tenderError) {
        console.error('Tender creation error:', tenderError);
        throw tenderError;
      }

      console.log('Tender created successfully:', tenderData);
      setTenderId(tenderData.id);
      setProcessingProgress(50);
      // Don't navigate to review step yet - wait for processing to complete
      
      // Process document with AI and generate responses
      await processDocument(tenderData.id, uploadData.path, inlineText, extractedTextPath);

    } catch (error) {
      console.error('Upload and process error:', error);
      const errorMsg = toErrMsg(error);
      setProcessingError(errorMsg);
      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive",
      });
      setCurrentStep('upload'); // Reset to upload step on error
    } finally {
      setUploading(false);
      // Don't reset processing here as it continues with document processing
    }
  };

  const processDocument = async (tenderId: string, filePath: string, extractedText?: string, extractedTextPath?: string) => {
    console.log('Starting document processing for tender:', tenderId, 'file:', filePath, 'hasInlineText:', !!extractedText, 'hasTextPath:', !!extractedTextPath);
    
    let channelUnsubscribed = false;
    
    // Subscribe to real-time updates for this tender
    const channel = supabase
      .channel('tender-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenders',
          filter: `id=eq.${tenderId}`
        },
        (payload) => {
          console.log('Real-time tender update:', payload.new);
          const tender = payload.new as any;
          
          if (tender.processing_stage) {
            const stageIndex = processingStages.findIndex(s => s.id === tender.processing_stage);
            if (stageIndex >= 0) {
              setCurrentProcessingStage(stageIndex);
            }
          }
          
          if (tender.progress) {
            setProcessingProgress(tender.progress);
          }
          
          if (tender.status === 'completed') {
            // Processing complete, set progress to 100% and fetch responses
            setProcessingProgress(100);
            setProcessing(false);
            setUploading(false);
            setCurrentStep('review');
            fetchTenderResponses(tenderId);
            // Unsubscribe now that we've reached terminal state
            if (!channelUnsubscribed) {
              supabase.removeChannel(channel);
              channelUnsubscribed = true;
            }
          } else if (tender.status === 'error') {
            setProcessingError(tender.error_message || 'Processing failed');
            setProcessing(false);
            setUploading(false);
            // Don't reset to upload step - keep the processing UI with error
            // Unsubscribe on error as well
            if (!channelUnsubscribed) {
              supabase.removeChannel(channel);
              channelUnsubscribed = true;
            }
          }
        }
      )
      .subscribe();
    
    try {
      // Call edge function to process document
      console.log('Calling process-tender edge function...');
      
      const { data, error } = await supabase.functions.invoke('process-tender', {
        body: { tenderId, filePath, extractedText, extractedTextPath }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      // Fallback: Check tender status after edge function completes
      // This handles cases where the real-time update might be missed
      console.log('Edge function completed, checking final status...');
      
      const { data: finalTender, error: fetchError } = await supabase
        .from('tenders')
        .select('status, progress, error_message')
        .eq('id', tenderId)
        .single();
      
      if (!fetchError && finalTender) {
        console.log('Final tender status:', finalTender);
        
        if (finalTender.status === 'draft' && !channelUnsubscribed) {
          // If processing is complete but we haven't navigated yet
          setProcessingProgress(100);
          await fetchTenderResponses(tenderId);
        } else if (finalTender.status === 'error' && !channelUnsubscribed) {
          setProcessingError(finalTender.error_message || 'Processing failed');
          setProcessing(false);
          setCurrentStep('upload');
        }
      }

    } catch (error) {
      console.error('Processing error:', error);
      
      // Extract error details from structured responses
      let errorMessage = 'Processing failed';
      let errorDetails = '';
      
      if (error?.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error_code) {
            errorMessage = parsedError.error;
            errorDetails = parsedError.details || '';
            
            // Show specific error messages based on error code
            switch (parsedError.error_code) {
              case 'docai_config_missing':
                errorMessage = 'Document AI not configured';
                errorDetails = 'Please contact support to set up document processing';
                break;
              case 'docai_processor_missing':
                errorMessage = 'Document processor not configured';
                errorDetails = 'Please contact support to configure the document processor';
                break;
              case 'docai_config_invalid':
                errorMessage = 'Document AI configuration invalid';
                errorDetails = 'Please contact support to fix the configuration';
                break;
              case 'oauth_signing_failed':
                errorMessage = 'Authentication failed';
                errorDetails = 'Unable to authenticate with document processing service';
                break;
              case 'docai_processing_failed':
                errorMessage = 'Document processing failed';
                errorDetails = 'The document could not be processed. Please try a different file';
                break;
              case 'docai_no_text_extracted':
                errorMessage = 'No text found in document';
                errorDetails = 'The document appears to be empty or contains no readable text';
                break;
            }
          } else {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error.message || 'Processing failed';
        }
      }
      
      const displayError = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
      setProcessingError(displayError);
      setCurrentStep('upload');
    } finally {
      // Only unsubscribe if we haven't already
      if (!channelUnsubscribed) {
        supabase.removeChannel(channel);
      }
    }
  };

  const fetchTenderResponses = async (tenderId: string) => {
    try {
      // Fetch both responses and tender details with segmented content
      const [responsesResult, tenderResult] = await Promise.all([
        supabase
          .from('tender_responses')
          .select('*')
          .eq('tender_id', tenderId)
          .order('question_index', { ascending: true }),
        supabase
          .from('tenders')
          .select('total_questions, content_segments_count, extracted_questions, extracted_context, extracted_instructions, extracted_other')
          .eq('id', tenderId)
          .single()
      ]);

      if (responsesResult.error) throw responsesResult.error;
      if (tenderResult.error) throw tenderResult.error;
      
      const responsesData = responsesResult.data || [];
      const tenderData = tenderResult.data;
      
      setQuestions(responsesData);
      
      // Set content preview if segmented content is available
      if (tenderData) {
        const sampleQuestions = responsesData.slice(0, 3).map(r => r.question);
        
        setContentPreview({
          totalQuestions: tenderData.total_questions || responsesData.length,
          sampleQuestions,
          segmentCounts: {
            context: Array.isArray(tenderData.extracted_context) ? tenderData.extracted_context.length : 0,
            instructions: Array.isArray(tenderData.extracted_instructions) ? tenderData.extracted_instructions.length : 0,
            questions: Array.isArray(tenderData.extracted_questions) ? tenderData.extracted_questions.length : 0,
            other: Array.isArray(tenderData.extracted_other) ? tenderData.extracted_other.length : 0
          }
        });
      }
      
      setCurrentStep('review');
      setProcessing(false);
      
      toast({
        title: "Document processed",
        description: `Generated ${responsesData.length} AI responses. Context and instructions extracted to improve response quality.`,
      });
    } catch (error) {
      console.error('Response fetch error:', error);
      setProcessingError(toErrMsg(error));
      setCurrentStep('upload');
      setProcessing(false);
    }
  };

  const updateResponse = async (questionId: string, newAnswer: string) => {
    try {
      const { error } = await supabase
        .from('tender_responses')
        .update({ 
          user_edited_answer: newAnswer,
          is_approved: false 
        })
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, user_edited_answer: newAnswer, is_approved: false }
          : q
      ));
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Update failed",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  const approveResponse = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('tender_responses')
        .update({ is_approved: true })
        .eq('id', questionId);

      if (error) throw error;

      const question = questions.find(q => q.id === questionId);
      if (question) {
        // Upsert to memory when response is approved
        try {
          const finalAnswer = question.user_edited_answer || question.ai_generated_answer;
          await supabase.functions.invoke('upsert-memory', {
            body: { 
              question: question.question,
              answer: finalAnswer,
              sourceResponseId: questionId
            }
          });
          console.log('Successfully upserted to memory:', question.question.substring(0, 50));
        } catch (memoryError) {
          console.error('Failed to upsert to memory:', memoryError);
          // Don't fail the approval if memory upsert fails
        }
      }

      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, is_approved: true } : q
      ));

      toast({
        title: "Response approved",
        description: "Response has been approved and saved to company memory.",
      });
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Approval failed",
        description: "Failed to approve response.",
        variant: "destructive",
      });
    }
  };

  const exportResponses = async (format: 'rtf' | 'txt' | 'csv') => {
    if (!tenderId) return;

    try {
      const { data, error } = await supabase.functions.invoke('export-tender', {
        body: { tenderId, format }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { 
        type: format === 'txt' ? 'text/plain' : 
              format === 'rtf' ? 'application/rtf' :
              'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tender-response.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Tender response exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const finalizeTender = async () => {
    if (!tenderId) return;

    try {
      const { error } = await supabase
        .from('tenders')
        .update({ status: 'completed' })
        .eq('id', tenderId);

      if (error) throw error;

      setCurrentStep('complete');
      toast({
        title: "Tender completed",
        description: "Your tender response has been finalized.",
      });
    } catch (error) {
      console.error('Finalize error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Loading skeleton for initial render */}
      {!user && (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      
      <ErrorBoundary fallback={<div className="p-2 text-sm text-muted-foreground">Navigation temporarily unavailable</div>}>
        <Navigation />
      </ErrorBoundary>
      
      {/* Progress indicators */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(user ? '/dashboard' : '/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {user ? 'Back to Dashboard' : 'Back to Home'}
            </Button>
            <div className="flex items-center space-x-2">
              <Badge variant={currentStep === 'upload' ? 'default' : 'secondary'}>Upload</Badge>
              <Badge variant={currentStep === 'review' ? 'default' : 'secondary'}>Review</Badge>
              <Badge variant={currentStep === 'complete' ? 'default' : 'secondary'}>Complete</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentStep === 'upload' && (
          <div className="max-w-2xl mx-auto">
            {!user && (
              <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        Authentication Required
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-300">
                        Please log in to upload and process tender documents.
                      </p>
                    </div>
                    <Button onClick={() => navigate('/auth')} variant="outline">
                      Log In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Upload Tender Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Tender Title (Optional)</Label>
                  <Input
                    id="title"
                    value={tenderTitle}
                    onChange={(e) => setTenderTitle(e.target.value)}
                    placeholder="Enter a descriptive title for this tender"
                  />
                </div>

                {/* Project Selection */}
                <div>
                  <Label>Assign to Project (Optional)</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProject} onValueChange={(v) => setSelectedProject(v === "__unassigned" ? "" : v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a project or leave unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned">No Project (Unassigned)</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                            {project.client_name && ` • ${project.client_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Project</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                              id="project-name"
                              value={newProject.name}
                              onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. City Council Infrastructure Upgrade"
                            />
                          </div>
                          <div>
                            <Label htmlFor="client-name">Client Name</Label>
                            <Input
                              id="client-name"
                              value={newProject.client_name}
                              onChange={(e) => setNewProject(prev => ({ ...prev, client_name: e.target.value }))}
                              placeholder="e.g. Manchester City Council"
                            />
                          </div>
                          <div>
                            <Label htmlFor="project-description">Description (Optional)</Label>
                            <Textarea
                              id="project-description"
                              value={newProject.description}
                              onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Brief description of the project..."
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                              Cancel
                            </Button>
                            <Button onClick={createProject}>
                              Create & Assign
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Group related tender documents together by project
                  </p>
                </div>

                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Click to upload your tender document</p>
                    <p className="text-muted-foreground">
                      Supports all file types up to 10MB. Text extraction available for DOCX, TXT, and RTF files.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="mt-4 pointer-events-none">
                    Choose File
                  </Button>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {file.size < 1024 * 1024 
                            ? `${(file.size / 1024).toFixed(1)} KB` 
                            : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setFile(null)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {!processing ? (
                  <Button
                    onClick={uploadAndProcessTender}
                    disabled={!file || uploading}
                    className="w-full"
                    size="lg"
                  >
                    Upload and Process
                  </Button>
                ) : (
                  <div className="space-y-6">
                    <ProcessingProgress
                      stages={processingStages}
                      currentStageIndex={currentProcessingStage}
                      progress={processingProgress}
                      isComplete={processingProgress === 100}
                      error={processingError}
                    />
                    {processingError && (
                      <Button
                        onClick={() => {
                          setProcessing(false);
                          setProcessingError(null);
                          setProcessingProgress(0);
                          setCurrentProcessingStage(0);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Review AI-Generated Responses</h2>
                <p className="text-muted-foreground">
                  {processing ? "Processing document..." : "Review and edit the AI-generated responses below"}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => exportResponses('rtf')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export RTF
                </Button>
                <Button onClick={() => exportResponses('txt')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export TXT
                </Button>
                <Button onClick={() => exportResponses('csv')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={finalizeTender} disabled={questions.some(q => !q.is_approved)}>
                  <Save className="h-4 w-4 mr-2" />
                  Finalize Tender
                </Button>
              </div>
            </div>

            {processing ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Processing document and generating responses...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Content Preview Summary */}
                {contentPreview && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Document Analysis Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{contentPreview.totalQuestions}</div>
                          <div className="text-sm text-muted-foreground">Questions Detected</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{contentPreview.segmentCounts.context}</div>
                          <div className="text-sm text-muted-foreground">Context Items</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{contentPreview.segmentCounts.instructions}</div>
                          <div className="text-sm text-muted-foreground">Instructions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{contentPreview.segmentCounts.other}</div>
                          <div className="text-sm text-muted-foreground">Other Content</div>
                        </div>
                      </div>
                      
                      {contentPreview.sampleQuestions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Sample Questions:</h4>
                          <ul className="space-y-1">
                            {contentPreview.sampleQuestions.map((q, i) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                {i + 1}. {q.length > 100 ? `${q.substring(0, 100)}...` : q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-muted-foreground">
                        ✨ Context and instructions extracted to improve AI-generated response quality
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {questions.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">
                        Total Questions: {questions.length}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm text-muted-foreground">
                        Approved: {questions.filter(q => q.is_approved).length}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Pending: {questions.filter(q => !q.is_approved).length}
                      </span>
                    </div>
                    {questions.length > questionsPerPage && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          Page {currentPage} of {Math.ceil(questions.length / questionsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(Math.ceil(questions.length / questionsPerPage), currentPage + 1))}
                          disabled={currentPage === Math.ceil(questions.length / questionsPerPage)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {(() => {
                  const startIndex = (currentPage - 1) * questionsPerPage;
                  const endIndex = startIndex + questionsPerPage;
                  const currentQuestions = questions.slice(startIndex, endIndex);
                  
                  return currentQuestions.map((question, index) => {
                    const globalIndex = startIndex + index + 1;
                    return (
                      <Card key={question.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">Question {globalIndex}</CardTitle>
                            <Badge variant={question.is_approved ? "default" : "secondary"}>
                              {question.is_approved ? "Approved" : "Pending Review"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Question</Label>
                            <p className="mt-1 p-3 bg-muted rounded-md">{question.question}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">AI Generated Response</Label>
                            <p className="mt-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md text-sm">
                              {question.ai_generated_answer}
                            </p>
                          </div>

                          <div>
                            <Label htmlFor={`answer-${question.id}`}>Your Response</Label>
                            <Textarea
                              id={`answer-${question.id}`}
                              value={question.user_edited_answer || question.ai_generated_answer}
                              onChange={(e) => updateResponse(question.id, e.target.value)}
                              rows={4}
                              className="mt-1"
                            />
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              onClick={() => approveResponse(question.id)}
                              disabled={question.is_approved}
                              size="sm"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {question.is_approved ? "Approved" : "Approve Response"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="py-8">
                <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Tender Response Complete!</h2>
                <p className="text-muted-foreground mb-6">
                  Your tender response has been finalized and is ready for submission.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => navigate('/dashboard')}>
                    Return to Dashboard
                  </Button>
                  <Button onClick={() => exportResponses('txt')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Final TXT
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewTender;