 import { useState, useEffect } from "react";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { supabase } from "@/integrations/supabase/client";
  import { useToast } from "@/hooks/use-toast";
  import { Loader2 } from "lucide-react";

  interface EditCompanyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyId: string;
    onSuccess: () => void;
  }

  export const EditCompanyDialog = ({ open, onOpenChange, companyId, onSuccess }: EditCompanyDialogProps) => {
    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
      if (open && companyId) {
        fetchCompanyDetails();
      }
    }, [open, companyId]);

    const fetchCompanyDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        setCompanyName(data.company_name || "");
        setIndustry(data.industry || "");
        setTeamSize(data.team_size || "");
        setDescription(data.description || "");
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    };

    const handleUpdate = async () => {
      if (!companyName || !industry || !teamSize) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from('company_profiles')
          .update({
            company_name: companyName,
            industry,
            team_size: teamSize,
            description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyId);

        if (error) throw error;

        toast({ title: "Success", description: "Company updated successfully" });
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Team Size *</Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-1000">201-1000</SelectItem>
                  <SelectItem value="1000+">1000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional company description"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
