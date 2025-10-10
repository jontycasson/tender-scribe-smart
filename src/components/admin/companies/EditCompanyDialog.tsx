import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { industryOptions, teamSizeOptions, serviceOptions, yearsInBusinessOptions } from "@/lib/validations/onboarding";

  interface EditCompanyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyId: string;
    onSuccess: () => void;
  }

export const EditCompanyDialog = ({ open, onOpenChange, companyId, onSuccess }: EditCompanyDialogProps) => {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState("");
  const [mission, setMission] = useState("");
  const [values, setValues] = useState("");
  const [policies, setPolicies] = useState("");
  const [pastProjects, setPastProjects] = useState("");
  const [accreditations, setAccreditations] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

    useEffect(() => {
      if (open && companyId) {
        fetchCompanyDetails();
      }
    }, [open, companyId]);

  const fetchCompanyDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      setCompanyName(data.company_name || "");
      setIndustry(data.industry || "");
      setTeamSize(data.team_size || "");
      setServicesOffered(data.services_offered || []);
      setSpecializations(data.specializations || "");
      setMission(data.mission || "");
      setValues(data.values || "");
      setPolicies(data.policies || "");
      setPastProjects(data.past_projects || "");
      setAccreditations(data.accreditations || "");
      setYearsInBusiness(data.years_in_business || "");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!companyName || !industry || !teamSize) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_profiles')
        .update({
          company_name: companyName,
          industry,
          team_size: teamSize,
          services_offered: servicesOffered,
          specializations,
          mission,
          values,
          policies: policies || null,
          past_projects: pastProjects,
          accreditations: accreditations || null,
          years_in_business: yearsInBusiness,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({ title: "Success", description: "Company profile updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Company Profile</DialogTitle>
          <DialogDescription>Update complete company profile information</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team Size *</Label>
                  <Select value={teamSize} onValueChange={setTeamSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamSizeOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Years in Business *</Label>
                  <Select value={yearsInBusiness} onValueChange={setYearsInBusiness}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsInBusinessOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Services & Expertise */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Services & Expertise</h3>
              <div className="space-y-2">
                <Label>Services Offered *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map((service) => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={service}
                        checked={servicesOffered.includes(service)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setServicesOffered([...servicesOffered, service]);
                          } else {
                            setServicesOffered(servicesOffered.filter(s => s !== service));
                          }
                        }}
                      />
                      <label htmlFor={service} className="text-sm cursor-pointer">{service}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specializations & Expertise *</Label>
                <Textarea
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                  rows={3}
                  placeholder="Describe your key areas of expertise..."
                />
              </div>
            </div>

            <Separator />

            {/* Mission & Values */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Mission & Values</h3>
              <div className="space-y-2">
                <Label>Mission Statement *</Label>
                <Textarea
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={3}
                  placeholder="Company mission and purpose..."
                />
              </div>

              <div className="space-y-2">
                <Label>Company Values *</Label>
                <Textarea
                  value={values}
                  onChange={(e) => setValues(e.target.value)}
                  rows={3}
                  placeholder="Core values that guide your operations..."
                />
              </div>

              <div className="space-y-2">
                <Label>Key Policies (Optional)</Label>
                <Textarea
                  value={policies}
                  onChange={(e) => setPolicies(e.target.value)}
                  rows={3}
                  placeholder="Quality, safety, environmental policies..."
                />
              </div>
            </div>

            <Separator />

            {/* Experience & Credentials */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Experience & Credentials</h3>
              <div className="space-y-2">
                <Label>Past Projects & Experience *</Label>
                <Textarea
                  value={pastProjects}
                  onChange={(e) => setPastProjects(e.target.value)}
                  rows={3}
                  placeholder="Describe relevant past projects and achievements..."
                />
              </div>

              <div className="space-y-2">
                <Label>Accreditations & Certifications (Optional)</Label>
                <Textarea
                  value={accreditations}
                  onChange={(e) => setAccreditations(e.target.value)}
                  rows={3}
                  placeholder="List certifications, licenses, or accreditations..."
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Company Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
