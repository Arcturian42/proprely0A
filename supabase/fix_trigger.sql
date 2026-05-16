-- Fix: trigger no longer crashes when company_id is missing (Google OAuth)
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get company_id from metadata (set during email signup)
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;

  -- If no company_id (e.g. Google OAuth), skip insert.
  -- The fix-user API will create company + users row on first app load.
  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO users (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_company_id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
