-- Create storage bucket for tender documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tender-documents', 'tender-documents', false);

-- Create storage policies for tender documents
CREATE POLICY "Users can upload their own tender documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tender-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own tender documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tender-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own tender documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tender-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own tender documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tender-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create tenders table
CREATE TABLE public.tenders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  parsed_data JSONB,
  status TEXT NOT NULL DEFAULT 'uploaded',
  deadline DATE,
  value DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tenders
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenders
CREATE POLICY "Users can view their own tenders" 
ON public.tenders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tenders" 
ON public.tenders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenders" 
ON public.tenders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenders" 
ON public.tenders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create tender_responses table
CREATE TABLE public.tender_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  ai_generated_answer TEXT,
  user_edited_answer TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tender_responses
ALTER TABLE public.tender_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tender_responses (via tender ownership)
CREATE POLICY "Users can view responses for their own tenders" 
ON public.tender_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tenders 
    WHERE tenders.id = tender_responses.tender_id 
    AND tenders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create responses for their own tenders" 
ON public.tender_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenders 
    WHERE tenders.id = tender_responses.tender_id 
    AND tenders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update responses for their own tenders" 
ON public.tender_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.tenders 
    WHERE tenders.id = tender_responses.tender_id 
    AND tenders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete responses for their own tenders" 
ON public.tender_responses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.tenders 
    WHERE tenders.id = tender_responses.tender_id 
    AND tenders.user_id = auth.uid()
  )
);

-- Create trigger for tenders updated_at
CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for tender_responses updated_at
CREATE TRIGGER update_tender_responses_updated_at
  BEFORE UPDATE ON public.tender_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();