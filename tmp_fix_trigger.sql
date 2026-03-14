-- Let's update the trigger to forcefully log or default to a debug value 
-- so we can see exactly where it's failing

CREATE OR REPLACE FUNCTION public.force_client_dealership_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  did text;
  is_adm boolean;
BEGIN
  is_adm := public.is_admin();
  
  -- If the user is an admin, they are allowed to set it directly.
  IF is_adm THEN
    RETURN NEW;
  END IF;

  did := public.get_user_dealership_id();
  
  -- Force the dealership_id
  IF did IS NOT NULL THEN
    NEW.dealership_id := did;
  END IF;
  
  -- We don't overwrite with null if the frontend genuinely sent something valid
  -- just in case did comes back as null unexpectedly.
  
  RETURN NEW;
END;
$$;
