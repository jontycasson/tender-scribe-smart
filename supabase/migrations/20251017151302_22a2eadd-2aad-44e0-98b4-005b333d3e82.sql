-- Fix stuck tenders that never processed
UPDATE tenders 
SET 
  status = 'error',
  error_message = 'Processing timed out or failed to start. The tender document upload was interrupted. Please try uploading again or contact support if the issue persists.',
  processing_stage = 'error',
  updated_at = now()
WHERE id IN ('ee5655c3-3f95-463f-ad99-450ae9b8c20f', '50a4c5de-3eea-4f9f-a78d-95a0edfc6bbb')
  AND status = 'processing';