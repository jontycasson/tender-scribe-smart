import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Save, Check, X, Building2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";

interface Question {
  id: string;
  question: string;
  ai_generated_answer: string;
  user_edited_answer?: string;
  is_approved: boolean;
}

const NewTender = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tenderId, setTenderId] = useState<string | null>(null);
  const [tenderTitle, setTenderTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

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
      
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        toast({
          title: "File selected",
          description: `${selectedFile.name} is ready to upload.`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, DOCX, or XLSX file.",
          variant: "destructive",
        });
      }
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
    
    try {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      console.log('Uploading file with name:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tender-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Create tender record
      const tenderRecord = {
        user_id: user.id,
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
      setCurrentStep('review');
      
      // Process document with AI and generate responses
      await processDocument(tenderData.id, uploadData.path);

    } catch (error) {
      console.error('Upload and process error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload tender document. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('upload'); // Reset to upload step on error
    } finally {
      setUploading(false);
    }
  };

  const processDocument = async (tenderId: string, filePath: string) => {
    console.log('Starting document processing for tender:', tenderId, 'file:', filePath);
    setProcessing(true);
    
    try {
      // Call edge function to process document
      console.log('Calling process-tender edge function...');
      const { data, error } = await supabase.functions.invoke('process-tender', {
        body: { tenderId, filePath }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Edge function response:', data);

      // Wait a moment for the database to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the generated questions and responses
      console.log('Fetching tender responses...');
      const { data: responsesData, error: responsesError } = await supabase
        .from('tender_responses')
        .select('*')
        .eq('tender_id', tenderId);

      if (responsesError) {
        console.error('Response fetch error:', responsesError);
        throw responsesError;
      }

      console.log('Fetched responses:', responsesData);
      setQuestions(responsesData || []);
      
      toast({
        title: "Document processed",
        description: `Generated ${responsesData?.length || 0} AI responses. Please review and edit as needed.`,
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed", 
        description: error.message || "Failed to process document. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('upload'); // Reset to upload step on error
    } finally {
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

      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, is_approved: true } : q
      ));

      toast({
        title: "Response approved",
        description: "Response has been approved.",
      });
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  const exportResponses = async (format: 'docx' | 'pdf' | 'xlsx') => {
    if (!tenderId) return;

    try {
      const { data, error } = await supabase.functions.invoke('export-tender', {
        body: { tenderId, format }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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
      <Navigation />
      
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

                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Click to upload your tender document</p>
                    <p className="text-muted-foreground">
                      Supports PDF, DOCX, and XLSX files up to 10MB
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

                <Button
                  onClick={uploadAndProcessTender}
                  disabled={!file || uploading || processing}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </div>
                  ) : processing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Upload and Process"
                  )}
                </Button>
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
                <Button onClick={() => exportResponses('docx')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export DOCX
                </Button>
                <Button onClick={() => exportResponses('pdf')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={() => exportResponses('xlsx')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export XLSX
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
                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">Question {index + 1}</CardTitle>
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
                ))}
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
                  <Button onClick={() => exportResponses('pdf')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Final PDF
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