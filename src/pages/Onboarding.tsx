import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { CompanyProfileData } from "@/lib/validations/onboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [existingProfile, setExistingProfile] = useState<CompanyProfileData | null>(null);
  const [companyProfileId, setCompanyProfileId] = useState<string | undefined>(undefined);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("company_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (data) {
          setCompanyProfileId(data.id);
          // Convert database format to form format
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

  const handleOnboardingComplete = async (data: CompanyProfileData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to complete onboarding.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

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
        // Update existing profile - don't modify subscription fields
        const { error: updateError } = await supabase
          .from("company_profiles")
          .update(profileData)
          .eq("user_id", user.id);
        error = updateError;
      } else {
        // Create new profile with trial initialization
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 day trial

        const { error: insertError } = await supabase
          .from("company_profiles")
          .insert({
            ...profileData,
            trial_start_date: new Date().toISOString(),
            trial_end_date: trialEndDate.toISOString(),
          });
        error = insertError;
      }

      if (error) {
        throw error;
      }

      // If creating a new profile, get the ID for document uploads
      if (!existingProfile) {
        const { data: newProfile } = await supabase
          .from("company_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (newProfile) {
          setCompanyProfileId(newProfile.id);
        }
      }

      toast({
        title: existingProfile ? "Profile updated successfully!" : "Profile created successfully!",
        description: existingProfile 
          ? "Your company profile has been updated." 
          : "Welcome to TenderFlow. You can now start responding to tenders.",
      });
      
      navigate("/dashboard");
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
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
      <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <div className="max-w-2xl w-full">
          <OnboardingForm 
            onComplete={handleOnboardingComplete} 
            existingData={existingProfile}
            companyProfileId={companyProfileId}
          />
        </div>
      </div>
    </div>
  );
};

export default Onboarding;