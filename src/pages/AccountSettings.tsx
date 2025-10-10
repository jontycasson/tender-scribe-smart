import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Building2, Settings, Users, Shield } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { CompanyProfileData } from "@/lib/validations/onboarding";

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<CompanyProfileData | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (!user) return;

      try {
        // Fetch user role
        const { data: roleData } = await supabase.rpc("get_user_company_role" as any);
        setUserRole(roleData as string);

        // Fetch company profile
        const { data, error } = await supabase
          .from("company_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (data) {
          setExistingProfile({
            companyName: data.company_name,
            industry: data.industry,
            teamSize: data.team_size,
            servicesOffered: data.services_offered,
            specializations: data.specializations,
            mission: data.mission,
            values: data.values,
            policies: data.policies || "",
            pastProjects: data.past_projects,
            accreditations: data.accreditations || "",
            yearsInBusiness: data.years_in_business,
          });
        }
      } catch (error) {
        console.error("Error fetching existing profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    if (user && !loading) {
      fetchExistingProfile();
    }
  }, [user, loading]);

  const handleUpdateEmail = async () => {
    if (!email || email === user?.email) {
      toast({
        title: "No changes",
        description: "Email address is the same.",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });

      if (error) throw error;

      toast({
        title: "Email update initiated",
        description: "Please check both your old and new email for confirmation links.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in both password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCompanyProfileUpdate = async (data: CompanyProfileData) => {
    if (!user) return;

    try {
      const profileData = {
        user_id: user.id,
        company_name: data.companyName,
        industry: data.industry,
        team_size: data.teamSize,
        services_offered: data.servicesOffered,
        specializations: data.specializations,
        mission: data.mission,
        values: data.values,
        policies: data.policies || null,
        past_projects: data.pastProjects,
        accreditations: data.accreditations || null,
        years_in_business: data.yearsInBusiness,
      };

      let error;
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from("company_profiles")
          .update(profileData)
          .eq("user_id", user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("company_profiles")
          .insert(profileData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Company profile updated",
        description: "Your company information has been saved successfully.",
      });

      // Refresh profile data
      setExistingProfile(data);
    } catch (error) {
      console.error("Error saving company profile:", error);
      toast({
        title: "Error",
        description: "Failed to save your company profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading account settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account, company profile, and preferences
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Profile
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Address</CardTitle>
                <CardDescription>
                  Update your email address. You'll need to verify the new email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <Button onClick={handleUpdateEmail} disabled={updating}>
                  {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button onClick={handleUpdatePassword} disabled={updating}>
                  {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details and status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">User ID:</span>
                  <span className="text-muted-foreground text-sm font-mono">{user.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Email Confirmed:</span>
                  <span className="text-muted-foreground">
                    {user.email_confirmed_at ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium">Account Created:</span>
                  <span className="text-muted-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Company Profile</CardTitle>
                    <CardDescription>
                      Manage your company information used in tender responses.
                    </CardDescription>
                  </div>
                  {userRole && (
                    <Badge
                      variant={userRole === "owner" ? "default" : userRole === "admin" ? "default" : "secondary"}
                      className={userRole === "owner" ? "bg-purple-600" : userRole === "admin" ? "bg-blue-600" : ""}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {userRole === "member" && (
                  <div className="mb-6 p-4 border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                      <strong>View Only:</strong> As a team member, you can view the company profile but cannot make changes.
                      Contact your company owner or admin to update this information.
                    </p>
                  </div>
                )}
                <OnboardingForm
                  onComplete={handleCompanyProfileUpdate}
                  existingData={existingProfile}
                  isSettings={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>
                  Customize your experience and notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Preference settings coming soon. You'll be able to customize:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>Email notifications for tender updates</li>
                  <li>Default export format preferences</li>
                  <li>Dashboard display options</li>
                  <li>Language and timezone settings</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
