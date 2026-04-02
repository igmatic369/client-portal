-- ============================================================
-- Migration: 002_storage_policies
-- Purpose: Ensure site-images bucket and storage policies exist.
-- IDEMPOTENT — safe to run even if 001_initial_schema already ran.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Bucket (no-op if already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate policies so this file can be re-run cleanly
DROP POLICY IF EXISTS "Public read access on site-images"             ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to site-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from site-images" ON storage.objects;

-- Anyone can read (images are served publicly on client sites)
CREATE POLICY "Public read access on site-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images');

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload to site-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND auth.role() = 'authenticated');

-- Authenticated users can delete images
CREATE POLICY "Authenticated users can delete from site-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-images' AND auth.role() = 'authenticated');
