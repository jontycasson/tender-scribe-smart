-- Add comprehensive source tracking columns to tender_responses table
ALTER TABLE tender_responses 
ADD COLUMN IF NOT EXISTS source_location TEXT,
ADD COLUMN IF NOT EXISTS original_line_number INTEGER,
ADD COLUMN IF NOT EXISTS original_reference TEXT,
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS sheet_name TEXT,
ADD COLUMN IF NOT EXISTS section_name TEXT,
ADD COLUMN IF NOT EXISTS chunk_index INTEGER,
ADD COLUMN IF NOT EXISTS source_confidence DECIMAL(3,2);

-- Add index on source fields for better query performance
CREATE INDEX IF NOT EXISTS idx_tender_responses_source ON tender_responses(tender_id, original_line_number);

-- Add comment explaining the source tracking fields
COMMENT ON COLUMN tender_responses.source_location IS 'Human-readable description of where the question was found (e.g., "Sheet: Questionnaire", "Section 3: Technical Requirements")';
COMMENT ON COLUMN tender_responses.original_line_number IS 'Line number in the original document where the question was found';
COMMENT ON COLUMN tender_responses.original_reference IS 'Original question reference from document (e.g., "Q1.2", "A5")';
COMMENT ON COLUMN tender_responses.page_number IS 'Page number in the original PDF/Word document';
COMMENT ON COLUMN tender_responses.sheet_name IS 'Excel sheet name if source is a spreadsheet';
COMMENT ON COLUMN tender_responses.section_name IS 'Section or chapter name from document structure';
COMMENT ON COLUMN tender_responses.chunk_index IS 'Index of the text chunk during AI processing (for debugging)';
COMMENT ON COLUMN tender_responses.source_confidence IS 'Confidence score (0.0-1.0) for the accuracy of source location detection';