-- ============================================================
-- Migration: 003_admin_policies
-- Purpose: Grant admins full access to all rows in core tables.
-- Existing client policies are unchanged — RLS ORs policies together.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================
-- Set your account as admin first (run once):
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb
--   WHERE email = 'your@email.com';
-- ============================================================

-- Admin check reads from in-memory JWT — no table access required:
-- (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'

-- ── sites ────────────────────────────────────────────────────────────────────

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


-- ── content_drafts ───────────────────────────────────────────────────────────

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


-- ── content_history ──────────────────────────────────────────────────────────

CREATE POLICY "Admins can select all history"
  ON content_history FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
