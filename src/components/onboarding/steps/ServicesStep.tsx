import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanyProfileData, serviceOptions } from "@/lib/validations/onboarding";

interface ServicesStepProps {
  form: UseFormReturn<CompanyProfileData>;
}

export function ServicesStep({ form }: ServicesStepProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="servicesOffered"
        render={() => (
          <FormItem>
            <FormLabel>Services Offered</FormLabel>
            <FormDescription>
              Select all services your company provides
            </FormDescription>
            <div className="grid grid-cols-2 gap-3">
              {serviceOptions.map((service) => (
                <FormField
                  key={service}
                  control={form.control}
                  name="servicesOffered"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={service}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(service)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, service])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== service
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {service}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="specializations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Specializations & Expertise</FormLabel>
            <FormDescription>
              Describe your key areas of expertise and what makes your company unique
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="e.g., We specialize in sustainable construction practices with expertise in LEED certification, green building technologies, and environmental impact assessments..."
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