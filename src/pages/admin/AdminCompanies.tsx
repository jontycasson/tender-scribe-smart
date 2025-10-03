import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Building, FileText, Calendar, TrendingUp, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CompanyWithStats {
  id: string;
  company_name: string;
  industry: string;
  team_size: string;
  created_at: string;
  updated_at: string;
  tenderCount?: number;
  lastTenderDate?: string;
  activeProjects?: number;
}

const AdminCompanies = () => {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const filtered = companies.filter(company =>
      company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [companies, searchTerm]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);

      const { data: companiesData, error } = await supabase
        .rpc('get_admin_companies_with_stats');

      if (error) throw error;

      const companiesWithStats = (companiesData || []).map((company: any) => ({
        id: company.id,
        company_name: company.company_name,
        industry: company.industry,
        team_size: company.team_size,
        created_at: company.created_at,
        updated_at: company.updated_at,
        tenderCount: Number(company.tender_count) || 0,
        lastTenderDate: company.last_tender_date,
        activeProjects: Number(company.project_count) || 0,
      })) as CompanyWithStats[];

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getActivityStatus = (lastTenderDate?: string) => {
    if (!lastTenderDate) return { status: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    
    const daysSince = Math.floor((Date.now() - new Date(lastTenderDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince <= 7) return { status: 'Very Active', color: 'bg-green-100 text-green-800' };
    if (daysSince <= 30) return { status: 'Active', color: 'bg-blue-100 text-blue-800' };
    if (daysSince <= 90) return { status: 'Moderate', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Low Activity', color: 'bg-orange-100 text-orange-800' };
  };

  const getTeamSizeColor = (teamSize: string) => {
    switch (teamSize) {
      case '1-10': return 'bg-green-100 text-green-800';
      case '11-50': return 'bg-blue-100 text-blue-800';
      case '51-200': return 'bg-yellow-100 text-yellow-800';
      case '201-1000': return 'bg-orange-100 text-orange-800';
      case '1000+': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
            <p className="text-muted-foreground">Monitor and manage company accounts</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
            <p className="text-muted-foreground">
              Monitor and manage company accounts ({companies.length} total)
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies.filter(c => c.lastTenderDate && 
                  Math.floor((Date.now() - new Date(c.lastTenderDate).getTime()) / (1000 * 60 * 60 * 24)) <= 30
                ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies.reduce((sum, c) => sum + (c.tenderCount || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies.reduce((sum, c) => sum + (c.activeProjects || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Companies</CardTitle>
            <CardDescription>
              Filter companies by name or industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company name or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Companies ({filteredCompanies.length})</CardTitle>
            <CardDescription>
              All registered companies and their activity statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No companies found matching your search.' : 'No companies found.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Team Size</TableHead>
                    <TableHead>Tenders</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Last Tender</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => {
                    const activityStatus = getActivityStatus(company.lastTenderDate);
                    return (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{company.company_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.industry}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={getTeamSizeColor(company.team_size)}
                          >
                            {company.team_size}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{company.tenderCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{company.activeProjects || 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={activityStatus.color}
                          >
                            {activityStatus.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDate(company.lastTenderDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                View Tenders
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                View Projects
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Contact Company
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCompanies;