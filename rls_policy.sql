-- ==============================================================================
-- CALLVORA: ROW LEVEL SECURITY (RLS) POLICIES
-- Copy and paste this script into your Supabase SQL Editor and click "Run".
-- ==============================================================================

-- 1. Enable RLS on all sensitive tables
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_history ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies safely
DROP POLICY IF EXISTS "Admins have full access to dealerships" ON dealerships;
DROP POLICY IF EXISTS "Clients can view their own dealership" ON dealerships;

DROP POLICY IF EXISTS "Admins have full access to users" ON users;
DROP POLICY IF EXISTS "Users can view users in same dealership" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Admins have full access to vehicles" ON vehicles;
DROP POLICY IF EXISTS "Clients can view and delete their dealership vehicles" ON vehicles;
DROP POLICY IF EXISTS "Clients can delete their dealership vehicles" ON vehicles;
DROP POLICY IF EXISTS "Clients can insert their dealership vehicles" ON vehicles;
DROP POLICY IF EXISTS "Clients can update their dealership vehicles" ON vehicles;

DROP POLICY IF EXISTS "Admins have full access to leads" ON leads;
DROP POLICY IF EXISTS "Clients can view their dealership leads" ON leads;
DROP POLICY IF EXISTS "Clients can delete their dealership leads" ON leads;
DROP POLICY IF EXISTS "Clients can insert their dealership leads" ON leads;
DROP POLICY IF EXISTS "Clients can update their dealership leads" ON leads;

DROP POLICY IF EXISTS "Admins have full access to calls" ON calls;
DROP POLICY IF EXISTS "Clients can view their dealership calls" ON calls;
DROP POLICY IF EXISTS "Clients can delete their dealership calls" ON calls;
DROP POLICY IF EXISTS "Clients can insert their dealership calls" ON calls;
DROP POLICY IF EXISTS "Clients can update their dealership calls" ON calls;

DROP POLICY IF EXISTS "Admins have full access to recharge_history" ON recharge_history;
DROP POLICY IF EXISTS "Clients can view their own dealership recharge history" ON recharge_history;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

DROP FUNCTION IF EXISTS public.get_user_dealership_id() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_dealership_id()
RETURNS uuid  -- MUST RETURN NATIVE UUID TO PREVENT INSERT MISMATCHES
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dealership_id FROM users WHERE id = auth.uid();
$$;

-- Dealerships Policies
CREATE POLICY "Admins have full access to dealerships" ON dealerships FOR ALL USING (is_admin());
CREATE POLICY "Clients can view their own dealership" ON dealerships FOR SELECT USING (id = get_user_dealership_id());

-- Users Policies
CREATE POLICY "Admins have full access to users" ON users FOR ALL USING (is_admin());
CREATE POLICY "Users can view users in same dealership" ON users FOR SELECT USING (dealership_id = get_user_dealership_id() OR id = auth.uid());
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Not authorized to change user role'; END IF;
  IF NEW.dealership_id IS DISTINCT FROM OLD.dealership_id THEN RAISE EXCEPTION 'Not authorized to change dealership_id'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_user_privilege_escalation ON users;
CREATE TRIGGER tr_check_user_privilege_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_privilege_escalation();

-- Vehicles Policies
CREATE POLICY "Admins have full access to vehicles" ON vehicles FOR ALL USING (is_admin());
CREATE POLICY "Clients can view and delete their dealership vehicles" ON vehicles FOR SELECT USING (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can delete their dealership vehicles" ON vehicles FOR DELETE USING (dealership_id = get_user_dealership_id());

-- TO FIX THE INSERT ERROR, WE CAST THE FUNCTION RESULT RATHER THAN THE COLUMN
CREATE POLICY "Clients can insert their dealership vehicles" ON vehicles 
  FOR INSERT WITH CHECK (dealership_id = get_user_dealership_id());

CREATE POLICY "Clients can update their dealership vehicles" ON vehicles 
  FOR UPDATE USING (dealership_id = get_user_dealership_id()) 
  WITH CHECK (dealership_id = get_user_dealership_id());

-- Leads Policies
CREATE POLICY "Admins have full access to leads" ON leads FOR ALL USING (is_admin());
CREATE POLICY "Clients can view their dealership leads" ON leads FOR SELECT USING (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can delete their dealership leads" ON leads FOR DELETE USING (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can insert their dealership leads" ON leads 
  FOR INSERT WITH CHECK (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can update their dealership leads" ON leads 
  FOR UPDATE USING (dealership_id = get_user_dealership_id()) 
  WITH CHECK (dealership_id = get_user_dealership_id());

-- Calls Policies
CREATE POLICY "Admins have full access to calls" ON calls FOR ALL USING (is_admin());
CREATE POLICY "Clients can view their dealership calls" ON calls FOR SELECT USING (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can delete their dealership calls" ON calls FOR DELETE USING (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can insert their dealership calls" ON calls 
  FOR INSERT WITH CHECK (dealership_id = get_user_dealership_id());
CREATE POLICY "Clients can update their dealership calls" ON calls 
  FOR UPDATE USING (dealership_id = get_user_dealership_id()) 
  WITH CHECK (dealership_id = get_user_dealership_id());

-- Recharge History Policies
CREATE POLICY "Admins have full access to recharge_history" ON recharge_history FOR ALL USING (is_admin());
CREATE POLICY "Clients can view their own dealership recharge history" ON recharge_history FOR SELECT USING (dealership_id = get_user_dealership_id());
