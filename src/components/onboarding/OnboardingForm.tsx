import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CompanyProfileData, companyProfileSchema, industryOptions, teamSizeOptions, serviceOptions, yearsInBusinessOptions } from "@/lib/validations/onboarding";

interface OnboardingFormProps {
  onComplete: (data: CompanyProfileData) => void;
  existingData?: CompanyProfileData | null;
}

export function OnboardingForm({ onComplete, existingData }: OnboardingFormProps) {
  const form = useForm<CompanyProfileData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: existingData || {
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

  const handleSubmit = form.handleSubmit((data) => {
    onComplete(data);
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          {existingData ? "Update Your Profile" : "Welcome to TenderFlow"}
        </h1>
        <p className="text-muted-foreground text-center">
          {existingData 
            ? "Update your company profile information"
            : "Let's set up your company profile to get started"
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Company Profile</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {industryOptions.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="teamSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your team size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teamSizeOptions.map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
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
                    name="yearsInBusiness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years in Business</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </div>
              </div>

              <Separator />

              {/* Services & Expertise Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Services & Expertise</h3>
                </div>

                <FormField
                  control={form.control}
                  name="servicesOffered"
                  render={() => (
                    <FormItem>
                      <FormLabel>Services Offered</FormLabel>
                      <FormDescription>
                        Select all services your company provides
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      <FormLabel>Specialisations & Expertise</FormLabel>
                      <FormDescription>
                        Describe your key areas of expertise and what makes your company unique
                      </FormDescription>
                      <FormControl>
                        <AutoTextarea
                          placeholder="e.g., We specialise in sustainable construction practices with expertise in LEED certification, green building technologies, and environmental impact assessments..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Mission & Values Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Mission & Values</h3>
                </div>

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
                        <AutoTextarea
                          placeholder="e.g., To deliver innovative engineering solutions that create sustainable value for our clients while contributing to a better tomorrow..."
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
                        <AutoTextarea
                          placeholder="e.g., Integrity, Innovation, Excellence, Sustainability, Client Focus, Teamwork..."
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
                        <AutoTextarea
                          placeholder="e.g., ISO 9001:2015 Quality Management System, Health & Safety Policy, Environmental Management Policy..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Experience & Credentials Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Experience & Credentials</h3>
                </div>

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
                        <AutoTextarea
                          placeholder="e.g., Successfully delivered 50+ construction projects totaling $100M+ including the award-winning Green Office Complex (2023), Municipal Water Treatment Facility upgrade (2022)..."
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
                        <AutoTextarea
                          placeholder="e.g., ISO 9001:2015, OHSAS 18001, Professional Engineer License, LEED AP Certification, CompTIA Security+..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6">
                <Button type="submit" size="lg">
                  {existingData ? "Update Profile" : "Complete Setup"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}