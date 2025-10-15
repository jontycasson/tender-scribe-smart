import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift } from "lucide-react";

interface GrantComplimentaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onSuccess: () => void;
}

const PLANS = [
  { name: "Solo", seats: 1 },
  { name: "Starter", seats: 2 },
  { name: "Pro", seats: 5 },
  { name: "Enterprise", seats: 10 }
];

export const GrantComplimentaryDialog = ({ 
  open, 
  onOpenChange, 
  companyId, 
  companyName,
  onSuccess 
}: GrantComplimentaryDialogProps) => {
  const [planName, setPlanName] = useState("Enterprise");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGrant = async () => {
    if (!reason.trim()) {
      toast({ 
        title: "Error", 
        description: "Please provide a reason for granting complimentary access", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_grant_complimentary_access', {
        target_company_id: companyId,
        p_plan_name: planName,
        p_reason: reason.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; plan?: string; seats?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to grant complimentary access');
      }

      toast({
        title: "Success",
        description: `Complimentary ${result.plan} access granted to ${companyName} (${result.seats} seats)`
      });

      setPlanName("Enterprise");
      setReason("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Grant Complimentary Access
          </DialogTitle>
          <DialogDescription>
            Grant complimentary access to <strong>{companyName}</strong>. This will bypass all payment requirements and give unlimited tender processing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={planName} onValueChange={setPlanName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {PLANS.map((plan) => (
                  <SelectItem key={plan.name} value={plan.name}>
                    {plan.name} ({plan.seats} {plan.seats === 1 ? 'seat' : 'seats'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="e.g., Strategic partnership, Beta tester, Investor, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged in the subscription events for audit purposes.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGrant} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Grant Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
