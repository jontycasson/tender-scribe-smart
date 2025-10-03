import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building, FileText, TestTube, TrendingUp, Activity } from "lucide-react";
import { UsageChart } from "@/components/admin/analytics/UsageChart";
import { UserJourneyMetrics } from "@/components/admin/analytics/UserJourneyMetrics";
import { PerformanceMetrics } from "@/components/admin/analytics/PerformanceMetrics";
import { ActivityHeatmap } from "@/components/admin/analytics/ActivityHeatmap";
import { TopCompaniesTable } from "@/components/admin/analytics/TopCompaniesTable";

interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalTenders: number;
  demoSubmissions: number;
  todaySignups: number;
  activeCompanies: number;
}

interface AdminStats {
  total_users: number;
  total_companies: number;
  total_tenders: number;
  active_companies_30d: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCompanies: 0,
    totalTenders: 0,
    demoSubmissions: 0,
    todaySignups: 0,
    activeCompanies: 0,
  });
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [journeyMetrics, setJourneyMetrics] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgResponseTime: 0,
    errorRate: 0,
    successRate: 0,
    activeRequests: 0,
  });
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [topCompanies, setTopCompanies] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get dashboard stats using admin function
        const { data: dashboardStats, error: statsError } = await supabase
          .rpc('get_admin_dashboard_stats');

        if (statsError) {
          console.error('Error fetching dashboard stats:', statsError);
          throw statsError;
        }

        const stats = (dashboardStats?.[0] || {
          total_users: 0,
          total_companies: 0,
          total_tenders: 0,
          active_companies_30d: 0
        }) as AdminStats;

        // Get demo submissions count (secured function)
        const { data: demoStats, error: demoStatsError } = await supabase
          .rpc('get_demo_usage_stats');
        
        if (demoStatsError) {
          console.error('Error fetching demo stats:', demoStatsError);
          // Continue without demo stats if access denied
        }

        const statsData = Array.isArray(demoStats) ? demoStats[0] : demoStats;

        setStats({
          totalUsers: stats.total_users || 0,
          totalCompanies: stats.total_companies || 0,
          totalTenders: stats.total_tenders || 0,
          demoSubmissions: statsData?.total_submissions || 0,
          todaySignups: statsData?.submissions_last_24h || 0,
          activeCompanies: stats.active_companies_30d || 0,
        });

        // Fetch usage trends using admin function
        const { data: tenderStats } = await supabase
          .rpc('get_admin_tender_stats', { days_back: 30 });

        const usageArray = tenderStats?.map(stat => ({
          date: stat.date,
          tenders: Number(stat.tender_count),
          responses: Number(stat.response_count),
          users: 0 // Can enhance this later
        })) || [];

        setUsageData(usageArray.reverse());

        // Calculate user journey metrics
        const onboardingComplete = stats.total_companies || 0;
        
        // Count companies with at least one tender
        const { data: companiesWithTenders } = await supabase
          .from('tenders')
          .select('company_profile_id')
          .not('company_profile_id', 'is', null);

        const uniqueCompaniesWithTenders = new Set(companiesWithTenders?.map(t => t.company_profile_id));
        const firstTenderComplete = uniqueCompaniesWithTenders.size;

        setJourneyMetrics([
          {
            metric: 'Onboarding Complete',
            value: onboardingComplete,
            total: onboardingComplete,
            percentage: 100,
          },
          {
            metric: 'First Tender Uploaded',
            value: firstTenderComplete,
            total: onboardingComplete,
            percentage: onboardingComplete > 0 ? Math.round((firstTenderComplete / onboardingComplete) * 100) : 0,
          },
          {
            metric: 'Active Users (30d)',
            value: stats.active_companies_30d || 0,
            total: onboardingComplete,
            percentage: onboardingComplete > 0 ? Math.round(((stats.active_companies_30d || 0) / onboardingComplete) * 100) : 0,
          },
        ]);

        // Calculate performance metrics
        const { data: tendersProcessing } = await supabase
          .from('tenders')
          .select('status, processing_stage')
          .in('status', ['processing', 'uploaded']);

        const { data: failedTenders } = await supabase
          .from('tenders')
          .select('id')
          .eq('status', 'failed');

        const totalProcessed = stats.total_tenders || 0;
        const failed = failedTenders?.length || 0;
        const processing = tendersProcessing?.length || 0;

        setPerformanceMetrics({
          avgResponseTime: 2500 + Math.floor(Math.random() * 1000), // Simulated
          errorRate: totalProcessed > 0 ? Number(((failed / totalProcessed) * 100).toFixed(2)) : 0,
          successRate: totalProcessed > 0 ? Number((((totalProcessed - failed) / totalProcessed) * 100).toFixed(2)) : 100,
          activeRequests: processing,
        });

        // Generate hourly heatmap data
        const heatmap = [];
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            activity: Math.floor(Math.random() * 100), // Simulated - would need time-based queries
          });
        }
        setHeatmapData(heatmap);

        // Get top companies using admin function
        const { data: topCompaniesList } = await supabase
          .rpc('get_admin_top_companies', { limit_count: 5 });

        setTopCompanies(topCompaniesList || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);


  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of your platform</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your platform performance and usage
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered companies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">
                Active: {stats.activeCompanies}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenders}</div>
              <p className="text-xs text-muted-foreground">
                Processed documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demo Submissions</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.demoSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Total try requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySignups}</div>
              <p className="text-xs text-muted-foreground">
                New demo submissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCompanies}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UsageChart data={usageData} />
          <ActivityHeatmap data={heatmapData} />
        </div>

        {/* Performance & Journey Metrics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PerformanceMetrics metrics={performanceMetrics} />
          <UserJourneyMetrics metrics={journeyMetrics} />
        </div>

        {/* Top Companies */}
        <TopCompaniesTable companies={topCompanies} />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;