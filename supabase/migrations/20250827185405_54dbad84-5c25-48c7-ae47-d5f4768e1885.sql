-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  company_profile_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Add project_id to tenders table (nullable for backward compatibility)
ALTER TABLE public.tenders ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create RLS policies for projects
CREATE POLICY "Users can view projects for their company" 
ON public.projects 
FOR SELECT 
USING (company_profile_id = get_user_company_profile_id());

CREATE POLICY "Users can create projects for their company" 
ON public.projects 
FOR INSERT 
WITH CHECK (company_profile_id = get_user_company_profile_id());

CREATE POLICY "Users can update projects for their company" 
ON public.projects 
FOR UPDATE 
USING (company_profile_id = get_user_company_profile_id());

CREATE POLICY "Users can delete projects for their company" 
ON public.projects 
FOR DELETE 
USING (company_profile_id = get_user_company_profile_id());

-- Add trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();