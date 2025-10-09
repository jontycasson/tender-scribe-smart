-- Create admin function to delete tenders
CREATE OR REPLACE FUNCTION public.admin_delete_tender(tender_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT is_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Check if tender exists
  IF NOT EXISTS (SELECT 1 FROM public.tenders WHERE id = tender_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tender not found'
    );
  END IF;
  
  -- Delete tender responses first
  DELETE FROM public.tender_responses WHERE tender_id = admin_delete_tender.tender_id;
  
  -- Delete the tender
  DELETE FROM public.tenders WHERE id = admin_delete_tender.tender_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tender deleted successfully'
  );
END;
$$;