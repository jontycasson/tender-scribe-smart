-- Add foreign key constraint for tenders.company_profile_id -> company_profiles.id
ALTER TABLE public.tenders 
ADD CONSTRAINT fk_tenders_company_profile_id 
FOREIGN KEY (company_profile_id) 
REFERENCES public.company_profiles(id) 
ON DELETE CASCADE;