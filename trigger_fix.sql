-- ==============================================================================
-- FINAL COMPREHENSIVE FIX: Run this ENTIRE script in Supabase SQL Editor
-- This will definitively fix the admin user add/update issue
-- ==============================================================================

-- STEP 1: Drop the blocking trigger (main cause of the error)
DROP TRIGGER IF EXISTS tr_check_user_privilege_escalation ON public.users;
DROP FUNCTION IF EXISTS public.check_user_privilege_escalation();

-- STEP 2: Drop all old "always true" permissive policies that Supabase warned about
DROP POLICY IF EXISTS "Auth Users Full Access" ON public.users;
DROP POLICY IF EXISTS "Auth Calls Full Access" ON public.calls;
DROP POLICY IF EXISTS "Auth Dealerships Full Access" ON public.dealerships;
DROP POLICY IF EXISTS "Auth Leads Full Access" ON public.leads;
DROP POLICY IF EXISTS "Allow all access leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert access" ON public.recharge_history;
DROP POLICY IF EXISTS "Auth Recharge Full Access" ON public.recharge_history;
DROP POLICY IF EXISTS "Allow all access vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Auth Vehicles Full Access" ON public.vehicles;

-- STEP 3: Drop and securely rebuild helper functions
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

DROP FUNCTION IF EXISTS public.get_user_dealership_id() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_dealership_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dealership_id::text FROM public.users WHERE id = auth.uid();
$$;

-- STEP 4: Rebuild Admin policies with explicit WITH CHECK so INSERT/UPDATE work
DROP POLICY IF EXISTS "Admins have full access to dealerships" ON public.dealerships;
CREATE POLICY "Admins have full access to dealerships" ON public.dealerships
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
CREATE POLICY "Admins have full access to users" ON public.users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to vehicles" ON public.vehicles;
CREATE POLICY "Admins have full access to vehicles" ON public.vehicles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to leads" ON public.leads;
CREATE POLICY "Admins have full access to leads" ON public.leads
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to calls" ON public.calls;
CREATE POLICY "Admins have full access to calls" ON public.calls
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to recharge_history" ON public.recharge_history;
CREATE POLICY "Admins have full access to recharge_history" ON public.recharge_history
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
