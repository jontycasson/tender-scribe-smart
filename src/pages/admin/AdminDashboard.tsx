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
        // Get user count from auth.users via a simple company_profiles count (proxy)
        const { count: userCount } = await supabase
          .from('company_profiles')
          .select('*', { count: 'exact', head: true });

        // Get company count
        const { count: companyCount } = await supabase
          .from('company_profiles')
          .select('*', { count: 'exact', head: true });

        // Get tender count
        const { count: tenderCount } = await supabase
          .from('tenders')
          .select('*', { count: 'exact', head: true });

        // Get demo submissions count (secured function)
        const { data: demoStats, error: demoStatsError } = await supabase
          .rpc('get_demo_usage_stats');
        
        if (demoStatsError) {
          console.error('Error fetching demo stats:', demoStatsError);
          // Continue without demo stats if access denied
        }

        // Get recent companies (active ones)
        const { count: activeCompaniesCount } = await supabase
          .from('company_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Get recent activity (recent tenders)
        const { data: recentTenders } = await supabase
          .from('tenders')
          .select(`
            id,
            title,
            created_at,
            status,
            company_profiles!inner(company_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        const statsData = Array.isArray(demoStats) ? demoStats[0] : demoStats;

        setStats({
          totalUsers: userCount || 0,
          totalCompanies: companyCount || 0,
          totalTenders: tenderCount || 0,
          demoSubmissions: statsData?.total_submissions || 0,
          todaySignups: statsData?.submissions_last_24h || 0,
          activeCompanies: activeCompaniesCount || 0,
        });

        // Fetch usage trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: tendersByDay } = await supabase
          .from('tenders')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: responsesByDay } = await supabase
          .from('tender_responses')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString());

        // Group by day for usage chart
        const usageMap = new Map();
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          usageMap.set(dateStr, { date: dateStr, tenders: 0, responses: 0, users: 0 });
        }

        tendersByDay?.forEach(tender => {
          const dateStr = new Date(tender.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (usageMap.has(dateStr)) {
            usageMap.get(dateStr).tenders++;
          }
        });

        responsesByDay?.forEach(response => {
          const dateStr = new Date(response.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (usageMap.has(dateStr)) {
            usageMap.get(dateStr).responses++;
          }
        });

        const usageArray = Array.from(usageMap.values()).reverse();
        setUsageData(usageArray);

        // Calculate user journey metrics
        const { data: allCompanies } = await supabase
          .from('company_profiles')
          .select('id, created_at');

        const { data: companiesWithTenders } = await supabase
          .from('tenders')
          .select('company_profile_id')
          .not('company_profile_id', 'is', null);

        const uniqueCompaniesWithTenders = new Set(companiesWithTenders?.map(t => t.company_profile_id));
        
        const onboardingComplete = allCompanies?.length || 0;
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
            value: activeCompaniesCount || 0,
            total: onboardingComplete,
            percentage: onboardingComplete > 0 ? Math.round(((activeCompaniesCount || 0) / onboardingComplete) * 100) : 0,
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

        const totalProcessed = tenderCount || 0;
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

        // Get top companies by activity
        const { data: companiesActivity } = await supabase
          .from('company_profiles')
          .select(`
            company_name,
            updated_at,
            tenders(count),
            tender_responses(count)
          `)
          .order('updated_at', { ascending: false })
          .limit(5);

        const topCompaniesList = companiesActivity?.map(company => ({
          company_name: company.company_name,
          tender_count: company.tenders?.[0]?.count || 0,
          response_count: company.tender_responses?.[0]?.count || 0,
          last_active: company.updated_at,
        })) || [];

        setTopCompanies(topCompaniesList);

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