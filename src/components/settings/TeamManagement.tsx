import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { SeatAllocationTracker } from "./SeatAllocationTracker";

interface TeamMember {
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
  last_sign_in: string | null;
}

export function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "member">("member");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchTeamData();
  }, [user]);

  const refreshSeatTracker = () => {
    setRefreshKey(prev => prev + 1);
  };

  const fetchTeamData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get current user's role
      const { data: roleData, error: roleError } = await supabase.rpc("get_user_company_role" as any);

      if (roleError) throw roleError;
      setUserRole(roleData as string);

      // Get team members
      const { data: membersData, error: membersError } = await supabase.rpc("get_team_members" as any);

      if (membersError) throw membersError;
      setTeamMembers((membersData as TeamMember[]) || []);
    } catch (error: any) {
      console.error("Error fetching team data:", error);
      toast({
        title: "Error",
        description: "Failed to load team information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail) {
      toast({
        title: "Email required",
        description: "Please enter a team member email address",
        variant: "destructive",
      });
      return;
    }

    setAddingMember(true);
    try {
      const { data, error } = await supabase.rpc("add_team_member" as any, {
        member_email: newMemberEmail,
        member_role: newMemberRole,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; seat_usage?: any };
      if (!result.success) {
        // Check if it's a seat limit error
        const isSeatLimitError = result.error?.includes('Seat limit reached');
        
        toast({
          title: isSeatLimitError ? "Seat limit reached" : "Unable to add member",
          description: result.error || "Failed to add team member",
          variant: "destructive",
        });
        return;
      }

      // Show seat usage in success message if available
      const seatInfo = result.seat_usage 
        ? ` (${result.seat_usage.seats_used}/${result.seat_usage.seat_limit} seats used)`
        : '';
      
      toast({
        title: "Team member added",
        description: `${newMemberEmail} has been added as ${newMemberRole}${seatInfo}`,
      });

      setNewMemberEmail("");
      setNewMemberRole("member");
      refreshSeatTracker();
      await fetchTeamData();
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemovingMember(memberToRemove.user_id);
    try {
      const { data, error } = await supabase.rpc("remove_team_member" as any, {
        member_user_id: memberToRemove.user_id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({
          title: "Unable to remove member",
          description: result.error || "Failed to remove team member",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Team member removed",
        description: `${memberToRemove.email} has been removed from the team`,
      });

      refreshSeatTracker();
      await fetchTeamData();
    } catch (error: any) {
      console.error("Error removing team member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(null);
      setMemberToRemove(null);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { data, error } = await supabase.rpc("update_team_member_role" as any, {
        member_user_id: memberId,
        new_role: newRole,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({
          title: "Unable to update role",
          description: result.error || "Failed to update team member role",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Role updated",
        description: `Team member role updated to ${newRole}`,
      });

      await fetchTeamData();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const isAdmin = userRole === "owner" || userRole === "admin";

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="default" className="bg-purple-600"><Shield className="h-3 w-3 mr-1" />Owner</Badge>;
      case "admin":
        return <Badge variant="default" className="bg-blue-600"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return <Badge variant="secondary"><UserIcon className="h-3 w-3 mr-1" />Member</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>You need to complete your company profile first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SeatAllocationTracker key={refreshKey} />
      
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Add Team Member</CardTitle>
            <CardDescription>
              Invite new team members to your company. They must have an account first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email Address</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="member@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  disabled={addingMember}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => setNewMemberRole(value as "admin" | "member")}
                  disabled={addingMember}
                >
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddMember} disabled={addingMember}>
              {addingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Team Member
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"} in your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Sign In</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    {isAdmin && member.role !== "owner" ? (
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => handleUpdateRole(member.user_id, newRole)}
                        disabled={member.user_id === user?.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {member.last_sign_in
                      ? new Date(member.last_sign_in).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {member.role !== "owner" && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removingMember === member.user_id}
                        >
                          {removingMember === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.email} from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
