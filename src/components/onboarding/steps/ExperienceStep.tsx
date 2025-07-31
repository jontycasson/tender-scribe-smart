import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyProfileData, yearsInBusinessOptions } from "@/lib/validations/onboarding";

interface ExperienceStepProps {
  form: UseFormReturn<CompanyProfileData>;
}

export function ExperienceStep({ form }: ExperienceStepProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="yearsInBusiness"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Years in Business</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select years in business" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {yearsInBusinessOptions.map((years) => (
                  <SelectItem key={years} value={years}>
                    {years}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="pastProjects"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Past Projects & Experience</FormLabel>
            <FormDescription>
              Describe your most relevant past projects, achievements, and experience
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="e.g., Successfully delivered 50+ construction projects totaling $100M+ including the award-winning Green Office Complex (2023), Municipal Water Treatment Facility upgrade (2022)..."
                className="min-h-[120px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="accreditations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Accreditations & Certifications (Optional)</FormLabel>
            <FormDescription>
              List any relevant certifications, licenses, or accreditations
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="e.g., ISO 9001:2015, OHSAS 18001, Professional Engineer License, LEED AP Certification, CompTIA Security+..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}