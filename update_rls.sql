-- ==============================================================================
-- FIX RLS ADMIN CAPABILITIES 
-- Run this script in the Supabase SQL Editor.
-- It fixes the buggy "is_admin" functions and explicitly rebuilds the Admin RLS policies.
-- ==============================================================================

-- 1. SECURELY REBUILD HELPER FUNCTIONS
-- Using explicitly set search paths ensures security while maintaining functionality.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_dealership_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT dealership_id FROM public.users 
  WHERE id = auth.uid();
$$;

-- 2. REBUILD ADMIN POLICIES WITH EXPLICIT 'WITH CHECK' CLAUSES
-- Some Postgres engines require explicit WITH CHECK on ALL policies to permit INSERT/UPDATE.

-- Dealserships
DROP POLICY IF EXISTS "Admins have full access to dealerships" ON public.dealerships;
CREATE POLICY "Admins have full access to dealerships" ON public.dealerships 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Users
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
CREATE POLICY "Admins have full access to users" ON public.users 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Vehicles
DROP POLICY IF EXISTS "Admins have full access to vehicles" ON public.vehicles;
CREATE POLICY "Admins have full access to vehicles" ON public.vehicles 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Leads
DROP POLICY IF EXISTS "Admins have full access to leads" ON public.leads;
CREATE POLICY "Admins have full access to leads" ON public.leads 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Calls
DROP POLICY IF EXISTS "Admins have full access to calls" ON public.calls;
CREATE POLICY "Admins have full access to calls" ON public.calls 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Recharge History
DROP POLICY IF EXISTS "Admins have full access to recharge_history" ON public.recharge_history;
CREATE POLICY "Admins have full access to recharge_history" ON public.recharge_history 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
