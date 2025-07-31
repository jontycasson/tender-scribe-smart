-- Create a trigger function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set user_id if it's not already provided and auth.uid() is available
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tenders table to auto-set user_id
DROP TRIGGER IF EXISTS set_user_id_on_tenders_insert ON public.tenders;
CREATE TRIGGER set_user_id_on_tenders_insert
  BEFORE INSERT ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

-- Ensure RLS policies are correct for tenders table
-- (These should already exist but let's make sure they're properly configured)

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can create their own tenders" ON public.tenders;
DROP POLICY IF EXISTS "Users can view their own tenders" ON public.tenders;
DROP POLICY IF EXISTS "Users can update their own tenders" ON public.tenders;
DROP POLICY IF EXISTS "Users can delete their own tenders" ON public.tenders;

-- Create comprehensive RLS policies for tenders
CREATE POLICY "Users can create their own tenders"
ON public.tenders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tenders"
ON public.tenders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenders"
ON public.tenders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenders"
ON public.tenders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);