-- Add progress tracking columns to tenders table
ALTER TABLE public.tenders 
ADD COLUMN processing_stage text DEFAULT 'uploading',
ADD COLUMN processed_questions integer DEFAULT 0 NOT NULL,
ADD COLUMN total_questions integer DEFAULT 0 NOT NULL,
ADD COLUMN progress integer DEFAULT 0 NOT NULL,
ADD COLUMN last_activity_at timestamp with time zone DEFAULT now(),
ADD COLUMN error_message text;

-- Enable real-time updates for tenders table
ALTER TABLE public.tenders REPLICA IDENTITY FULL;

-- Add tenders table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenders;