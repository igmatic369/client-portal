-- ============================================================
-- Fix: 003_fix_admin_policies
-- Purpose: Drop broken admin policies that query auth.users directly
--          (causes permission error for ALL users), then recreate
--          them using auth.jwt() which reads from the in-memory JWT.
-- Paste this entire file into Supabase SQL Editor and Run.
-- ============================================================

-- ── Drop broken policies ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can select all sites"    ON sites;
DROP POLICY IF EXISTS "Admins can insert sites"        ON sites;
DROP POLICY IF EXISTS "Admins can update all sites"    ON sites;
DROP POLICY IF EXISTS "Admins can delete all sites"    ON sites;

DROP POLICY IF EXISTS "Admins can select all drafts"   ON content_drafts;
DROP POLICY IF EXISTS "Admins can update all drafts"   ON content_drafts;
DROP POLICY IF EXISTS "Admins can delete all drafts"   ON content_drafts;

DROP POLICY IF EXISTS "Admins can select all history"  ON content_history;


-- ── Recreate with auth.jwt() ─────────────────────────────────────────────────

CREATE POLICY "Admins can select all sites"
  ON sites FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can insert sites"
  ON sites FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all sites"
  ON sites FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete all sites"
  ON sites FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can select all drafts"
  ON content_drafts FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all drafts"
  ON content_drafts FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete all drafts"
  ON content_drafts FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can select all history"
  ON content_history FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
