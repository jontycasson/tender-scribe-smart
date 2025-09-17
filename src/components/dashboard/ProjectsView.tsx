import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Folder, FileText, Calendar, Building2, Users, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  description: string;
  client_name: string;
  created_at: string;
  tenders: any[];
}

interface ProjectsViewProps {
  tenders: any[];
  onRefresh: () => Promise<void>;
}

export const ProjectsView = ({ tenders, onRefresh }: ProjectsViewProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [unassignedTenders, setUnassignedTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectsAndTenders();
  }, [tenders]);

  const fetchProjectsAndTenders = async () => {
    try {
      // Get user's company profile ID
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!companyProfile) {
        setLoading(false);
        return;
      }

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
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user's company profile ID
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!companyProfile) {
        toast({
          title: "Company profile required",
          description: "Please complete your company profile first",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...newProject,
          company_profile_id: companyProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add new project to state
      setProjects(prev => [{ ...data, tenders: [] }, ...prev]);
      
      // Reset form
      setNewProject({ name: '', description: '', client_name: '' });
      setShowCreateProject(false);
      
      toast({
        title: "Project created",
        description: `Project "${data.name}" has been created successfully`,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
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
      fetchProjectsAndTenders();
      
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
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

  const getProjectProgress = (projectTenders: any[]) => {
    if (projectTenders.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = projectTenders.filter(t => t.status === 'completed' || t.status === 'approved').length;
    return {
      completed,
      total: projectTenders.length,
      percentage: Math.round((completed / projectTenders.length) * 100)
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Projects</h3>
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. City Council Infrastructure Upgrade"
                />
              </div>
              <div>
                <Label htmlFor="client">Client Name</Label>
                <Input
                  id="client"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="e.g. Manchester City Council"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                  Cancel
                </Button>
                <Button onClick={createProject}>
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
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
                {project.tenders.length > 0 ? (
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
                ) : (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tenders assigned yet</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link to="/new-tender">
                        Add First Tender
                      </Link>
                    </Button>
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

      {/* Unassigned Tenders */}
      {unassignedTenders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {projects.length === 0 && unassignedTenders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to organise related tender documents together.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowCreateProject(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Project
              </Button>
              <Button variant="outline" asChild>
                <Link to="/new-tender">
                  Upload Tender Document
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};