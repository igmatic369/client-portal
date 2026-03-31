-- ============================================================
-- Migration: 001_initial_schema
-- Purpose: Core tables for the NoWebsiteLeads client portal
-- Run this in the Supabase SQL Editor to set up the database
-- ============================================================


-- ============================================================
-- TABLE: sites
-- One row per client website managed through the portal.
-- The `schema` JSONB column defines what tabs/fields the
-- content editor renders for this specific site.
-- ============================================================
CREATE TABLE sites (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,                          -- e.g. "LD Nails & Spa"
  slug                 TEXT UNIQUE NOT NULL,                   -- e.g. "ld-nails-and-spa"
  github_repo          TEXT NOT NULL,                         -- e.g. "username/ld-nails-site"
  github_content_path  TEXT NOT NULL DEFAULT 'src/content.json', -- path to content.json in repo
  netlify_site_id      TEXT,                                  -- Netlify site ID (for API calls)
  netlify_url          TEXT,                                  -- e.g. "https://ldnailsandspa.netlify.app"
  owner_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  schema               JSONB NOT NULL DEFAULT '{}',           -- tab/field definitions for the editor
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE: content_drafts
-- One active draft per site (UNIQUE on site_id).
-- Auto-saved every 2 seconds while the client is editing.
-- Upserted on each save; deleted on publish.
-- ============================================================
CREATE TABLE content_drafts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
  content_json JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE: content_history
-- Append-only log of every publish action.
-- Enables rollback: load a past version into a new draft.
-- Never deleted (soft audit trail).
-- ============================================================
CREATE TABLE content_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID REFERENCES sites(id) ON DELETE CASCADE,
  content_json JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ============================================================
-- ROW-LEVEL SECURITY
-- Each table uses RLS so clients can only access their own data.
-- Admin operations use the Supabase service role key (server-side
-- only, never exposed to the browser).
-- ============================================================

-- sites: clients can only see sites they own
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sites"
  ON sites FOR SELECT
  USING (owner_id = auth.uid());

-- (INSERT, UPDATE, DELETE on sites is admin-only via service role)


-- content_drafts: full access for the owner of the linked site
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage drafts for their own sites"
  ON content_drafts FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );


-- content_history: clients can view their own publish history
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for their own sites"
  ON content_history FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- (INSERT into content_history is done by the Edge Function using service role)


-- ============================================================
-- STORAGE: site-images bucket
-- Public bucket for gallery and single images uploaded via portal.
-- Path convention: {site_slug}/{uuid}.{ext}
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public CDN access for client sites)
CREATE POLICY "Public read access on site-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images');

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload to site-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-images' AND auth.role() = 'authenticated');

-- Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete from site-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-images' AND auth.role() = 'authenticated');
