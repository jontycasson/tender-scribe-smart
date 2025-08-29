import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Calendar, Building2, Settings, Trash2, RefreshCw, List, Folder, MoreVertical, ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("tenders");
  const [tenders, setTenders] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingTender, setDeletingTender] = useState<string | null>(null);
  const [reprocessingTender, setReprocessingTender] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [sortBy, setSortBy] = useState<'created_at' | 'deadline' | 'title' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [projects, setProjects] = useState<any[]>([]);
  const [unassignedTenders, setUnassignedTenders] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTenders();
      fetchCompanyProfile();
      fetchProjectsAndTenders();
    }
  }, [user]);

  // Auto-refresh processing tenders and real-time subscription
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to real-time updates for processing tenders
    const channel = supabase
      .channel('tender-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenders'
        },
        (payload) => {
          console.log('Real-time tender update:', payload);
          // Update local state with the changed tender
          setTenders(prev => prev.map(tender => 
            tender.id === payload.new.id ? { ...tender, ...payload.new } : tender
          ));
        }
      )
      .subscribe();

    // Fallback polling for processing tenders
    const hasProcessingTenders = tenders.some(tender => tender.status === 'processing');
    let interval: NodeJS.Timeout | null = null;
    
    if (hasProcessingTenders) {
      interval = setInterval(() => {
        console.log('Auto-refreshing tenders for processing status...');
        fetchTenders();
      }, 5000); // Check every 5 seconds
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [tenders, user]);

  const fetchTenders = async () => {
    try {
      // Get user's company profile ID first
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!companyProfile) {
        setTenders([]);
        return;
      }

      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('company_profile_id', companyProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
      await fetchProjectsAndTenders();
    } catch (error) {
      console.error('Error fetching tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCompanyProfile(data);
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "draft":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "uploaded":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "approved": return "Approved";
      case "draft": return "Draft";
      case "processing": return "Processing";
      case "uploaded": return "Uploaded";
      case "error": return "Error";
      default: return status;
    }
  };

  const handleDeleteTender = async (tender: any) => {
    if (!window.confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
      return;
    }

    setDeletingTender(tender.id);
    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('tender-documents')
        .remove([tender.file_url]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete tender responses
      const { error: responsesError } = await supabase
        .from('tender_responses')
        .delete()
        .eq('tender_id', tender.id);

      if (responsesError) throw responsesError;

      // Delete tender
      const { error: tenderError } = await supabase
        .from('tenders')
        .delete()
        .eq('id', tender.id);

      if (tenderError) throw tenderError;

      // Update local state
      setTenders(prev => prev.filter(t => t.id !== tender.id));
      
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
      setDeletingTender(null);
    }
  };

  const fetchProjectsAndTenders = async () => {
    try {
      // Get user's company profile ID
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!companyProfile) return;

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_profile_id', companyProfile.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Group tenders by project
      const projectsWithTenders = (projectsData || []).map(project => ({
        ...project,
        tenders: tenders.filter(tender => tender.project_id === project.id)
      }));

      // Get unassigned tenders
      const unassigned = tenders.filter(tender => !tender.project_id);

      setProjects(projectsWithTenders);
      setUnassignedTenders(unassigned);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const assignTenderToProject = async (tenderId: string, projectId: string) => {
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ project_id: projectId })
        .eq('id', tenderId);

      if (error) throw error;

      // Refresh the data
      await fetchTenders();
      
      toast({
        title: "Tender assigned",
        description: "Tender has been assigned to the project",
      });
    } catch (error) {
      console.error('Error assigning tender:', error);
      toast({
        title: "Error",
        description: "Failed to assign tender to project",
        variant: "destructive",
      });
    }
  };

  const getSortedTenders = () => {
    const tendersToSort = [...tenders];
    
    return tendersToSort.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
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
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const getProjectProgress = (projectTenders: any[]) => {
    if (projectTenders.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = projectTenders.filter(t => t.status === 'completed' || t.status === 'approved').length;
    return {
      completed,
      total: projectTenders.length,
      percentage: Math.round((completed / projectTenders.length) * 100)
    };
  };

  const handleReprocessTender = async (tender: any) => {
    setReprocessingTender(tender.id);
    try {
      // Update tender status to processing
      const { error: updateError } = await supabase
        .from('tenders')
        .update({ status: 'processing', parsed_data: null })
        .eq('id', tender.id)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Delete existing responses
      const { error: deleteError } = await supabase
        .from('tender_responses')
        .delete()
        .eq('tender_id', tender.id);

      if (deleteError) throw deleteError;

      // Call edge function to reprocess document
      const { data, error } = await supabase.functions.invoke('process-tender', {
        body: { tenderId: tender.id, filePath: tender.file_url }
      });

      if (error) throw error;

      // Update local state
      setTenders(prev => prev.map(t => 
        t.id === tender.id 
          ? { ...t, status: 'processing', parsed_data: null }
          : t
      ));

      toast({
        title: "Reprocessing started",
        description: "Document is being reprocessed. Please check back in a few moments.",
      });

      // Refresh tenders after a delay to show updated status
      setTimeout(() => {
        fetchTenders();
      }, 3000);

    } catch (error) {
      console.error('Error reprocessing tender:', error);
      toast({
        title: "Reprocessing failed",
        description: error.message || "Failed to reprocess document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReprocessingTender(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showNewTenderButton={true} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your tenders and company profile
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4 mr-1" />
                      List View
                    </Button>
                    <Button
                      variant={viewMode === 'grouped' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grouped')}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Grouped
                    </Button>
                  </div>
                  <Button asChild>
                    <Link to="/new-tender">
                      <Plus className="h-4 w-4 mr-2" />
                      New Tender Response
                    </Link>
                  </Button>
                </div>
              </div>

              {viewMode === 'list' && tenders.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sort by:</span>
                  </div>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest First</SelectItem>
                      <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </CardContent>
                </Card>
              ) : tenders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tenders yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by uploading your first tender document to generate AI-powered responses.
                    </p>
                    <Button asChild>
                      <Link to="/new-tender">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Tender
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : viewMode === 'list' ? (
                <div className="grid gap-4">
                  {getSortedTenders().map((tender) => (
                    <Card key={tender.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{tender.title}</CardTitle>
                          <Badge className={getStatusColor(tender.status)}>
                            {getStatusDisplay(tender.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Value</p>
                            <p className="font-medium">{tender.value ? `$${tender.value}` : 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deadline</p>
                            <p className="font-medium flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {tender.deadline ? formatDate(tender.deadline) : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {formatDate(tender.created_at)}
                            </p>
                          </div>
                           <div className="flex items-center justify-end gap-3">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/tender/${tender.id}`}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </Button>
                            {tender.status === 'error' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReprocessTender(tender)}
                                disabled={reprocessingTender === tender.id}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {reprocessingTender === tender.id ? 'Reprocessing...' : 'Reprocess'}
                              </Button>
                            )}
                            {!tender.project_id && projects.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Folder className="h-4 w-4 mr-2" />
                                    Assign to Project
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {projects.map((project) => (
                                    <DropdownMenuItem
                                      key={project.id}
                                      onClick={() => assignTenderToProject(tender.id, project.id)}
                                    >
                                      {project.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteTender(tender)}
                              disabled={deletingTender === tender.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deletingTender === tender.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                        {/* Processing Progress Bar */}
                        {tender.status === 'processing' && (
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {tender.processing_stage === 'extracting' && 'Extracting questions from document...'}
                                {tender.processing_stage === 'identifying' && 'Identifying question structure...'}
                                {tender.processing_stage === 'generating' && `Generating responses (${tender.processed_questions || 0}/${tender.total_questions || 0})`}
                              </span>
                              <span className="text-sm font-medium">{tender.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                style={{ width: `${tender.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Grouped View */
                <div className="space-y-6">
                  {/* Projects Grid */}
                  {projects.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2">
                      {projects.map((project) => {
                        const progress = getProjectProgress(project.tenders);
                        return (
                          <Card key={project.id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className="bg-primary/10 p-2 rounded-lg">
                                    <Folder className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                    {project.client_name && (
                                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                                        <Building2 className="h-3 w-3 mr-1" />
                                        {project.client_name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="secondary">
                                  {project.tenders.length} {project.tenders.length === 1 ? 'tender' : 'tenders'}
                                </Badge>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                              {project.description && (
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                              )}
                              
                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span>{progress.completed}/{progress.total} completed</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                              </div>

                              {/* Recent Tenders */}
                              {project.tenders.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Recent Tenders</h4>
                                  <div className="space-y-2">
                                    {project.tenders.slice(0, 3).map((tender) => (
                                      <div key={tender.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                          <Link 
                                            to={`/tender/${tender.id}`}
                                            className="text-sm font-medium truncate hover:underline"
                                          >
                                            {tender.title}
                                          </Link>
                                        </div>
                                        <Badge className={getStatusColor(tender.status)} variant="secondary">
                                          {tender.status}
                                        </Badge>
                                      </div>
                                    ))}
                                    {project.tenders.length > 3 && (
                                      <p className="text-xs text-muted-foreground text-center">
                                        +{project.tenders.length - 3} more tenders
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className="text-xs text-muted-foreground">
                                Created {formatDate(project.created_at)}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Unassigned Tenders */}
                  {unassignedTenders.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Unassigned Tenders ({unassignedTenders.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {unassignedTenders.map((tender) => (
                            <div key={tender.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <Link 
                                    to={`/tender/${tender.id}`}
                                    className="font-medium hover:underline"
                                  >
                                    {tender.title}
                                  </Link>
                                  <p className="text-sm text-muted-foreground">
                                    Created {formatDate(tender.created_at)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(tender.status)}>
                                  {tender.status}
                                </Badge>
                                
                                {projects.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {projects.map((project) => (
                                        <DropdownMenuItem
                                          key={project.id}
                                          onClick={() => assignTenderToProject(tender.id, project.id)}
                                        >
                                          Assign to {project.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Empty State for Grouped View */}
                  {projects.length === 0 && unassignedTenders.length === 0 && tenders.length > 0 && (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No projects created yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Switch to the Projects tab to create your first project and organize your tenders.
                        </p>
                        <Button variant="outline" onClick={() => setActiveTab('projects')}>
                          Go to Projects
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsView 
              tenders={tenders} 
              onTenderDeleted={(tenderId) => {
                setTenders(prev => prev.filter(t => t.id !== tenderId));
              }} 
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Company Profile</h3>
                <Button variant="outline" asChild>
                  <Link to="/onboarding">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
              </div>

              {!companyProfile ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Complete your company profile</h3>
                    <p className="text-muted-foreground mb-4">
                      Set up your company profile to generate better AI responses for tenders.
                    </p>
                    <Button asChild>
                      <Link to="/onboarding">
                        <Settings className="h-4 w-4 mr-2" />
                        Complete Profile
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{companyProfile.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Industry</p>
                        <p className="font-medium">{companyProfile.industry}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Team Size</p>
                        <p className="font-medium">{companyProfile.team_size}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Years in Business</p>
                        <p className="font-medium">{companyProfile.years_in_business}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Services Offered</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {companyProfile.services_offered?.map((service: string) => (
                          <Badge key={service} variant="secondary">
                            {service}
                          </Badge>
                        )) || <p className="text-muted-foreground">No services listed</p>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Mission Statement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{companyProfile.mission}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;