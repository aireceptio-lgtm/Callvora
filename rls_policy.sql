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

-- 2. Create helper functions for Auth checks (Security Definer avoids infinite recursion)
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

CREATE OR REPLACE FUNCTION public.get_user_dealership_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dealership_id FROM users WHERE id = auth.uid();
$$;

-- ==============================================================================
-- 3. Dealerships Policies
-- ==============================================================================
-- Admins can do anything
CREATE POLICY "Admins have full access to dealerships" ON dealerships 
  FOR ALL USING (is_admin());

-- Clients can only view their own dealership
CREATE POLICY "Clients can view their own dealership" ON dealerships 
  FOR SELECT USING (id = get_user_dealership_id() OR get_user_dealership_id() IS NULL);

-- ==============================================================================
-- 4. Users Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to users" ON users 
  FOR ALL USING (is_admin());

-- Users can view their own profile and other users in their dealership
CREATE POLICY "Users can view users in same dealership" ON users 
  FOR SELECT USING (dealership_id = get_user_dealership_id() OR id = auth.uid());

-- Users can only update their own profile (like changing name/password, if allowed via UI)
CREATE POLICY "Users can update their own profile" ON users 
  FOR UPDATE USING (id = auth.uid());

-- ==============================================================================
-- 5. Vehicles Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to vehicles" ON vehicles 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients have full access to their dealership vehicles" ON vehicles 
  FOR ALL USING (dealership_id = get_user_dealership_id());

-- ==============================================================================
-- 6. Leads Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to leads" ON leads 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients have full access to their dealership leads" ON leads 
  FOR ALL USING (dealership_id = get_user_dealership_id());

-- ==============================================================================
-- 7. Calls Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to calls" ON calls 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients have full access to their dealership calls" ON calls 
  FOR ALL USING (dealership_id = get_user_dealership_id());

-- ==============================================================================
-- 8. Recharge History Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to recharge_history" ON recharge_history 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their own dealership recharge history" ON recharge_history 
  FOR SELECT USING (dealership_id = get_user_dealership_id());
