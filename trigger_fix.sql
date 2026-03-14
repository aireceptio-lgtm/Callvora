-- Fix check_user_privilege_escalation trigger to allow Service Role bypass
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- If this is called from the service_role key (Edge Function supabaseAdmin), bypass the check!
  IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Otherwise, verify if the user is an admin
  IF public.is_admin() THEN 
    RETURN NEW; 
  END IF;

  -- Block normal users from escalating privileges
  IF NEW.role IS DISTINCT FROM OLD.role THEN 
    RAISE EXCEPTION 'Not authorized to change user role'; 
  END IF;
  IF NEW.dealership_id IS DISTINCT FROM OLD.dealership_id THEN 
    RAISE EXCEPTION 'Not authorized to change dealership_id'; 
  END IF;
  
  RETURN NEW;
END;
$$;
