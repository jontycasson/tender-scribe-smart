-- Create storage policies for tender-documents bucket
-- Allow authenticated users to insert files into tender-documents bucket
CREATE POLICY "Users can upload tender documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'tender-documents');

-- Allow authenticated users to view files in tender-documents bucket
CREATE POLICY "Users can view tender documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'tender-documents');

-- Allow authenticated users to update files in tender-documents bucket
CREATE POLICY "Users can update tender documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'tender-documents');

-- Allow authenticated users to delete files in tender-documents bucket
CREATE POLICY "Users can delete tender documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'tender-documents');