-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', false);

-- Create company_documents table
CREATE TABLE IF NOT EXISTS public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_profile_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  document_type text NOT NULL, -- 'policy', 'fact_sheet', 'other'
  extracted_content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_documents
CREATE POLICY "Users can view documents for their company"
  ON public.company_documents FOR SELECT
  USING (company_profile_id = get_user_company_profile_id());

CREATE POLICY "Users can upload documents for their company"
  ON public.company_documents FOR INSERT
  WITH CHECK (company_profile_id = get_user_company_profile_id() AND user_id = auth.uid());

CREATE POLICY "Users can update documents for their company"
  ON public.company_documents FOR UPDATE
  USING (company_profile_id = get_user_company_profile_id());

CREATE POLICY "Users can delete documents for their company"
  ON public.company_documents FOR DELETE
  USING (company_profile_id = get_user_company_profile_id());

-- Storage policies for company-documents bucket
CREATE POLICY "Users can view their company documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their company documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their company documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their company documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create index for faster queries
CREATE INDEX idx_company_documents_company_profile_id ON public.company_documents(company_profile_id);
CREATE INDEX idx_company_documents_user_id ON public.company_documents(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();