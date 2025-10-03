import { AdminLayout } from "@/components/admin/AdminLayout";
import { HardDrive } from "lucide-react";
import { StorageBuckets } from "@/components/admin/storage/StorageBuckets";
import { FileUploadStats } from "@/components/admin/storage/FileUploadStats";

const AdminStorage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HardDrive className="h-8 w-8" />
            Storage Management
          </h1>
          <p className="text-muted-foreground">
            Monitor file storage, buckets, and upload activity
          </p>
        </div>

        {/* File Upload Statistics */}
        <FileUploadStats />

        {/* Storage Buckets */}
        <StorageBuckets />
      </div>
    </AdminLayout>
  );
};

export default AdminStorage;
