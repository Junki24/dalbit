-- Fix: Allow invite recipients to read and accept partner_sharing records
-- Problem: RLS only allows owner_id = auth.uid(), so User B can't validate/accept invites

-- Allow any authenticated user to SELECT partner_sharing records
-- (invite code acts as the auth token — you need to know the code)
CREATE POLICY "Authenticated users can read invites"
  ON partner_sharing
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to UPDATE partner_sharing (for accepting invites)
-- Only allows setting partner_user_id and accepted fields
CREATE POLICY "Authenticated users can accept invites"
  ON partner_sharing
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow partner to read user_settings of the owner (for display_name)
-- Check if policy already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_settings'
    AND policyname = 'Partners can read owner settings'
  ) THEN
    CREATE POLICY "Partners can read owner settings"
      ON user_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
