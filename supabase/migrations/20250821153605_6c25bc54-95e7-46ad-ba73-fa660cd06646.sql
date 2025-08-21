-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create company_members table for multi-user company access
CREATE TABLE public.company_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_profile_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_profile_id, user_id)
);

-- Create qa_memory table for storing question-answer pairs with embeddings
CREATE TABLE public.qa_memory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_profile_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_embedding vector(1536),
    confidence_score FLOAT DEFAULT 0.0,
    source_tender_id UUID REFERENCES public.tenders(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_memory ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_profile_id);
CREATE INDEX idx_qa_memory_company_id ON public.qa_memory(company_profile_id);

-- Create IVFFLAT index for vector similarity search (after we have some data)
-- We'll create this with a small lists parameter for now
CREATE INDEX idx_qa_memory_embedding ON public.qa_memory 
USING ivfflat (question_embedding vector_cosine_ops) WITH (lists = 10);

-- Add company_profile_id to tenders table
ALTER TABLE public.tenders ADD COLUMN company_profile_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE;

-- Add company_profile_id to tender_responses table  
ALTER TABLE public.tender_responses ADD COLUMN company_profile_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE;

-- Create function to get user's company profile ID
CREATE OR REPLACE FUNCTION public.get_user_company_profile_id()
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    SELECT cp.id INTO profile_id
    FROM public.company_profiles cp
    WHERE cp.user_id = auth.uid()
    LIMIT 1;
    
    -- If no direct profile, check company_members
    IF profile_id IS NULL THEN
        SELECT cm.company_profile_id INTO profile_id
        FROM public.company_members cm
        WHERE cm.user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create RLS policies for company_members
CREATE POLICY "Users can view company members for their companies" 
ON public.company_members 
FOR SELECT 
USING (
    company_profile_id = public.get_user_company_profile_id() OR
    EXISTS (
        SELECT 1 FROM public.company_profiles cp 
        WHERE cp.id = company_profile_id AND cp.user_id = auth.uid()
    )
);

CREATE POLICY "Company owners can manage members" 
ON public.company_members 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.company_profiles cp 
        WHERE cp.id = company_profile_id AND cp.user_id = auth.uid()
    )
);

-- Create RLS policies for qa_memory
CREATE POLICY "Users can view QA memory for their company" 
ON public.qa_memory 
FOR SELECT 
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can create QA memory for their company" 
ON public.qa_memory 
FOR INSERT 
WITH CHECK (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can update QA memory for their company" 
ON public.qa_memory 
FOR UPDATE 
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can delete QA memory for their company" 
ON public.qa_memory 
FOR DELETE 
USING (company_profile_id = public.get_user_company_profile_id());

-- Update tenders RLS policies to use company_profile_id
DROP POLICY "Users can view their own tenders" ON public.tenders;
DROP POLICY "Users can create their own tenders" ON public.tenders;
DROP POLICY "Users can update their own tenders" ON public.tenders;
DROP POLICY "Users can delete their own tenders" ON public.tenders;

CREATE POLICY "Users can view tenders for their company" 
ON public.tenders 
FOR SELECT 
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can create tenders for their company" 
ON public.tenders 
FOR INSERT 
WITH CHECK (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can update tenders for their company" 
ON public.tenders 
FOR UPDATE 
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can delete tenders for their company" 
ON public.tenders 
FOR DELETE 
USING (company_profile_id = public.get_user_company_profile_id());

-- Update tender_responses RLS policies to use company_profile_id
DROP POLICY "Users can view responses for their own tenders" ON public.tender_responses;
DROP POLICY "Users can create responses for their own tenders" ON public.tender_responses;
DROP POLICY "Users can update responses for their own tenders" ON public.tender_responses;
DROP POLICY "Users can delete responses for their own tenders" ON public.tender_responses;

CREATE POLICY "Users can view responses for their company tenders" 
ON public.tender_responses 
FOR SELECT 
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can create responses for their company tenders" 
ON public.tender_responses 
FOR INSERT 
WITH CHECK (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can update responses for their company tenders" 
ON public.tender_responses 
FOR UPDATE 
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can delete responses for their company tenders" 
ON public.tender_responses 
FOR DELETE 
USING (company_profile_id = public.get_user_company_profile_id());

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION public.match_qa_memory(
    query_embedding vector(1536),
    company_id UUID,
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    question TEXT,
    answer TEXT,
    confidence_score FLOAT,
    similarity FLOAT,
    usage_count INTEGER,
    source_tender_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qa.id,
        qa.question,
        qa.answer,
        qa.confidence_score,
        1 - (qa.question_embedding <=> query_embedding) as similarity,
        qa.usage_count,
        qa.source_tender_id,
        qa.created_at
    FROM public.qa_memory qa
    WHERE qa.company_profile_id = company_id
    AND 1 - (qa.question_embedding <=> query_embedding) > match_threshold
    ORDER BY qa.question_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_company_members_updated_at
    BEFORE UPDATE ON public.company_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qa_memory_updated_at
    BEFORE UPDATE ON public.qa_memory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();