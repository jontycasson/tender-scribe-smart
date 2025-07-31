import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Form } from "@/components/ui/form";
import { CompanyProfileData, companyProfileSchema } from "@/lib/validations/onboarding";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { ServicesStep } from "./steps/ServicesStep";
import { ValuesStep } from "./steps/ValuesStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { ArrowLeft, ArrowRight } from "lucide-react";

const steps = [
  { title: "Basic Information", component: BasicInfoStep },
  { title: "Services & Expertise", component: ServicesStep },
  { title: "Mission & Values", component: ValuesStep },
  { title: "Experience & Credentials", component: ExperienceStep },
];

interface OnboardingFormProps {
  onComplete: (data: CompanyProfileData) => void;
}

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const form = useForm<CompanyProfileData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      teamSize: "",
      servicesOffered: [],
      specializations: "",
      mission: "",
      values: "",
      policies: "",
      pastProjects: "",
      accreditations: "",
      yearsInBusiness: "",
    },
  });

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep].component;

  const validateCurrentStep = async () => {
    const stepFields = getStepFields(currentStep);
    const isValid = await form.trigger(stepFields);
    return isValid;
  };

  const getStepFields = (step: number): (keyof CompanyProfileData)[] => {
    switch (step) {
      case 0:
        return ["companyName", "industry", "teamSize"];
      case 1:
        return ["servicesOffered", "specializations"];
      case 2:
        return ["mission", "values"];
      case 3:
        return ["pastProjects", "yearsInBusiness"];
      default:
        return [];
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    onComplete(data);
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Welcome to TenderFlow</h1>
        <p className="text-muted-foreground text-center">
          Let's set up your company profile to get started
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <CurrentStepComponent form={form} />
              
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                {currentStep === steps.length - 1 ? (
                  <Button type="submit">
                    Complete Setup
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}