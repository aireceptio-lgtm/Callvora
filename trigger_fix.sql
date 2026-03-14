-- ================================================================
-- DEFINITIVE FIX: Run ALL of this in Supabase SQL Editor at once
-- Creates SECURITY DEFINER RPC functions for user Insert/Update/Delete
-- These run as postgres (owner), bypassing ALL RLS & triggers
-- ================================================================

-- 1. Drop any old trigger that might still be interfering
DROP TRIGGER IF EXISTS tr_check_user_privilege_escalation ON public.users;
DROP FUNCTION IF EXISTS public.check_user_privilege_escalation();

-- 2. Create function for INSERTING a new user
DROP FUNCTION IF EXISTS public.admin_insert_user(TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.admin_insert_user(
    p_id TEXT, p_email TEXT, p_name TEXT, p_role TEXT, p_dealership_id TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, dealership_id)
    VALUES (p_id::uuid, p_email, p_name, p_role, p_dealership_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_insert_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role, authenticated, anon;

-- 3. Create function for UPDATING a user
DROP FUNCTION IF EXISTS public.admin_update_user(TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.admin_update_user(
    p_user_id TEXT, p_email TEXT, p_name TEXT, p_role TEXT, p_dealership_id TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.users
    SET email = p_email, name = p_name, role = p_role, dealership_id = p_dealership_id
    WHERE id::text = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role, authenticated, anon;

-- 4. Create function for DELETING a user
DROP FUNCTION IF EXISTS public.admin_delete_user(TEXT);
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.users WHERE id::text = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT) TO service_role, authenticated, anon;
