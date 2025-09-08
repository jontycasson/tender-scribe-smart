-- Create demo_uses table to track trial usage per email/IP
CREATE TABLE public.demo_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  company_name TEXT,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_uses ENABLE ROW LEVEL SECURITY;

-- Create index for email lookups
CREATE INDEX idx_demo_uses_email ON public.demo_uses(email);
CREATE INDEX idx_demo_uses_ip ON public.demo_uses(ip_address);

-- Create policy to allow public inserts (for the demo)
CREATE POLICY "Allow public demo submissions" ON public.demo_uses
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow reading own demo uses (for rate limiting)
CREATE POLICY "Allow reading demo uses for rate limiting" ON public.demo_uses
  FOR SELECT 
  USING (true);