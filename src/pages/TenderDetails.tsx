import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Calendar, Download, ChevronLeft, ChevronRight, CheckCircle, Trash2, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

interface Tender {
  id: string;
  title: string;
  status: string;
  value: number | null;
  deadline: string | null;
  created_at: string;
  file_url: string;
  original_filename: string;
}

interface TenderResponse {
  id: string;
  question: string;
  ai_generated_answer: string | null;
  user_edited_answer: string | null;
  is_approved: boolean | null;
}

const TenderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [responses, setResponses] = useState<TenderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editedAnswers, setEditedAnswers] = useState<{ [key: string]: string }>({});
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const responsesPerPage = 5;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user && id) {
      fetchTenderDetails();
    }
  }, [user, authLoading, id, navigate]);

  const fetchTenderDetails = async () => {
    try {
      // Fetch tender details
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (tenderError) throw tenderError;
      setTender(tenderData);

      // Fetch tender responses - maintain original document order
      const { data: responsesData, error: responsesError } = await supabase
        .from('tender_responses')
        .select('*')
        .eq('tender_id', id)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (error) {
      console.error('Error fetching tender details:', error);
      toast({
        title: "Error",
        description: "Failed to load tender details",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "draft":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "uploaded":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "draft": return "Draft";
      case "processing": return "Processing";
      case "uploaded": return "Uploaded";
      default: return status;
    }
  };

  const handleDownload = async () => {
    if (!tender) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('tender-documents')
        .download(tender.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = tender.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleEditResponse = (responseId: string, currentAnswer: string) => {
    setEditingResponse(responseId);
    setEditedAnswers(prev => ({
      ...prev,
      [responseId]: currentAnswer
    }));
  };

  const handleSaveResponse = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from('tender_responses')
        .update({ 
          user_edited_answer: editedAnswers[responseId],
          is_approved: true 
        })
        .eq('id', responseId);

      if (error) throw error;

      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { 
              ...response, 
              user_edited_answer: editedAnswers[responseId],
              is_approved: true 
            }
          : response
      ));
      
      setEditingResponse(null);
      toast({
        title: "Success",
        description: "Response updated successfully",
      });
    } catch (error) {
      console.error('Error updating response:', error);
      toast({
        title: "Error",
        description: "Failed to update response",
        variant: "destructive",
      });
    }
  };

  const handleAcceptAllResponses = async () => {
    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('tender_responses')
        .update({ is_approved: true })
        .eq('tender_id', id);

      if (error) throw error;

      setResponses(prev => prev.map(response => ({ ...response, is_approved: true })));
      toast({
        title: "Success",
        description: "All responses approved successfully",
      });
    } catch (error) {
      console.error('Error approving all responses:', error);
      toast({
        title: "Error",
        description: "Failed to approve all responses",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteTender = async () => {
    if (!tender || !window.confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('tender-documents')
        .remove([tender.file_url]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete tender responses
      const { error: responsesError } = await supabase
        .from('tender_responses')
        .delete()
        .eq('tender_id', id);

      if (responsesError) throw responsesError;

      // Delete tender
      const { error: tenderError } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (tenderError) throw tenderError;

      toast({
        title: "Success",
        description: "Tender deleted successfully",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting tender:', error);
      toast({
        title: "Error",
        description: "Failed to delete tender",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (format: 'PDF' | 'DOCX' | 'XLSX') => {
    if (!tender) return;
    
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-tender', {
        body: {
          tenderId: tender.id,
          format: format
        }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { 
        type: format === 'PDF' ? 'application/pdf' : 
              format === 'DOCX' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tender.title}_responses.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Export completed successfully`,
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: "Error",
        description: "Failed to export responses",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFilePreviewUrl = (fileUrl: string) => {
    const { data } = supabase.storage
      .from('tender-documents')
      .getPublicUrl(fileUrl);
    return data.publicUrl;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <p>Tender not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(responses.length / responsesPerPage);
  const startIndex = (currentPage - 1) * responsesPerPage;
  const endIndex = startIndex + responsesPerPage;
  const currentResponses = responses.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{tender.title}</h1>
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(tender.status)}>
                  {getStatusDisplay(tender.status)}
                </Badge>
                <span className="text-muted-foreground">
                  Created {formatDate(tender.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="responses">Questions & Responses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tender Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{tender.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(tender.status)}>
                      {getStatusDisplay(tender.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="font-medium">{tender.value ? `$${tender.value}` : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {tender.deadline ? formatDate(tender.deadline) : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(tender.created_at)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Original Filename</p>
                      <p className="font-medium">{tender.original_filename}</p>
                    </div>
                    <Button onClick={handleDownload} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="document">
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{tender.original_filename}</p>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  {tender.original_filename.toLowerCase().endsWith('.pdf') ? (
                    <div className="border rounded-lg">
                      <iframe
                        src={getFilePreviewUrl(tender.file_url)}
                        className="w-full h-[600px] rounded-lg"
                        title="Document Preview"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Preview not available for this file type. Please download to view.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Questions & Responses</h3>
                <div className="flex items-center gap-4">
                  <p className="text-muted-foreground">
                    {responses.length} questions total
                  </p>
                  {responses.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAcceptAllResponses}
                        disabled={isApproving}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isApproving ? 'Approving...' : 'Accept All AI Responses'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('PDF')}
                        disabled={isExporting}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('DOCX')}
                        disabled={isExporting}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Export DOCX
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('XLSX')}
                        disabled={isExporting}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Export XLSX
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteTender}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete Tender'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {responses.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No responses generated yet</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentResponses.map((response, index) => (
                      <Card key={response.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                Question {startIndex + index + 1}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-2">
                                {response.question}
                              </p>
                            </div>
                            {response.is_approved && (
                              <Badge variant="secondary" className="ml-2">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editingResponse === response.id ? (
                            <div className="space-y-4">
                              <Textarea
                                value={editedAnswers[response.id] || ''}
                                onChange={(e) => setEditedAnswers(prev => ({
                                  ...prev,
                                  [response.id]: e.target.value
                                }))}
                                className="min-h-[120px]"
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleSaveResponse(response.id)}
                                >
                                  Save
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setEditingResponse(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Response:</p>
                                <p className="text-sm">
                                  {response.user_edited_answer || response.ai_generated_answer || 'No response generated'}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditResponse(
                                  response.id, 
                                  response.user_edited_answer || response.ai_generated_answer || ''
                                )}
                              >
                                Edit Response
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TenderDetails;