import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { ProcessingProgress } from "@/components/ui/processing-progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from 'date-fns';
import { ExportButton } from '@/components/ExportButton';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button as ShadButton } from "@/components/ui/button"
import { cn as shadCn } from "@/lib/utils"
import { useToast as useShadToast } from "@/hooks/use-toast"

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
type Tender = Database['public']['Tables']['tenders']['Row'];
type TenderResponse = Database['public']['Tables']['tender_responses']['Row'];

const TenderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data: tender, isLoading: tenderLoading } = useQuery({
    queryKey: ['tender', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Real-time subscription for tender updates
  useEffect(() => {
    if (!tender?.id) return;

    const channel = supabase
      .channel(`tender-${tender.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenders',
          filter: `id=eq.${tender.id}`
        },
        (payload) => {
          console.log('Real-time tender update:', payload);
          queryClient.setQueryData(['tender', id], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tender?.id, queryClient, id]);

  // Generate signed URL for document preview
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!tender?.file_url) return;
      
      try {
        const { data, error } = await supabase.storage
          .from('tender-documents')
          .createSignedUrl(tender.file_url, 3600); // 1 hour expiry
        
        if (error) throw error;
        setPreviewUrl(data.signedUrl);
        setPreviewError(null);
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setPreviewError('Failed to load document preview');
        setPreviewUrl(null);
      }
    };
    
    generateSignedUrl();
  }, [tender?.file_url]);

  const { data: responses, isLoading: responsesLoading, refetch: refetchResponses } = useQuery({
    queryKey: ['tender-responses', tender?.id],
    queryFn: async () => {
      if (!tender?.id) return [];
      const { data, error } = await supabase
        .from('tender_responses')
        .select('*')
        .eq('tender_id', tender.id)
        .order('question_index', { ascending: true }); // Order by question_index instead of created_at
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tender?.id,
  });

  const updateResponse = async (responseId: string, updatedAnswer: string | null) => {
    const { error } = await supabase
      .from('tender_responses')
      .update({ user_edited_answer: updatedAnswer, is_approved: false })
      .eq('id', responseId);

    if (error) {
      console.error("Error updating response:", error);
      throw new Error("Failed to update response");
    }
  };

  const approveResponse = async (responseId: string, isApproved: boolean) => {
    const { error } = await supabase
      .from('tender_responses')
      .update({ is_approved: isApproved })
      .eq('id', responseId);

    if (error) {
      console.error("Error approving response:", error);
      throw new Error("Failed to approve response");
    }
  };

  const regenerateResponseMutation = async (responseId: string) => {
    const { data, error } = await supabase.functions.invoke('regenerate-response', {
      body: { responseId }
    });

    if (error) {
      console.error("Function invoke error:", error);
      throw new Error("Failed to regenerate response");
    }

    if (data.error) {
      console.error("Regenerate response error:", data.error);
      throw new Error(data.error);
    }

    return data;
  };

  const approveMutation = useMutation({
    mutationFn: ({ responseId, isApproved }: { responseId: string, isApproved: boolean }) => 
      approveResponse(responseId, isApproved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-responses', tender?.id] });
      toast({
        title: "Response status updated.",
        description: "The response has been updated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      })
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ responseId, updatedAnswer }: { responseId: string, updatedAnswer: string | null }) => 
      updateResponse(responseId, updatedAnswer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-responses', tender?.id] });
      toast({
        title: "Response updated.",
        description: "The response has been updated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      })
    },
  });

  const regenerateResponse = useMutation({
    mutationFn: async (responseId: string) => {
      setIsGenerating(responseId);
      const { data, error } = await supabase.functions.invoke('regenerate-response', {
        body: { responseId }
      });
      
      if (error) {
        console.error("Regenerate function error:", error);
        throw new Error(error.message || "Failed to regenerate response");
      }
      
      if (data?.error) {
        console.error("Regenerate response error:", data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      setIsGenerating(null);
      queryClient.invalidateQueries({ queryKey: ['tender-responses', tender?.id] });
      toast({
        title: "Response regenerated",
        description: "The AI response has been updated successfully.",
      });
    },
    onError: (error: any) => {
      setIsGenerating(null);
      toast({
        title: "Error regenerating response",
        description: error.message || "Failed to regenerate response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rewriteResponse = useMutation({
    mutationFn: async ({ responseId, mode }: { responseId: string; mode: string }) => {
      setIsGenerating(responseId);
      const { data, error } = await supabase.functions.invoke('rewrite-response', {
        body: { responseId, mode }
      });
      
      if (error) {
        console.error("Rewrite function error:", error);
        throw new Error(error.message || "Failed to rewrite response");
      }
      
      if (data?.error) {
        console.error("Rewrite response error:", data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      setIsGenerating(null);
      queryClient.invalidateQueries({ queryKey: ['tender-responses', tender?.id] });
      const modeDisplay = variables.mode.replace('_', ' ');
      toast({
        title: "Response rewritten",
        description: `Response has been made ${modeDisplay} successfully.`,
      });
    },
    onError: (error: any) => {
      setIsGenerating(null);
      toast({
        title: "Error rewriting response",
        description: error.message || "Failed to rewrite response. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (tenderLoading) return <div>Loading tender...</div>;
  if (!tender) return <div>Tender not found.</div>;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>

      {/* Processing Banner */}
      {tender?.status === 'processing' && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <ProcessingProgress
              stages={[
                { id: 'extracting', label: 'Extracting Questions', description: 'Analysing document content' },
                { id: 'segmenting', label: 'Segmenting Content', description: 'Categorizing document sections' },
                { id: 'identifying', label: 'Identifying Questions', description: 'Finding vendor response items' },
                { id: 'generating', label: 'Generating Responses', description: 'Creating AI-powered answers' }
              ]}
              currentStageIndex={
                tender.processing_stage === 'extracting' ? 0 :
                tender.processing_stage === 'segmenting' ? 1 :
                tender.processing_stage === 'identifying' ? 2 :
                tender.processing_stage === 'generating' ? 3 : 
                tender.processing_stage === 'completed' ? 3 : 0
              }
              progress={tender.progress || 0}
              isComplete={tender.processing_stage === 'completed'}
              error={undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Error Banner */}
      {tender?.status === 'error' && (
        <Card className="mb-8 border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-destructive">Processing Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tender.error_message || 'An error occurred during processing'}
                </p>
              </div>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{tender.title}</CardTitle>
          <CardDescription>Details for tender: {tender.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <span className="text-sm font-medium leading-none">Status</span>
              <p className="text-sm text-muted-foreground">{tender.status}</p>
            </div>
            <div>
              <span className="text-sm font-medium leading-none">Deadline</span>
              <p className="text-sm text-muted-foreground">{tender.deadline ? format(new Date(tender.deadline), 'PPP') : 'No deadline'}</p>
            </div>
            <div>
              <span className="text-sm font-medium leading-none">File URL</span>
              <a href={tender.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">{tender.original_filename}</a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex justify-end">
        <ExportButton tenderId={tender.id} />
      </div>

      <Tabs defaultValue="responses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="responses" className="space-y-4">
          {responsesLoading ? (
            <div>Loading responses...</div>
          ) : (
            <div className="grid gap-4">
              {responses?.map((response) => (
                  <Card key={response.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            Question {response.question_index}
                            {response.original_reference && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {response.original_reference}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-2">{response.question}</CardDescription>
                          {(response.source_location || response.sheet_name || response.page_number) && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {response.source_location && (
                                <Badge variant="secondary" className="text-xs">
                                  📍 {response.source_location}
                                </Badge>
                              )}
                              {response.sheet_name && (
                                <Badge variant="secondary" className="text-xs">
                                  📄 {response.sheet_name}
                                </Badge>
                              )}
                              {response.page_number && (
                                <Badge variant="secondary" className="text-xs">
                                  📖 Page {response.page_number}
                                </Badge>
                              )}
                              {response.original_line_number && (
                                <Badge variant="outline" className="text-xs">
                                  Line {response.original_line_number}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Textarea
                        key={`${response.id}-${response.user_edited_answer || response.ai_generated_answer || ''}`}
                        defaultValue={response.user_edited_answer || response.ai_generated_answer || ''}
                        placeholder="Enter your response here."
                        className="w-full h-40 resize-none"
                        onBlur={(e) => updateMutation.mutate({ responseId: response.id, updatedAnswer: e.target.value })}
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="outline"
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            const textarea = document.querySelector(`textarea[data-response-id="${response.id}"]`) as HTMLTextAreaElement;
                            updateMutation.mutate({ responseId: response.id, updatedAnswer: textarea?.value });
                          }}
                        >
                          {updateMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                          Update Response
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isGenerating === response.id}
                            >
                              <RefreshCw className={cn("mr-2 h-4 w-4", isGenerating === response.id && "animate-spin")} />
                              {isGenerating === response.id ? 'Processing...' : 'Regenerate'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Regenerate Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => regenerateResponse.mutate(response.id)}
                              disabled={isGenerating === response.id}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Regenerate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Rewrite As</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => rewriteResponse.mutate({ responseId: response.id, mode: 'make_shorter' })}
                              disabled={isGenerating === response.id}
                            >
                              Make Shorter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => rewriteResponse.mutate({ responseId: response.id, mode: 'make_formal' })}
                              disabled={isGenerating === response.id}
                            >
                              Make More Formal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => rewriteResponse.mutate({ responseId: response.id, mode: 'more_detailed' })}
                              disabled={isGenerating === response.id}
                            >
                              Make Longer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Switch
                          id={`approve-${response.id}`}
                          checked={response.is_approved || false}
                          onCheckedChange={(checked) => approveMutation.mutate({ responseId: response.id, isApproved: checked })}
                        />
                        <Label htmlFor={`approve-${response.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Approved
                        </Label>
                      </div>
                    </div>
                    {response.research_used && (
                      <Badge variant="secondary">Research Used</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>Original tender document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                    disabled={!previewUrl}
                  >
                    Open in New Tab
                  </Button>
                </div>
                <div className="w-full h-96 border rounded-lg bg-muted">
                  {!previewUrl && !previewError && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading preview...</p>
                    </div>
                  )}
                  {previewError && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-destructive">{previewError}</p>
                    </div>
                  )}
                  {previewUrl && !previewError && (
                    tender.file_url.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full rounded-lg"
                        title="Tender Document Preview"
                      />
                    ) : (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                        className="w-full h-full rounded-lg"
                        title="Tender Document Preview"
                      />
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenderDetails;
