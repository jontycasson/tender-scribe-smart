-- Fix critical RLS security gaps and database function security issues

-- 1. First, let's update any tenders with NULL company_profile_id
-- We'll set them to the company profile of their user_id
UPDATE tenders 
SET company_profile_id = (
  SELECT cp.id 
  FROM company_profiles cp 
  WHERE cp.user_id = tenders.user_id 
  LIMIT 1
)
WHERE company_profile_id IS NULL 
AND user_id IS NOT NULL;

-- 2. Make company_profile_id NOT NULL in tenders table (with proper constraint)
ALTER TABLE tenders 
ALTER COLUMN company_profile_id SET NOT NULL;

-- 3. Fix the critical security gap in tender_responses table
-- First, update NULL company_profile_id values in tender_responses
UPDATE tender_responses 
SET company_profile_id = (
  SELECT t.company_profile_id 
  FROM tenders t 
  WHERE t.id = tender_responses.tender_id 
  LIMIT 1
)
WHERE company_profile_id IS NULL;

-- 4. Make company_profile_id NOT NULL in tender_responses table
ALTER TABLE tender_responses 
ALTER COLUMN company_profile_id SET NOT NULL;

-- 5. Fix database function security by updating search_path
CREATE OR REPLACE FUNCTION public.get_user_company_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- Get company profile where user is the owner
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
$$;

-- 6. Fix the match_qa_memory function security
CREATE OR REPLACE FUNCTION public.match_qa_memory(query_embedding vector, company_id uuid, match_threshold double precision DEFAULT 0.8, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, question text, answer text, confidence_score double precision, similarity double precision, usage_count integer, source_tender_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER  
SET search_path = public
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

-- 7. Fix the update_updated_at_column function security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 8. Fix the set_user_id function security
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set user_id if it's not already provided and auth.uid() is available
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 9. Add constraints to prevent future NULL company_profile_id insertions
ALTER TABLE tenders 
ADD CONSTRAINT tenders_company_profile_id_required 
CHECK (company_profile_id IS NOT NULL);

ALTER TABLE tender_responses 
ADD CONSTRAINT tender_responses_company_profile_id_required 
CHECK (company_profile_id IS NOT NULL);

-- 10. Add foreign key constraints for better data integrity
ALTER TABLE tenders 
ADD CONSTRAINT fk_tenders_company_profile 
FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;

ALTER TABLE tender_responses 
ADD CONSTRAINT fk_tender_responses_company_profile 
FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;

ALTER TABLE tender_responses 
ADD CONSTRAINT fk_tender_responses_tender 
FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE;

-- 11. Add index for better RLS performance
CREATE INDEX IF NOT EXISTS idx_tenders_company_profile_id ON tenders(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_tender_responses_company_profile_id ON tender_responses(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_qa_memory_company_profile_id ON qa_memory(company_profile_id);