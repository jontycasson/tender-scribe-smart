-- Add new columns to tenders table for content segmentation
ALTER TABLE public.tenders 
ADD COLUMN extracted_context jsonb,
ADD COLUMN extracted_instructions jsonb, 
ADD COLUMN extracted_questions jsonb,
ADD COLUMN extracted_other jsonb,
ADD COLUMN content_segments_count integer DEFAULT 0,
ADD COLUMN file_type_detected text;