-- Make the tender-documents bucket public for document previews
UPDATE storage.buckets 
SET public = true 
WHERE id = 'tender-documents';