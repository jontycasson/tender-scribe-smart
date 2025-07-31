-- Make the tender-documents bucket public for document previews
UPDATE storage.buckets 
SET public = true 
WHERE id = 'tender-documents';

-- Create comprehensive policies for the tender-documents bucket
-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view tender documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tender-documents' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload tender documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tender-documents' AND auth.uid() IS NOT NULL);

-- Allow users to update their own files
CREATE POLICY "Users can update their own tender documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tender-documents' AND auth.uid() = owner);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own tender documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tender-documents' AND auth.uid() = owner);