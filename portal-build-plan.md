# Client Portal — Build Plan

*Created: 2026-03-29*
*Project: NoWebsiteLeads*

---

## Architecture Overview

A single React portal app where business owners log in and edit their website content through a schema-driven form UI. Changes auto-save as drafts. When the client clicks "Publish," the portal commits the updated `content.json` to the site's GitHub repo, triggering a Netlify auto-rebuild (~30–90 seconds).

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + React Router |
| Backend / Auth | Supabase (Auth, Postgres, Storage) |
| Content delivery | GitHub API → Netlify auto-rebuild |
| Image storage | Supabase Storage (public bucket) |
| Portal hosting | Netlify (separate site from client sites) |
| Domain | TBD (e.g. `portal.yourdomain.com`) |

### System Flow

```
Client logs in (Supabase Auth)
  → Dashboard shows their site(s)
  → Click "Edit" → schema-driven form loads
  → Edits auto-save to Supabase (content_drafts table)
  → Client clicks "Publish"
    → Draft JSON written to content_history (audit trail)
    → GitHub API commits updated content.json to site repo
    → Netlify detects push, rebuilds site (~30-90s)
    → Portal shows "Publishing... changes live in ~2 minutes"
```

### Auth Configuration

- **Email/password** — primary login method, you create accounts during onboarding
- **Google OAuth** — convenience option for Gmail users
- **Magic link** — used for password reset flow (email link → set new password)

---

## Data Model (Supabase Postgres)

### `sites` table

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "LD Nails & Spa"
  slug TEXT UNIQUE NOT NULL,             -- "ld-nails-and-spa"
  github_repo TEXT NOT NULL,             -- "username/ld-nails-site"
  github_content_path TEXT NOT NULL      -- "src/content.json"
    DEFAULT 'src/content.json',
  netlify_site_id TEXT,                  -- Netlify site ID for API calls
  netlify_url TEXT,                      -- "https://ldnailsandspa.netlify.app"
  owner_id UUID REFERENCES auth.users(id),
  schema JSONB NOT NULL,                 -- tab/field definitions for the editor
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `content_drafts` table

One active draft per site. Upserted on every auto-save.

```sql
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
  content_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `content_history` table

Append-only log of every publish action.

```sql
CREATE TABLE content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  content_json JSONB NOT NULL,
  published_at TIMESTAMPTZ DEFAULT now(),
  published_by UUID REFERENCES auth.users(id)
);
```

### Row-Level Security (RLS)

```sql
-- Clients can only see/edit their own site(s)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sites"
  ON sites FOR SELECT
  USING (owner_id = auth.uid());

ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users edit own drafts"
  ON content_drafts FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE owner_id = auth.uid()));

ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own history"
  ON content_history FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE owner_id = auth.uid()));

-- Admin bypass: create a Supabase service role key for admin operations
-- (used server-side only, never exposed to client)
```

---

## Schema System

Each site has a `schema` JSONB column that defines what the editor renders. The portal reads this schema and dynamically builds the form.

### Field Types (12 total)

| Type | Renders as | Example use |
|------|-----------|-------------|
| `text` | Single-line input | Business name, service name |
| `textarea` | Multi-line input | Description, about text |
| `email` | Email input with validation | Contact email |
| `phone` | Phone input | Business phone |
| `currency` | Number input with $ prefix | Service price |
| `url` | URL input | Facebook URL, website link |
| `hours_grid` | 7-row grid: day + open/close time pickers + closed toggle | Business hours |
| `image_gallery` | Drag-to-reorder image grid with upload/remove | Gallery photos |
| `image_single` | Single image upload with preview | Hero image, logo |
| `list` | Repeatable group with add/remove/reorder | Services, reviews |
| `select` | Dropdown | Category selector |
| `toggle` | On/off switch | Show/hide section |

### Schema Structure

```json
{
  "tabs": [
    {
      "key": "business",
      "label": "Business Info",
      "fields": [
        { "key": "name", "label": "Business Name", "type": "text", "required": true },
        { "key": "tagline", "label": "Tagline", "type": "text" },
        { "key": "phone", "label": "Phone", "type": "phone" },
        { "key": "email", "label": "Email", "type": "email" },
        { "key": "address", "label": "Address", "type": "textarea" }
      ]
    },
    {
      "key": "hours",
      "label": "Hours",
      "fields": [
        { "key": "hours", "label": "Business Hours", "type": "hours_grid" }
      ]
    },
    {
      "key": "services",
      "label": "Services & Pricing",
      "fields": [
        {
          "key": "categories",
          "label": "Service Categories",
          "type": "list",
          "item_fields": [
            { "key": "name", "label": "Category Name", "type": "text" },
            {
              "key": "items",
              "label": "Services",
              "type": "list",
              "item_fields": [
                { "key": "name", "label": "Service", "type": "text" },
                { "key": "description", "label": "Description", "type": "textarea" },
                { "key": "price", "label": "Price", "type": "currency" }
              ]
            }
          ]
        }
      ]
    },
    {
      "key": "gallery",
      "label": "Gallery",
      "fields": [
        { "key": "images", "label": "Photos", "type": "image_gallery" }
      ]
    },
    {
      "key": "reviews",
      "label": "Reviews",
      "fields": [
        {
          "key": "reviews",
          "label": "Customer Reviews",
          "type": "list",
          "item_fields": [
            { "key": "name", "label": "Reviewer", "type": "text" },
            { "key": "rating", "label": "Rating", "type": "stars" },
            { "key": "text", "label": "Review", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "key": "contact",
      "label": "Contact",
      "fields": [
        { "key": "maps_embed", "label": "Google Maps Embed URL", "type": "url" },
        { "key": "form_email", "label": "Contact Form Email", "type": "email" },
        { "key": "facebook", "label": "Facebook URL", "type": "url" },
        { "key": "instagram", "label": "Instagram URL", "type": "url" }
      ]
    }
  ]
}
```

### How Schema Maps to content.json

The `key` values in the schema map directly to the JSON path in `content.json`. For nested tabs, the tab's `key` is the top-level JSON key, and each field's `key` is the property within that object.

Example: tab `key: "business"`, field `key: "name"` → reads/writes `content.business.name`.

For `list` types, the field `key` points to an array in the JSON, and `item_fields` define the shape of each array element.

---

## Portal Pages

### Client Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password form + Google OAuth button + forgot password link |
| Dashboard | `/` | List of client's sites with name, live URL, last edited, "Edit" button |
| Content Editor | `/site/:siteId/edit` | Schema-driven tabbed form with auto-save + Publish button |
| Password Reset | `/reset-password` | Magic link request + new password form |

### Admin Pages (your view)

| Page | Route | Description |
|------|-------|-------------|
| All Sites | `/admin/sites` | Table of all sites with owner, status, last published |
| Create Site | `/admin/sites/new` | Form: name, slug, GitHub repo, Netlify ID, assign owner, paste/edit schema |
| Create Client | `/admin/clients/new` | Create Supabase auth user + send welcome email |
| Edit Schema | `/admin/sites/:siteId/schema` | JSON editor for the site's schema (for you, not clients) |
| Impersonate | `/admin/sites/:siteId/edit` | Same editor view but accessible for any site |

### Admin Detection

Admin is determined by a `role` field in the Supabase `auth.users` metadata. When you create your own account, set `role: "admin"`. Client accounts get `role: "client"` (or no role). The portal checks this on login and shows/hides admin routes accordingly.

---

## GitHub Integration

### Setup (one-time)

1. Create a GitHub Personal Access Token (fine-grained) with write access to your repos
2. Store as `GITHUB_PAT` environment variable in the portal's Netlify deployment
3. Portal calls GitHub API through a Supabase Edge Function (keeps the token server-side)

### Publish Flow (Supabase Edge Function)

```
POST /functions/v1/publish-content
Body: { site_id, content_json }

1. Validate the user owns this site (check JWT + RLS)
2. Read GITHUB_PAT from environment
3. GitHub API: GET /repos/{repo}/contents/{path} → get current file SHA
4. GitHub API: PUT /repos/{repo}/contents/{path}
   - content: base64-encoded JSON
   - sha: current file SHA
   - message: "Update content via portal"
5. Insert into content_history
6. Delete from content_drafts
7. Return { success: true, commit_sha }
```

### Why an Edge Function?

The GitHub PAT must never be exposed to the browser. Supabase Edge Functions run server-side, have access to environment variables, and can verify the user's JWT — so we get auth + secure token storage in one layer.

---

## Image Upload Flow

### Supabase Storage Setup

- Bucket: `site-images` (public)
- Path convention: `{site_slug}/{filename}`
- Max file size: 5MB (enforced by policy)
- Accepted types: `image/jpeg`, `image/png`, `image/webp`

### Upload Process

1. Client selects image in gallery editor
2. Frontend uploads to Supabase Storage → gets public URL
3. URL is inserted into the `content_json` gallery array in the draft
4. On Publish, the URL is already in the JSON that gets committed
5. Netlify rebuilds; site `<img>` tags point to Supabase Storage CDN

### Image Deletion

When a client removes a gallery image, the URL is removed from the JSON. Optionally, a cleanup function can delete orphaned images from Storage — but this is a Phase 5 concern. Storage is cheap; orphaned images cost almost nothing.

---

## Build Phases

### Phase 1 — Foundation

**Goal:** Skeleton app with auth and basic dashboard.

- [ ] Create Supabase project
  - [ ] Enable Email/Password auth provider
  - [ ] Enable Google OAuth provider
  - [ ] Configure magic link email template
  - [ ] Create `sites` table with RLS policies
  - [ ] Create `content_drafts` table with RLS policies
  - [ ] Create `content_history` table with RLS policies
  - [ ] Create `site-images` storage bucket (public)
- [ ] Scaffold React app (Vite + React Router)
  - [ ] Install dependencies: `@supabase/supabase-js`, `react-router-dom`
  - [ ] Set up Supabase client with env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  - [ ] Auth context provider (session management, login/logout)
  - [ ] Protected route wrapper (redirect to `/login` if not authenticated)
  - [ ] Admin route wrapper (check `role` in user metadata)
- [ ] Login page
  - [ ] Email/password form
  - [ ] Google OAuth button
  - [ ] "Forgot password?" link → magic link email
- [ ] Dashboard page
  - [ ] Fetch user's sites from Supabase
  - [ ] Display site cards: name, live URL, last edited, "Edit" button
  - [ ] Empty state for new users
- [ ] Deploy portal to Netlify (separate site)
- [ ] Manually insert test data: your own user as admin + LD Nails site record with schema

**Deliverable:** You can log in, see LD Nails on your dashboard, click Edit (goes to blank editor page).

---

### Phase 2 — Content Editor (core value)

**Goal:** Schema-driven editor that loads content, allows editing, auto-saves drafts, and publishes.

- [ ] Schema renderer engine
  - [ ] `SchemaForm` component: reads schema, renders tabs
  - [ ] `TabPanel` component: renders fields for active tab
  - [ ] `FieldRenderer` component: switch on field type, render correct input
- [ ] Field type components (build in this order)
  - [ ] `TextField` — single-line text input
  - [ ] `TextareaField` — multi-line
  - [ ] `EmailField` — with validation
  - [ ] `PhoneField` — with formatting
  - [ ] `CurrencyField` — number input with $ prefix
  - [ ] `UrlField` — with validation
  - [ ] `ToggleField` — on/off switch
  - [ ] `SelectField` — dropdown
  - [ ] `ListField` — repeatable group with add/remove/reorder (drag handles)
  - [ ] `HoursGridField` — 7-day grid with time pickers and closed toggle
  - [ ] `StarsField` — clickable star rating (1-5)
- [ ] Content loading
  - [ ] On editor mount: check `content_drafts` for existing draft
  - [ ] If no draft: fetch current `content.json` from GitHub API (via Edge Function)
  - [ ] Populate form with loaded content
- [ ] Auto-save
  - [ ] Debounced save (2-second delay after last keystroke)
  - [ ] Upsert to `content_drafts` table
  - [ ] "Draft saved ✓" indicator with timestamp
  - [ ] "Unsaved changes" indicator when dirty
- [ ] Publish flow
  - [ ] "Publish Changes" button (disabled when no changes)
  - [ ] Confirmation dialog: "This will update your live website. Continue?"
  - [ ] Call Supabase Edge Function: `publish-content`
  - [ ] Success state: "Your changes are being published — they'll be live in about 2 minutes"
  - [ ] Error handling: show error message, don't lose draft
- [ ] Supabase Edge Function: `publish-content`
  - [ ] Verify JWT and site ownership
  - [ ] Read GitHub PAT from env
  - [ ] Commit updated `content.json` to GitHub
  - [ ] Insert into `content_history`
  - [ ] Delete draft
  - [ ] Return success/error

**Deliverable:** You can edit LD Nails content in the portal, auto-save works, clicking Publish updates the live site.

---

### Phase 3 — Image Management

**Goal:** Upload, remove, and reorder gallery images through the editor.

- [ ] `ImageGalleryField` component
  - [ ] Display current images as thumbnail grid
  - [ ] "+" tile to upload new image
  - [ ] Click image → remove button (with confirm)
  - [ ] Drag to reorder
  - [ ] Upload progress indicator
- [ ] `ImageSingleField` component
  - [ ] Display current image with replace/remove buttons
  - [ ] Upload new image
- [ ] Image upload logic
  - [ ] Upload to Supabase Storage: `site-images/{slug}/{uuid}.{ext}`
  - [ ] Get public URL
  - [ ] Insert URL into content JSON at correct path
  - [ ] Auto-save draft with new URL
- [ ] Image validation
  - [ ] Max 5MB file size (client-side check + Storage policy)
  - [ ] Accept only JPEG, PNG, WebP
  - [ ] Client-side image preview before upload

**Deliverable:** Gallery editing works end-to-end — upload photos, reorder them, remove them, publish, see them on the live site.

---

### Phase 4 — Admin Panel

**Goal:** You can manage all sites and clients from the portal.

- [ ] Admin sites list (`/admin/sites`)
  - [ ] Table: name, owner email, live URL, last published, status
  - [ ] Search/filter
  - [ ] Click row → edit schema or impersonate
- [ ] Create site form (`/admin/sites/new`)
  - [ ] Fields: name, slug (auto-generated from name), GitHub repo, content path, Netlify site ID, Netlify URL
  - [ ] Assign owner (select from existing users)
  - [ ] Schema editor (JSON textarea — functional, not pretty)
  - [ ] On submit: insert into `sites` table
- [ ] Create client form (`/admin/clients/new`)
  - [ ] Fields: email, name
  - [ ] On submit: create Supabase auth user via admin API
  - [ ] Send welcome email with "Set your password" link
- [ ] Edit schema (`/admin/sites/:siteId/schema`)
  - [ ] Load current schema as JSON
  - [ ] JSON editor with validation
  - [ ] Save to `sites.schema`
- [ ] Impersonate view
  - [ ] Admin can access any site's editor
  - [ ] Clear visual indicator: "Editing as admin — this is [Client Name]'s site"

**Deliverable:** Full onboarding flow — create client account, create site record with schema, client logs in and starts editing.

---

### Phase 5 — Polish & Hardening

**Goal:** Production-ready quality.

- [ ] Password reset flow
  - [ ] "Forgot password?" → enter email → magic link sent
  - [ ] Magic link lands on `/reset-password` → set new password form
- [ ] Edit history / rollback
  - [ ] "History" tab in editor showing past publishes with timestamps
  - [ ] Click to preview old version
  - [ ] "Restore this version" → loads into draft
- [ ] Responsive design
  - [ ] Editor works on tablet (clients may use iPad)
  - [ ] Login and dashboard work on mobile
- [ ] Error handling hardening
  - [ ] GitHub API rate limits / failures → clear error messages
  - [ ] Supabase connection issues → offline indicator
  - [ ] Optimistic UI where appropriate
- [ ] Welcome email template
  - [ ] Branded email when you create a client account
  - [ ] "Set your password" CTA
  - [ ] Link to their site + portal
- [ ] Preview before publish (stretch)
  - [ ] iframe loading the client site with draft content injected
  - [ ] Or: screenshot comparison of current vs draft

---

## Environment Variables

### Portal (Netlify env vars)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Supabase Edge Functions (Supabase secrets)

```
GITHUB_PAT=ghp_xxxxxxxxxxxxx
```

---

## File Structure

```
client-portal/
├── public/
│   └── _redirects              # /* /index.html 200
├── src/
│   ├── main.jsx
│   ├── App.jsx                 # Router setup
│   ├── lib/
│   │   └── supabase.js         # Supabase client init
│   ├── contexts/
│   │   └── AuthContext.jsx     # Session management
│   ├── components/
│   │   ├── ProtectedRoute.jsx
│   │   ├── AdminRoute.jsx
│   │   └── fields/             # One component per field type
│   │       ├── TextField.jsx
│   │       ├── TextareaField.jsx
│   │       ├── EmailField.jsx
│   │       ├── PhoneField.jsx
│   │       ├── CurrencyField.jsx
│   │       ├── UrlField.jsx
│   │       ├── ToggleField.jsx
│   │       ├── SelectField.jsx
│   │       ├── ListField.jsx
│   │       ├── HoursGridField.jsx
│   │       ├── StarsField.jsx
│   │       ├── ImageGalleryField.jsx
│   │       └── ImageSingleField.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Editor.jsx          # Schema-driven content editor
│   │   ├── ResetPassword.jsx
│   │   └── admin/
│   │       ├── SitesList.jsx
│   │       ├── CreateSite.jsx
│   │       ├── CreateClient.jsx
│   │       └── EditSchema.jsx
│   └── utils/
│       ├── schemaRenderer.js   # Maps schema to field components
│       └── autoSave.js         # Debounced draft saving
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── publish-content/
│           └── index.ts        # Edge Function: commit to GitHub
├── package.json
├── vite.config.js
├── CLAUDE.md                   # Project context for Claude Code
└── tasks/
    └── todo.md                 # Phase tracking
```

---

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub API rate limit (5,000/hr authenticated) | Publishes fail | One commit per publish; 5,000 publishes/hr is far beyond any realistic usage |
| Supabase free tier limits | Auth/storage stops working | Upgrade to Pro ($25/mo) once you pass ~50 clients |
| Netlify build queue during peak edits | Publish delay increases | 3 concurrent builds on Pro; queue is transparent to client |
| Client breaks their content | Site shows wrong info | Auto-save + content_history enables rollback; schema validation prevents structural damage |
| GitHub PAT expires / gets revoked | All publishes fail | Monitor in admin; PAT rotation reminder; fine-grained tokens last up to 1 year |

---

## Onboarding a New Client (End-to-End)

1. Build the client's site (Figma Make → React/Vite → content.json)
2. Deploy to Netlify, push repo to GitHub
3. In portal admin: Create Client → enter email → welcome email sent
4. In portal admin: Create Site → enter repo, Netlify ID, write schema
5. Assign site to client
6. Client receives email, sets password, logs in, sees their site on dashboard
7. Client edits content, publishes — site updates automatically

**Target time for steps 3–6: under 10 minutes per client.**
