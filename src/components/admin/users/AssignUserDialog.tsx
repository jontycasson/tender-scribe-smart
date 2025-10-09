import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AssignUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onSuccess: () => void;
}

interface Company {
  id: string;
  company_name: string;
}

export const AssignUserDialog = ({ open, onOpenChange, userEmail, onSuccess }: AssignUserDialogProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [role, setRole] = useState<string>("member");
  const [loading, setLoading] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open]);

  const fetchCompanies = async () => {
    setFetchingCompanies(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_companies_with_stats');
      
      if (error) {
        console.error('Error fetching companies:', error);
        toast({
          title: "Error",
          description: "Failed to load companies. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        setCompanies(data.map((c: any) => ({ id: c.id, company_name: c.company_name })));
      }
    } catch (error: any) {
      console.error('Exception fetching companies:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setFetchingCompanies(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCompany) {
      toast({ title: "Error", description: "Please select a company", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('assign_user_to_company', {
        user_email: userEmail,
        company_id: selectedCompany,
        member_role: role
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign user');
      }

      toast({ title: "Success", description: "User assigned to company successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign User to Company</DialogTitle>
          <DialogDescription>
            Assign {userEmail} to a company with a specific role
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={fetchingCompanies}>
              <SelectTrigger>
                <SelectValue placeholder={fetchingCompanies ? "Loading companies..." : companies.length === 0 ? "No companies found" : "Select a company"} />
              </SelectTrigger>
              <SelectContent>
                {fetchingCompanies ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : companies.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No companies available
                  </div>
                ) : (
                  companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
