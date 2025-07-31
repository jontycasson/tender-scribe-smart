import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { CompanyProfileData } from "@/lib/validations/onboarding";

interface ValuesStepProps {
  form: UseFormReturn<CompanyProfileData>;
}

export function ValuesStep({ form }: ValuesStepProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="mission"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mission Statement</FormLabel>
            <FormDescription>
              What is your company's mission and purpose?
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="e.g., To deliver innovative engineering solutions that create sustainable value for our clients while contributing to a better tomorrow..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="values"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Values</FormLabel>
            <FormDescription>
              What core values guide your company's operations and decisions?
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="e.g., Integrity, Innovation, Excellence, Sustainability, Client Focus, Teamwork..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="policies"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Key Policies (Optional)</FormLabel>
            <FormDescription>
              Any important company policies relevant to tender responses (quality, safety, environmental, etc.)
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="e.g., ISO 9001:2015 Quality Management System, Health & Safety Policy, Environmental Management Policy..."
                className="min-h-[80px]"
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