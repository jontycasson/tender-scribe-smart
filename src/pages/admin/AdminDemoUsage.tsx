import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Mail, Calendar, Building, Download, TestTube, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DemoSubmission {
  id: string;
  email: string;
  company_name?: string;
  question: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
}

interface DemoStats {
  total_submissions: number;
  unique_companies: number;
  submissions_last_24h: number;
  submissions_last_week: number;
}

const AdminDemoUsage = () => {
  const [submissions, setSubmissions] = useState<DemoSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<DemoSubmission[]>([]);
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDemoData();
  }, []);

  useEffect(() => {
    const filtered = submissions.filter(submission =>
      submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (submission.company_name && submission.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      submission.question.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm]);

  const fetchDemoData = async () => {
    try {
      // Fetch demo submissions (protected by RLS)
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('demo_uses')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching demo submissions:', submissionsError);
        toast({
          title: "Access Error",
          description: "Failed to load demo submissions. Admin access required.",
          variant: "destructive",
        });
        return;
      }

      // Fetch demo statistics (secured function)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_demo_usage_stats');

      if (statsError) {
        console.error('Error fetching demo stats:', statsError);
        toast({
          title: "Access Error", 
          description: "Failed to load demo statistics. Admin access required.",
          variant: "destructive",
        });
        return;
      }

      setSubmissions(submissionsData || []);
      const stats = Array.isArray(statsData) ? statsData[0] : statsData;
      setStats(stats);
    } catch (error) {
      console.error('Error fetching demo data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch demo usage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const exportToCSV = () => {
    const headers = ['Email', 'Company', 'Question', 'Submitted At', 'IP Address'];
    const csvContent = [
      headers.join(','),
      ...filteredSubmissions.map(submission => [
        `"${submission.email}"`,
        `"${submission.company_name || 'N/A'}"`,
        `"${submission.question.replace(/"/g, '""')}"`,
        `"${formatDate(submission.created_at)}"`,
        `"${submission.ip_address || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `demo-submissions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Demo submissions exported to CSV file",
    });
  };

  const getDomainFromEmail = (email: string) => {
    return email.split('@')[1] || '';
  };

  const getUniqueEmailDomains = () => {
    const domains = new Set(submissions.map(s => getDomainFromEmail(s.email)));
    return domains.size;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Demo Usage Analytics</h1>
            <p className="text-muted-foreground">Monitor and analyze demo submissions</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
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
            <h1 className="text-3xl font-bold tracking-tight">Demo Usage Analytics</h1>
            <p className="text-muted-foreground">
              Monitor demo submissions and track conversion opportunities
            </p>
          </div>
          <Button onClick={exportToCSV} disabled={filteredSubmissions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_submissions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.unique_companies || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.submissions_last_24h || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Domains</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueEmailDomains()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Submissions</CardTitle>
            <CardDescription>
              Filter submissions by email, company, or question content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, company name, or question..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Submissions ({filteredSubmissions.length})</CardTitle>
            <CardDescription>
              All demo submissions with contact details and questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No submissions found matching your search.' : 'No demo submissions found.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Question Preview</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{submission.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.company_name ? (
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{submission.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm truncate" title={submission.question}>
                            {submission.question}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getDomainFromEmail(submission.email)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(submission.created_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {submission.ip_address || 'Unknown'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDemoUsage;