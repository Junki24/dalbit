-- ============================================
-- Fix: invite acceptance blocked by WITH CHECK
-- ============================================
-- Bug: sharing_update_v2 WITH CHECK has (accepted = false),
-- but after UPDATE sets accepted = true, WITH CHECK evaluates
-- the NEW row where accepted = true → fails.
-- Fix: allow partner_user_id = auth.uid() in WITH CHECK
-- so the accepting user can set themselves as partner.

DROP POLICY IF EXISTS "sharing_update_v2" ON partner_sharing;

CREATE POLICY "sharing_update_v3" ON partner_sharing
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR (accepted = false AND invite_expires_at > now())
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR (partner_user_id = auth.uid())
  );
