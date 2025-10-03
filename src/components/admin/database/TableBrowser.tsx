import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_TABLES = [
  { name: "tenders", label: "Tenders" },
  { name: "tender_responses", label: "Tender Responses" },
  { name: "company_profiles", label: "Company Profiles" },
  { name: "qa_memory", label: "QA Memory" },
  { name: "projects", label: "Projects" },
  { name: "demo_uses", label: "Demo Uses" },
  { name: "user_roles", label: "User Roles" },
  { name: "company_members", label: "Company Members" },
  { name: "file_upload_logs", label: "File Upload Logs" },
];

export const TableBrowser = () => {
  const [selectedTable, setSelectedTable] = useState<string>("tenders");
  
  const { data: tableData, isLoading, refetch } = useQuery({
    queryKey: ["admin-table-data", selectedTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_admin_table_data', {
          p_table_name: selectedTable,
          p_limit: 10
        });
      
      if (error) throw error;
      // Parse jsonb result to array
      const parsedData = Array.isArray(data) ? data : [];
      return parsedData as any[];
    },
    enabled: !!selectedTable,
  });

  const columns = tableData && tableData.length > 0 
    ? Object.keys(tableData[0]) 
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Table Browser
            </CardTitle>
            <CardDescription>Browse table data (showing last 10 records)</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TABLES.map((table) => (
                  <SelectItem key={table.name} value={table.name}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : tableData && tableData.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="font-semibold">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="max-w-xs truncate">
                        {typeof row[col] === "object" 
                          ? JSON.stringify(row[col])
                          : String(row[col] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No data available</p>
        )}
      </CardContent>
    </Card>
  );
};
