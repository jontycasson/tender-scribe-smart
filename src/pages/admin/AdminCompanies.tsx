import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Building, FileText, Calendar, TrendingUp, MoreHorizontal, Gift, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompanyMembersDialog } from "@/components/admin/companies/CompanyMembersDialog";
import { UserTendersDialog } from "@/components/admin/users/UserTendersDialog";
import { CreateCompanyDialog } from "@/components/admin/companies/CreateCompanyDialog";
import { Building2 } from "lucide-react";
import { EditCompanyDialog } from "@/components/admin/companies/EditCompanyDialog";
import { GrantComplimentaryDialog } from "@/components/admin/companies/GrantComplimentaryDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  subscription_status?: string;
  is_complimentary?: boolean;
  complimentary_reason?: string;
  plan_name?: string;
}

const AdminCompanies = () => {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [tendersDialogOpen, setTendersDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithStats | null>(null);
  const [createCompanyDialogOpen, setCreateCompanyDialogOpen] = useState(false);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<string | null>(null);
  const [grantComplimentaryDialogOpen, setGrantComplimentaryDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [companyForComplimentary, setCompanyForComplimentary] = useState<CompanyWithStats | null>(null);
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

      // Fetch company stats
      const { data: companiesData, error: statsError } = await supabase
        .rpc('get_admin_companies_with_stats');

      if (statsError) throw statsError;

      // Fetch subscription details separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('company_profiles')
        .select('id, subscription_status, is_complimentary, complimentary_reason, plan_name');

      if (profilesError) throw profilesError;

      console.log('Profiles data:', profilesData);
      console.log('Companies data:', companiesData);

      const subscriptionMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const companiesWithStats = (companiesData || []).map((company: any) => {
        const subscription = subscriptionMap.get(company.id);
        console.log(`Company ${company.company_name}:`, {
          id: company.id,
          subscription,
          is_complimentary: subscription?.is_complimentary
        });
        return {
          id: company.id,
          company_name: company.company_name,
          industry: company.industry,
          team_size: company.team_size,
          created_at: company.created_at,
          updated_at: company.updated_at,
          tenderCount: Number(company.tender_count) || 0,
          lastTenderDate: company.last_tender_date,
          activeProjects: Number(company.project_count) || 0,
          subscription_status: subscription?.subscription_status,
          is_complimentary: subscription?.is_complimentary === true,
          complimentary_reason: subscription?.complimentary_reason,
          plan_name: subscription?.plan_name,
        };
      }) as CompanyWithStats[];

      console.log('Final companies with stats:', companiesWithStats);
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

  const handleRevokeComplimentary = async () => {
    if (!companyForComplimentary) return;

    try {
      const { data, error } = await supabase.rpc('admin_revoke_complimentary_access', {
        target_company_id: companyForComplimentary.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke complimentary access');
      }

      toast({
        title: "Success",
        description: `Complimentary access revoked for ${companyForComplimentary.company_name}. Company moved to trial status.`
      });

      fetchCompanies();
      setRevokeDialogOpen(false);
      setCompanyForComplimentary(null);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
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
    <Button onClick={() => setCreateCompanyDialogOpen(true)}>
      <Building2 className="mr-2 h-4 w-4" />
      Create Company
    </Button>
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
                    <TableHead>Plan</TableHead>
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
                            <div>
                              <div className="font-medium">{company.company_name}</div>
                              {company.is_complimentary && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Gift className="h-3 w-3 text-primary" />
                                  <span className="text-xs text-muted-foreground">
                                    Complimentary
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {company.is_complimentary ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              <Gift className="h-3 w-3 mr-1" />
                              {company.plan_name || 'Enterprise'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {company.plan_name || 'Solo'}
                            </Badge>
                          )}
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
                            <DropdownMenuContent align="end" className="bg-background">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setTendersDialogOpen(true);
                                }}
                              >
                                View Tenders
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setCompanyToEdit(company.id);
                                  setEditCompanyDialogOpen(true);
                                }}
                              >
                                Edit Company
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setMembersDialogOpen(true);
                                }}
                              >
                                Manage Members
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {company.is_complimentary ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCompanyForComplimentary(company);
                                    setRevokeDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Revoke Complimentary Access
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCompanyForComplimentary(company);
                                    setGrantComplimentaryDialogOpen(true);
                                  }}
                                >
                                  <Gift className="mr-2 h-4 w-4" />
                                  Grant Complimentary Access
                                </DropdownMenuItem>
                              )}
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

      {selectedCompany && (
        <>
          <CompanyMembersDialog
            open={membersDialogOpen}
            onOpenChange={setMembersDialogOpen}
            companyId={selectedCompany.id}
            companyName={selectedCompany.company_name}
          />
          <UserTendersDialog
            open={tendersDialogOpen}
            onOpenChange={setTendersDialogOpen}
            userId=""
            userEmail={selectedCompany.company_name}
          />
        </>
      )}

      <CreateCompanyDialog
        open={createCompanyDialogOpen}
        onOpenChange={setCreateCompanyDialogOpen}
        onSuccess={fetchCompanies}
      />

      {companyToEdit && (
        <EditCompanyDialog
          open={editCompanyDialogOpen}
          onOpenChange={setEditCompanyDialogOpen}
          companyId={companyToEdit}
          onSuccess={fetchCompanies}
        />
      )}

      {companyForComplimentary && (
        <>
          <GrantComplimentaryDialog
            open={grantComplimentaryDialogOpen}
            onOpenChange={setGrantComplimentaryDialogOpen}
            companyId={companyForComplimentary.id}
            companyName={companyForComplimentary.company_name}
            onSuccess={fetchCompanies}
          />

          <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke Complimentary Access</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to revoke complimentary access for <strong>{companyForComplimentary.company_name}</strong>?
                  <br /><br />
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Move them to trial status (14 days, 10 tenders)</li>
                    <li>Start their trial period immediately</li>
                    <li>Log this action in subscription events</li>
                  </ul>
                  {companyForComplimentary.complimentary_reason && (
                    <div className="mt-3 p-2 bg-muted rounded text-sm">
                      <strong>Original reason:</strong> {companyForComplimentary.complimentary_reason}
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevokeComplimentary} className="bg-destructive hover:bg-destructive/90">
                  Revoke Access
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminCompanies;
