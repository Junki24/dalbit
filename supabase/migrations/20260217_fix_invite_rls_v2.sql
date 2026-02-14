-- ============================================
-- Fix invite RLS policies (v2)
-- Problem: Original schema blocks partners from validating/accepting invites.
--          Previous fix (v1) was overly permissive with USING (true).
-- Solution: Properly scoped policies allowing pending invite access.
-- ============================================

-- 1. Drop overly permissive policies from v1 fix (if they exist)
DROP POLICY IF EXISTS "Authenticated users can read invites" ON partner_sharing;
DROP POLICY IF EXISTS "Authenticated users can accept invites" ON partner_sharing;
DROP POLICY IF EXISTS "Partners can read owner settings" ON user_settings;

-- 2. Drop original narrow policies
DROP POLICY IF EXISTS "sharing_select" ON partner_sharing;
DROP POLICY IF EXISTS "sharing_update" ON partner_sharing;

-- 3. Create properly scoped partner_sharing SELECT policy
-- Allows: owner, accepted partner, OR anyone viewing pending non-expired invites
CREATE POLICY "sharing_select_v2" ON partner_sharing
  FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = partner_user_id
    OR (accepted = false AND invite_expires_at > now())
  );

-- 4. Create properly scoped partner_sharing UPDATE policy
-- Allows: owner to manage, OR accepting a pending invite
CREATE POLICY "sharing_update_v2" ON partner_sharing
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR (accepted = false AND invite_expires_at > now())
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR (accepted = false)
  );

-- 5. Keep original INSERT/DELETE policies (owner only) — no changes needed
-- sharing_insert: auth.uid() = owner_id
-- sharing_delete: auth.uid() = owner_id

-- 6. Fix user_settings SELECT — allow partners to read owner display_name
-- Drop original if exists, then recreate with partner access
DROP POLICY IF EXISTS "settings_select_own" ON user_settings;

CREATE POLICY "settings_select_v2" ON user_settings
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT owner_id FROM partner_sharing
      WHERE partner_user_id = auth.uid() AND accepted = true
    )
    OR user_id IN (
      SELECT owner_id FROM partner_sharing
      WHERE accepted = false AND invite_expires_at > now()
    )
  );
