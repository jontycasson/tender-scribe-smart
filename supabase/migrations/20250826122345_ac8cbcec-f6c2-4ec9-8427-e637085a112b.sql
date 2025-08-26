
-- 1) Add explicit ordering column for responses
ALTER TABLE public.tender_responses
ADD COLUMN IF NOT EXISTS question_index integer;

-- 2) Backfill a stable order for existing rows per tender (0-based)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tender_id ORDER BY created_at ASC, id ASC) - 1 AS idx
  FROM public.tender_responses
)
UPDATE public.tender_responses tr
SET question_index = ordered.idx
FROM ordered
WHERE tr.id = ordered.id
  AND tr.question_index IS NULL;

-- 3) Optional: add an index to make future ordering faster
CREATE INDEX IF NOT EXISTS tender_responses_tender_idx_order
  ON public.tender_responses (tender_id, question_index);
