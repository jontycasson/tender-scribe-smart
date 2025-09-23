-- Add unique constraint to tender_responses for proper upsert functionality
ALTER TABLE public.tender_responses 
ADD CONSTRAINT tender_responses_tender_question_unique 
UNIQUE (tender_id, question_index);