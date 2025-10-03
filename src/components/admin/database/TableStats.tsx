import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table2, FileText, Building2, Brain, FolderKanban, TestTube, Shield, Users } from "lucide-react";

const TABLE_INFO = [
  { name: "tenders", icon: FileText, label: "Tenders" },
  { name: "tender_responses", icon: Table2, label: "Responses" },
  { name: "company_profiles", icon: Building2, label: "Companies" },
  { name: "qa_memory", icon: Brain, label: "QA Memory" },
  { name: "projects", icon: FolderKanban, label: "Projects" },
  { name: "demo_uses", icon: TestTube, label: "Demo Uses" },
  { name: "user_roles", icon: Shield, label: "User Roles" },
  { name: "company_members", icon: Users, label: "Members" },
];

export const TableStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-table-stats"],
    queryFn: async () => {
      const { data: statsData, error } = await supabase
        .rpc('get_admin_table_stats');

      if (error) throw error;

      return TABLE_INFO.map(table => {
        const stat = statsData?.find((s: any) => s.table_name === table.name);
        return {
          name: table.name,
          label: table.label,
          icon: table.icon,
          count: Number(stat?.row_count) || 0,
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats?.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total records</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
