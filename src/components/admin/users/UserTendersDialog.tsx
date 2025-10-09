import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2 } from "lucide-react";
interface UserTendersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
}

interface Tender {
  id: string;
  title: string;
  status: string;
  created_at: string;
  total_questions: number;
  processed_questions: number;
  company_name: string;
}

export const UserTendersDialog = ({ open, onOpenChange, userId, userEmail }: UserTendersDialogProps) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
   const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTenders();
    }
  }, [open, userId]);

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_tenders_for_admin', {
        target_user_id: userId
      });

      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error('Error fetching tenders:', error);
    } finally {
      setLoading(false);
    }
  };
const handleDeleteTender = async (tenderId: string, tenderTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${tenderTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { data, error } = await (supabase as any).rpc('admin_delete_tender', {
        tender_id: tenderId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete tender');
      }

      toast({ title: "Success", description: result.message });
      fetchTenders(); // Refresh list
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "default",
      processing: "secondary",
      uploaded: "outline",
      failed: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tenders for {userEmail}</DialogTitle>
          <DialogDescription>
            All tenders associated with this user's company
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tenders found for this user</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Company</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Progress</TableHead>
      <TableHead>Created</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
            <TableBody>
              {tenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell className="font-medium">{tender.title}</TableCell>
                  <TableCell>{tender.company_name}</TableCell>
                  <TableCell>{getStatusBadge(tender.status)}</TableCell>
                  <TableCell>
                    {tender.processed_questions}/{tender.total_questions} questions
                  </TableCell>
                  <TableCell>{new Date(tender.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTender(tender.id, tender.title)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
