import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RLSPolicy {
  table: string;
  policies: {
    name: string;
    command: string;
    enabled: boolean;
  }[];
}

const RLS_POLICIES: RLSPolicy[] = [
  {
    table: "tenders",
    policies: [
      { name: "Users can create tenders for their company", command: "INSERT", enabled: true },
      { name: "Users can view tenders for their company", command: "SELECT", enabled: true },
      { name: "Users can update tenders for their company", command: "UPDATE", enabled: true },
      { name: "Users can delete tenders for their company", command: "DELETE", enabled: true },
    ],
  },
  {
    table: "tender_responses",
    policies: [
      { name: "Users can create responses for their company tenders", command: "INSERT", enabled: true },
      { name: "Users can view responses for their company tenders", command: "SELECT", enabled: true },
      { name: "Users can update responses for their company tenders", command: "UPDATE", enabled: true },
      { name: "Users can delete responses for their company tenders", command: "DELETE", enabled: true },
    ],
  },
  {
    table: "company_profiles",
    policies: [
      { name: "Users can create their own company profile", command: "INSERT", enabled: true },
      { name: "Users can view their own company profile", command: "SELECT", enabled: true },
      { name: "Users can update their own company profile", command: "UPDATE", enabled: true },
      { name: "Users can delete their own company profile", command: "DELETE", enabled: true },
    ],
  },
  {
    table: "qa_memory",
    policies: [
      { name: "Users can create QA memory for their company", command: "INSERT", enabled: true },
      { name: "Users can view QA memory for their company", command: "SELECT", enabled: true },
      { name: "Users can update QA memory for their company", command: "UPDATE", enabled: true },
      { name: "Users can delete QA memory for their company", command: "DELETE", enabled: true },
    ],
  },
  {
    table: "demo_uses",
    policies: [
      { name: "demo_uses_validated_insert_policy", command: "INSERT", enabled: true },
      { name: "demo_uses_admin_only_select_policy", command: "SELECT", enabled: true },
      { name: "demo_uses_no_update_policy", command: "UPDATE", enabled: true },
      { name: "demo_uses_no_delete_policy", command: "DELETE", enabled: true },
    ],
  },
  {
    table: "user_roles",
    policies: [
      { name: "Only admins can manage user roles", command: "ALL", enabled: true },
      { name: "Users can view their own roles", command: "SELECT", enabled: true },
    ],
  },
];

export const RLSPolicyViewer = () => {
  const projectId = "yfnqnsgggcbkdqhdlocd";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Row Level Security Policies
        </CardTitle>
        <CardDescription>Active RLS policies across all tables</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {RLS_POLICIES.map((tablePolicy) => (
          <div key={tablePolicy.table} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">{tablePolicy.table}</h3>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={`https://supabase.com/dashboard/project/${projectId}/auth/policies?schema=public&table=${tablePolicy.table}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  Edit <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
            <div className="space-y-2">
              {tablePolicy.policies.map((policy, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                >
                  <span className="text-sm">{policy.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{policy.command}</Badge>
                    <Badge variant={policy.enabled ? "default" : "destructive"}>
                      {policy.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
