import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { CompanyProfileData } from "@/lib/validations/onboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
      const { error } = await supabase
        .from("company_profiles")
        .insert({
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
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile created successfully!",
        description: "Welcome to TenderFlow. You can now start responding to tenders.",
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

  if (loading) {
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
      <OnboardingForm onComplete={handleOnboardingComplete} />
    </div>
  );
};

export default Onboarding;