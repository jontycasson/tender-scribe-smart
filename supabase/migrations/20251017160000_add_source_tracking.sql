-- Add source tracking fields to tender_responses table
-- This allows tracking where questions came from in the original document

ALTER TABLE public.tender_responses
ADD COLUMN IF NOT EXISTS original_reference TEXT,
ADD COLUMN IF NOT EXISTS source_location TEXT,
ADD COLUMN IF NOT EXISTS page_number INTEGER;

-- Add comment to explain these fields
COMMENT ON COLUMN public.tender_responses.original_reference IS 'Original question ID/number from the source document (e.g., "Q1.2", "Section A - Q5")';
COMMENT ON COLUMN public.tender_responses.source_location IS 'Where the question was found (e.g., "Sheet: Pricing Questions", "Section 3: Technical Requirements")';
COMMENT ON COLUMN public.tender_responses.page_number IS 'Page/tab number where the question was found';
