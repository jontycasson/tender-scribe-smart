-- Function to delete a tender (admin only)
  CREATE OR REPLACE FUNCTION public.admin_delete_tender(
    tender_id uuid
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  BEGIN
    -- Only allow admins
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Check if tender exists
    IF NOT EXISTS (SELECT 1 FROM public.tenders WHERE id = tender_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Tender not found');
    END IF;

    -- Delete tender responses first (foreign key constraint)
    DELETE FROM public.tender_responses WHERE tender_id = tender_id;

    -- Delete the tender
    DELETE FROM public.tenders WHERE id = tender_id;

    RETURN jsonb_build_object('success', true, 'message', 'Tender deleted successfully');
  END;
  $$;
