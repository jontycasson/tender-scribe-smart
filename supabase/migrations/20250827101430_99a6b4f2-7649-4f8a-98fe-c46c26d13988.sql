-- Fix stuck processing tenders that should be draft
UPDATE public.tenders 
SET status = 'draft' 
WHERE status = 'processing' 
AND id IN (
  SELECT DISTINCT tender_id 
  FROM public.tender_responses
);