import { useReducer, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Calendar, Building2, Settings, Trash2, RefreshCw, List, Folder, MoreVertical, ArrowUpDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Types
interface CompanyProfile {
  id: string;
  company_name: string;
  industry: string;
  team_size: string;
  years_in_business: string;
  services_offered?: string[];
  mission?: string;
}

interface Tender {
  id: string;
  title: string;
  status: string;
  value?: string;
  deadline?: string;
  created_at: string;
  project_id?: string;
  file_url: string;
  processing_stage?: string;
  error_message?: string;
  progress?: number;
  processed_questions?: number;
  total_questions?: number;
}

interface Project {
  id: string;
  name: string;
  client_name?: string;
  description?: string;
  created_at: string;
}

// Reducer for state management
interface DashboardState {
  tenders: Tender[];
  projects: Project[];
  companyProfile: CompanyProfile | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  activeTab: string;
  viewMode: 'list' | 'grouped';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  refreshing: boolean;
}

type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TENDERS'; payload: Tender[] }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_COMPANY_PROFILE'; payload: CompanyProfile | null }
  | { type: 'SET_IS_ADMIN'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'grouped' }
  | { type: 'SET_SORT_BY'; payload: string }
  | { type: 'SET_SORT_ORDER'; payload: 'asc' | 'desc' }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'UPDATE_TENDER'; payload: Tender }
  | { type: 'REMOVE_TENDER'; payload: string };

const initialState: DashboardState = {
  tenders: [],
  projects: [],
  companyProfile: null,
  loading: false,
  error: null,
  isAdmin: false,
  activeTab: 'tenders',
  viewMode: 'list',
  sortBy: 'created_at',
  sortOrder: 'desc',
  refreshing: false,
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TENDERS':
      return { ...state, tenders: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_COMPANY_PROFILE':
      return { ...state, companyProfile: action.payload };
    case 'SET_IS_ADMIN':
      return { ...state, isAdmin: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'UPDATE_TENDER':
      return {
        ...state,
        tenders: state.tenders.map(tender =>
          tender.id === action.payload.id ? action.payload : tender
        )
      };
    case 'REMOVE_TENDER':
      return {
        ...state,
        tenders: state.tenders.filter(tender => tender.id !== action.payload)
      };
    default:
      return state;
  }
}

export default function Dashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Memoized callbacks to prevent re-renders
  const checkAdminStatus = useCallback(async () => {
    if (!user?.id) return false;
    
    try {
      const { data, error } = await supabase
        .rpc('is_admin', { check_user_id: user.id });
      
      if (error) {
        console.error('Admin check error:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Admin check failed:', error);
      return false;
    }
  }, [user?.id]);

  const fetchTenders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      dispatch({ type: 'SET_TENDERS', payload: data || [] });
    } catch (error) {
      console.error('Error fetching tenders:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load tenders' });
    }
  }, [user?.id]);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      dispatch({ type: 'SET_PROJECTS', payload: data || [] });
    } catch (error) {
      console.error('Error fetching projects:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load projects' });
    }
  }, [user?.id]);

  const fetchCompanyProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      dispatch({ type: 'SET_COMPANY_PROFILE', payload: data || null });
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  }, [user?.id]);

  // Setup real-time subscriptions with cleanup
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user?.id) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel('tender-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            dispatch({ type: 'UPDATE_TENDER', payload: payload.new as Tender });
          } else if (payload.eventType === 'DELETE') {
            dispatch({ type: 'REMOVE_TENDER', payload: payload.old.id });
          }
        }
      )
      .subscribe();
  }, [user?.id]);

  // Setup polling for processing tenders with cleanup
  const setupPolling = useCallback(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const hasProcessingTenders = state.tenders.some(
      tender => tender.status === 'processing'
    );

    if (hasProcessingTenders) {
      intervalRef.current = setInterval(() => {
        fetchTenders();
      }, 2000);
    }
  }, [state.tenders, fetchTenders]);

  // Initial data load
  useEffect(() => {
    if (!user?.id) {
      navigate('/auth');
      return;
    }

    const loadInitialData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const [adminStatus] = await Promise.all([
          checkAdminStatus(),
          fetchTenders(),
          fetchProjects(),
          fetchCompanyProfile()
        ]);
        
        dispatch({ type: 'SET_IS_ADMIN', payload: adminStatus });
      } catch (error) {
        console.error('Error loading initial data:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load dashboard data' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();
    setupRealtimeSubscriptions();
  }, [user?.id, checkAdminStatus, fetchTenders, fetchProjects, fetchCompanyProfile, setupRealtimeSubscriptions, navigate]);

  // Setup polling when tenders change
  useEffect(() => {
    setupPolling();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Additional authorization check
      const { data: tender } = await supabase
        .from('tenders')
        .select('user_id')
        .eq('id', id)
        .single();
        
      if (tender?.user_id !== user?.id) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to delete this tender.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      dispatch({ type: 'REMOVE_TENDER', payload: id });
      toast({
        title: "Success",
        description: "Tender deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting tender:', error);
      toast({
        title: "Error",
        description: "Failed to delete tender",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user?.id, toast]);

  const handleRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    
    try {
      await Promise.all([
        fetchTenders(),
        fetchProjects(),
        fetchCompanyProfile()
      ]);
      
      toast({
        title: "Success",
        description: "Dashboard refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh dashboard",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, [fetchTenders, fetchProjects, fetchCompanyProfile, toast]);

  const handleSort = useCallback((sortBy: string) => {
    if (state.sortBy === sortBy) {
      dispatch({ 
        type: 'SET_SORT_ORDER', 
        payload: state.sortOrder === 'asc' ? 'desc' : 'asc' 
      });
    } else {
      dispatch({ type: 'SET_SORT_BY', payload: sortBy });
      dispatch({ type: 'SET_SORT_ORDER', payload: 'desc' });
    }
  }, [state.sortBy, state.sortOrder]);

  const assignTenderToProject = useCallback(async (tenderId: string, projectId: string) => {
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ project_id: projectId })
        .eq('id', tenderId)
        .eq('user_id', user?.id); // Additional security check

      if (error) throw error;

      dispatch({
        type: 'UPDATE_TENDER',
        payload: {
          ...state.tenders.find(t => t.id === tenderId)!,
          project_id: projectId
        }
      });

      toast({
        title: "Success",
        description: "Tender assigned to project",
      });
    } catch (error) {
      console.error('Error assigning tender:', error);
      toast({
        title: "Error",
        description: "Failed to assign tender to project",
        variant: "destructive",
      });
    }
  }, [user?.id, state.tenders, toast]);

  // Memoized sorted tenders
  const sortedTenders = useCallback(() => {
    return [...state.tenders].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'deadline':
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }
      
      if (state.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [state.tenders, state.sortBy, state.sortOrder]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-blue-500">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProjectProgress = useCallback((projectTenders: Tender[]) => {
    if (projectTenders.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = projectTenders.filter(t => t.status === 'completed' || t.status === 'approved').length;
    return {
      completed,
      total: projectTenders.length,
      percentage: Math.round((completed / projectTenders.length) * 100)
    };
  }, []);

  if (state.loading && state.tenders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation showNewTenderButton={true} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showNewTenderButton={true} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {state.error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{state.error}</p>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
              <p className="text-muted-foreground">
                Manage your tenders and company profile
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={state.refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${state.refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={state.activeTab} onValueChange={(value) => dispatch({ type: 'SET_ACTIVE_TAB', payload: value })}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="tenders">Recent Tenders</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="tenders" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Tenders</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={state.viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'list' })}
                    >
                      <List className="h-4 w-4 mr-1" />
                      List View
                    </Button>
                    <Button
                      variant={state.viewMode === 'grouped' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'grouped' })}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Grouped
                    </Button>
                  </div>
                  <Link to="/upload">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Tender
                    </Button>
                  </Link>
                </div>
              </div>

              {state.tenders.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No tenders yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Get started by uploading your first tender document
                    </p>
                    <Link to="/upload">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Tender
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Tenders ({state.tenders.length})</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('title')}
                        >
                          Title
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('deadline')}
                        >
                          Deadline
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('created_at')}
                        >
                          Created
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sortedTenders().map((tender) => (
                        <div
                          key={tender.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <Link
                                to={`/tenders/${tender.id}`}
                                className="text-lg font-medium hover:text-primary truncate"
                              >
                                {tender.title}
                              </Link>
                              {getStatusBadge(tender.status)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {tender.deadline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(tender.deadline).toLocaleDateString()}
                                </div>
                              )}
                              <span>Created {new Date(tender.created_at).toLocaleDateString()}</span>
                            </div>

                            {tender.status === 'processing' && tender.progress && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span>Processing progress</span>
                                  <span>{tender.progress}%</span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${tender.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Select
                              onValueChange={(projectId) => assignTenderToProject(tender.id, projectId)}
                              value={tender.project_id || ''}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Assign to project" />
                              </SelectTrigger>
                              <SelectContent>
                                {state.projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem asChild>
                                  <Link to={`/tenders/${tender.id}`}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(tender.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsView
              projects={state.projects}
              tenders={state.tenders}
              onRefresh={handleRefresh}
              getProjectProgress={getProjectProgress}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <div className="max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {state.companyProfile ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                          <p className="text-lg">{state.companyProfile.company_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Industry</label>
                          <p className="text-lg">{state.companyProfile.industry}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Team Size</label>
                          <p className="text-lg">{state.companyProfile.team_size}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Years in Business</label>
                          <p className="text-lg">{state.companyProfile.years_in_business}</p>
                        </div>
                      </div>
                      
                      {state.companyProfile.services_offered && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Services Offered</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {state.companyProfile.services_offered.map((service, index) => (
                              <Badge key={index} variant="secondary">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {state.companyProfile.mission && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Mission Statement</label>
                          <p className="mt-2">{state.companyProfile.mission}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <Link to="/onboarding">
                          <Button>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Complete your profile</h3>
                      <p className="text-muted-foreground mb-6">
                        Add your company information to get personalized tender recommendations
                      </p>
                      <Link to="/onboarding">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Set Up Profile
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
