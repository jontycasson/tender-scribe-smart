-- Add metadata columns to tender_responses table for enhanced AI processing
ALTER TABLE public.tender_responses 
ADD COLUMN IF NOT EXISTS question_type text,
ADD COLUMN IF NOT EXISTS research_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS model_used text,
ADD COLUMN IF NOT EXISTS response_length integer,
ADD COLUMN IF NOT EXISTS processing_time_ms integer;