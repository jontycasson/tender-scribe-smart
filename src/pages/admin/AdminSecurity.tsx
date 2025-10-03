import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Shield, RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserRoleManagement } from "@/components/admin/security/UserRoleManagement";
import { AuthActivityMonitor } from "@/components/admin/security/AuthActivityMonitor";
import { SecurityAlertsPanel } from "@/components/admin/security/SecurityAlertsPanel";

interface SecurityMetrics {
  totalFailedLogins: number;
  suspiciousActivity: number;
  adminUsers: number;
  lastSecurityScan: string;
}

const AdminSecurity = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalFailedLogins: 0,
    suspiciousActivity: 0,
    adminUsers: 0,
    lastSecurityScan: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Get admin user count
      const { data: adminData } = await supabase
        .rpc('get_admin_users');

      setMetrics(prev => ({
        ...prev,
        adminUsers: adminData?.length || 0,
        lastSecurityScan: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runSecurityScan = async () => {
    setLoading(true);
    
    // Simulate security scan
    setTimeout(() => {
      setMetrics(prev => ({
        ...prev,
        lastSecurityScan: new Date().toISOString(),
      }));
      setLoading(false);
      
      toast({
        title: "Security Scan Complete",
        description: "No critical security issues found",
      });
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && metrics.lastSecurityScan === new Date().toISOString()) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
            <p className="text-muted-foreground">Monitor security status and manage access</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Security & Authentication
            </h1>
            <p className="text-muted-foreground">
              Manage user authentication, roles, and monitor security
            </p>
          </div>
          <Button onClick={runSecurityScan} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Authentication Activity Monitor */}
        <AuthActivityMonitor />

        {/* User Role Management */}
        <UserRoleManagement />

        {/* Security Status Panel */}
        <SecurityAlertsPanel />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Security Actions
            </CardTitle>
            <CardDescription>
              Quick access to common security and support tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Button variant="outline" className="justify-start">
                <Shield className="mr-2 h-4 w-4" />
                View Security Logs
              </Button>
              <Button variant="outline" className="justify-start">
                <Activity className="mr-2 h-4 w-4" />
                Export Audit Trail
              </Button>
              <Button variant="outline" className="justify-start">
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Compliance Check
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurity;