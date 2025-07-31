import { useNavigate } from "react-router-dom";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { CompanyProfileData } from "@/lib/validations/onboarding";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOnboardingComplete = (data: CompanyProfileData) => {
    // TODO: Save data to Supabase when backend is connected
    console.log("Company profile data:", data);
    
    toast({
      title: "Profile created successfully!",
      description: "Welcome to TenderFlow. You can now start responding to tenders.",
    });
    
    // Navigate to dashboard or main app
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingForm onComplete={handleOnboardingComplete} />
    </div>
  );
};

export default Onboarding;