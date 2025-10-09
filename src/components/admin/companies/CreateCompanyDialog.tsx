 import { useState } from "react";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { supabase } from "@/integrations/supabase/client";
  import { useToast } from "@/hooks/use-toast";
  import { Loader2 } from "lucide-react";

  interface CreateCompanyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }

  export const CreateCompanyDialog = ({ open, onOpenChange, onSuccess }: CreateCompanyDialogProps) => {
    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCreate = async () => {
      if (!companyName || !industry || !teamSize || !ownerEmail) {
        toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        // Get user ID from email
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', ownerEmail)
          .single();

        if (userError) {
          throw new Error(`User not found: ${ownerEmail}`);
        }

        // Create company profile
        const { error: companyError } = await supabase
          .from('company_profiles')
          .insert({
            user_id: userData.id,
            company_name: companyName,
            industry,
            team_size: teamSize,
          });

        if (companyError) throw companyError;

        toast({
          title: "Success",
          description: `Company "${companyName}" created successfully`
        });

        setCompanyName("");
        setIndustry("");
        setTeamSize("");
        setOwnerEmail("");
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
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Create a new company profile and assign an owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                placeholder="Technology"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team size" />
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
              <Label>Owner Email</Label>
              <Input
                type="email"
                placeholder="owner@company.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
