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

CREATE OR REPLACE FUNCTION public.get_user_dealership_id()::uuid
RETURNS text
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
  FOR SELECT USING (id = get_user_dealership_id()::uuid::uuid);

-- ==============================================================================
-- 4. Users Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to users" ON users 
  FOR ALL USING (is_admin());

-- Users can view their own profile and other users in their dealership
CREATE POLICY "Users can view users in same dealership" ON users 
  FOR SELECT USING (dealership_id = get_user_dealership_id()::uuid OR id = auth.uid());

-- Users can only update their own profile (like changing name/password, if allowed via UI)
CREATE POLICY "Users can update their own profile" ON users 
  FOR UPDATE USING (id = auth.uid());

-- Prevent unauthorized privilege escalation
CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the user is an admin, they can change anything
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- If not an admin, they cannot change their role or dealership_id
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not authorized to change user role';
  END IF;
  
  IF NEW.dealership_id IS DISTINCT FROM OLD.dealership_id THEN
    RAISE EXCEPTION 'Not authorized to change dealership_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_user_privilege_escalation ON users;
CREATE TRIGGER tr_check_user_privilege_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_privilege_escalation();

-- ==============================================================================
-- 5. Vehicles Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to vehicles" ON vehicles 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view and delete their dealership vehicles" ON vehicles 
  FOR SELECT USING (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can delete their dealership vehicles" ON vehicles 
  FOR DELETE USING (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can insert their dealership vehicles" ON vehicles 
  FOR INSERT WITH CHECK (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can update their dealership vehicles" ON vehicles 
  FOR UPDATE USING (dealership_id = get_user_dealership_id()::uuid) WITH CHECK (dealership_id = get_user_dealership_id()::uuid);

-- ==============================================================================
-- 6. Leads Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to leads" ON leads 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their dealership leads" ON leads 
  FOR SELECT USING (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can delete their dealership leads" ON leads 
  FOR DELETE USING (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can insert their dealership leads" ON leads 
  FOR INSERT WITH CHECK (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can update their dealership leads" ON leads 
  FOR UPDATE USING (dealership_id = get_user_dealership_id()::uuid) WITH CHECK (dealership_id = get_user_dealership_id()::uuid);

-- ==============================================================================
-- 7. Calls Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to calls" ON calls 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their dealership calls" ON calls 
  FOR SELECT USING (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can delete their dealership calls" ON calls 
  FOR DELETE USING (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can insert their dealership calls" ON calls 
  FOR INSERT WITH CHECK (dealership_id = get_user_dealership_id()::uuid);

CREATE POLICY "Clients can update their dealership calls" ON calls 
  FOR UPDATE USING (dealership_id = get_user_dealership_id()::uuid) WITH CHECK (dealership_id = get_user_dealership_id()::uuid);

-- ==============================================================================
-- 8. Recharge History Policies
-- ==============================================================================
CREATE POLICY "Admins have full access to recharge_history" ON recharge_history 
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their own dealership recharge history" ON recharge_history 
  FOR SELECT USING (dealership_id = get_user_dealership_id()::uuid);
