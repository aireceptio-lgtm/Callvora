-- FINAL FIX: Drop the privilege-escalation trigger
-- The Edge Function (manage-users) already performs security checks server-side.
-- This trigger is redundant and blocks the Admin from updating users.
-- Run this once in the Supabase SQL Editor.
-- ==============================================================================

-- Step 1: Drop the blocking trigger
DROP TRIGGER IF EXISTS tr_check_user_privilege_escalation ON public.users;

-- Step 2: Also drop the trigger function since it's no longer needed
DROP FUNCTION IF EXISTS public.check_user_privilege_escalation();
