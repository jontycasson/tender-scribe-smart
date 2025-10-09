import { useState } from "react";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { supabase } from "@/integrations/supabase/client";
  import { useToast } from "@/hooks/use-toast";
  import { Loader2 } from "lucide-react";

  interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }

  export const CreateUserDialog = ({ open, onOpenChange, onSuccess }: CreateUserDialogProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCreate = async () => {
      if (!email || !password) {
        toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
        return;
      }

      if (password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Call edge function to create user
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: { email, password },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to create user');

        toast({
          title: "Success",
          description: `User ${email} created successfully. They can now log in.`
        });

        setEmail("");
        setPassword("");
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
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will be able to log in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
