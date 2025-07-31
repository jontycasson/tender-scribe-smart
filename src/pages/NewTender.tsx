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
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
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
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tender-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create tender record
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .insert({
          user_id: user.id,
          title: tenderTitle || file.name.replace(/\.[^/.]+$/, ""),
          original_filename: file.name,
          file_url: uploadData.path,
          status: 'processing'
        })
        .select()
        .single();

      if (tenderError) throw tenderError;

      setTenderId(tenderData.id);
      setCurrentStep('review');
      
      // Process document with Nanonets and generate responses
      await processDocument(tenderData.id, uploadData.path);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload tender document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const processDocument = async (tenderId: string, filePath: string) => {
    setProcessing(true);
    try {
      // Call edge function to process document
      const { data, error } = await supabase.functions.invoke('process-tender', {
        body: { tenderId, filePath }
      });

      if (error) throw error;

      // Fetch the generated questions and responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('tender_responses')
        .select('*')
        .eq('tender_id', tenderId);

      if (responsesError) throw responsesError;

      setQuestions(responsesData || []);
      
      toast({
        title: "Document processed",
        description: "AI responses have been generated. Please review and edit as needed.",
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: "Failed to process document. Please try again.",
        variant: "destructive",
      });
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">New Tender Response</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={currentStep === 'upload' ? 'default' : 'secondary'}>Upload</Badge>
              <Badge variant={currentStep === 'review' ? 'default' : 'secondary'}>Review</Badge>
              <Badge variant={currentStep === 'complete' ? 'default' : 'secondary'}>Complete</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentStep === 'upload' && (
          <div className="max-w-2xl mx-auto">
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

                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Upload your tender document</p>
                    <p className="text-muted-foreground">
                      Supports PDF, DOCX, and XLSX files up to 10MB
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.xlsx"
                    onChange={handleFileSelect}
                    className="mt-4"
                  />
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
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
                  disabled={!file || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? "Uploading..." : "Upload and Process"}
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