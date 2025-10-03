import { AdminLayout } from "@/components/admin/AdminLayout";
import { TableStats } from "@/components/admin/database/TableStats";
import { TableBrowser } from "@/components/admin/database/TableBrowser";
import { RLSPolicyViewer } from "@/components/admin/database/RLSPolicyViewer";

const AdminDatabase = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
          <p className="text-muted-foreground">
            Monitor database tables, row counts, and RLS policies
          </p>
        </div>

        <TableStats />
        
        <div className="grid gap-6 lg:grid-cols-1">
          <TableBrowser />
          <RLSPolicyViewer />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDatabase;
