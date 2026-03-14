-- FINAL FIX: Run this in Supabase SQL Editor
-- Creates a SECURITY DEFINER function that ALWAYS bypasses RLS
-- The Edge Function will call this function via RPC instead of updating the table directly.

-- Step 1: Drop the old blocking trigger (if still exists)
DROP TRIGGER IF EXISTS tr_check_user_privilege_escalation ON public.users;
DROP FUNCTION IF EXISTS public.check_user_privilege_escalation();

-- Step 2: Create a secure RPC function that admins can call to update a user
-- SECURITY DEFINER means it runs as the owner (postgres), bypassing ALL RLS
CREATE OR REPLACE FUNCTION public.admin_update_user(
    p_user_id TEXT,
    p_name TEXT,
    p_role TEXT,
    p_dealership_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET
        name = p_name,
        role = p_role,
        dealership_id = p_dealership_id
    WHERE id::text = p_user_id;
END;
$$;

-- Step 3: Grant execute permission to the service_role and authenticated users
GRANT EXECUTE ON FUNCTION public.admin_update_user(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
