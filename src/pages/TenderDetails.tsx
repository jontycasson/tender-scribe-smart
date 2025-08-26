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
import { toast } from "@/components/ui/use-toast"
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
import { ReloadIcon } from "@radix-ui/react-icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Button as ShadButton } from "@/components/ui/button"
import { cn as shadCn } from "@/lib/utils"
import { useToast as useShadToast } from "@/components/ui/use-toast"

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
type Tender = Database['public']['Tables']['tenders']['Row'];
type TenderResponse = Database['public']['Tables']['tender_responses']['Row'];

interface Params {
  id: string;
}

const TenderDetails = () => {
  const { id } = useParams<Params>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

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

  const regenerateResponse = async (responseId: string) => {
    setIsGenerating(true);
    const { data, error } = await supabase.functions.invoke('regenerate-response', {
      body: JSON.stringify({ responseId }),
    });

    setIsGenerating(false);

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

  const approveMutation = useMutation(
    ({ responseId, isApproved }: { responseId: string, isApproved: boolean }) => approveResponse(responseId, isApproved),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tender-responses', tender?.id]);
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
    }
  );

  const updateMutation = useMutation(
    ({ responseId, updatedAnswer }: { responseId: string, updatedAnswer: string | null }) => updateResponse(responseId, updatedAnswer),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tender-responses', tender?.id]);
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
    }
  );

  const regenerateMutation = useMutation(
    (responseId: string) => regenerateResponse(responseId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tender-responses', tender?.id]);
        toast({
          title: "Response regenerated.",
          description: "The response has been regenerated successfully.",
        })
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message,
        })
      },
    }
  );

  if (tenderLoading) return <div>Loading tender...</div>;
  if (!tender) return <div>Tender not found.</div>;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>

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

      {responsesLoading ? (
        <div>Loading responses...</div>
      ) : (
        <div className="grid gap-4">
          {responses?.map((response) => (
            <Card key={response.id}>
              <CardHeader>
                <CardTitle>Question {response.question_index !== null ? response.question_index + 1 : ''}</CardTitle>
                <CardDescription>{response.question}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Textarea
                    defaultValue={response.user_edited_answer || response.ai_generated_answer || ''}
                    placeholder="Enter your response here."
                    className="w-full h-40 resize-none"
                    onBlur={(e) => updateMutation.mutate({ responseId: response.id, updatedAnswer: e.target.value })}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <Button
                      variant="outline"
                      isLoading={updateMutation.isPending}
                      onClick={() => {
                        const textarea = document.querySelector(`textarea[data-response-id="${response.id}"]`) as HTMLTextAreaElement;
                        updateMutation.mutate({ responseId: response.id, updatedAnswer: textarea?.value });
                      }}
                    >
                      Update Response
                    </Button>
                    <Button
                      variant="secondary"
                      isLoading={isGenerating}
                      onClick={() => regenerateMutation.mutate(response.id)}
                    >
                      Regenerate Response
                    </Button>
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
                {response.question_type && (
                  <Badge variant="outline">{response.question_type}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenderDetails;
