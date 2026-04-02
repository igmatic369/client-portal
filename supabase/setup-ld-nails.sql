-- Setup LD Nails & Spa in the client portal
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run — uses ON CONFLICT DO UPDATE (upsert)
-- Verify after: SELECT id, slug, github_repo, netlify_url FROM sites WHERE slug = 'ld-nails-and-spa';

INSERT INTO sites (
  name,
  slug,
  github_repo,
  github_content_path,
  netlify_url,
  owner_id,
  schema,
  created_at,
  updated_at
)
VALUES (
  'LD Nails & Spa',
  'ld-nails-and-spa',
  'igmatic369/ld-nails-site',
  'src/content.json',
  'https://ldnailsandspa.netlify.app',
  '35248b9e-0f8b-48b9-b5e1-4fb76ec681bb',
  '{
  "tabs": [
    {
      "key": "business",
      "label": "Business Info",
      "fields": [
        { "key": "name",               "label": "Business Name",        "type": "text",     "required": true, "maxLength": 80 },
        { "key": "phone_display",      "label": "Phone (Display)",      "type": "phone" },
        { "key": "phone_tel",          "label": "Phone (tel: digits)",  "type": "text",     "maxLength": 20 },
        { "key": "address_line1",      "label": "Address Line 1",       "type": "text",     "maxLength": 100 },
        { "key": "address_line2",      "label": "Address Line 2",       "type": "text",     "maxLength": 100 },
        { "key": "address_country",    "label": "Country",              "type": "text",     "maxLength": 50 },
        { "key": "address_city_short", "label": "City (short)",         "type": "text",     "maxLength": 60 },
        { "key": "location_note",      "label": "Location Note",        "type": "text",     "maxLength": 150 },
        { "key": "facebook_url",       "label": "Facebook URL",         "type": "url" },
        { "key": "facebook_handle",    "label": "Facebook Handle",      "type": "text",     "maxLength": 60 },
        { "key": "established",        "label": "Year Established",     "type": "text",     "maxLength": 4 }
      ]
    },
    {
      "key": "hours",
      "label": "Hours",
      "fields": [
        {
          "key": "hours",
          "label": "Opening Hours",
          "type": "list",
          "item_label": "Day",
          "item_fields": [
            { "key": "day",  "label": "Day",   "type": "text", "maxLength": 20 },
            { "key": "time", "label": "Hours", "type": "text", "maxLength": 40 }
          ]
        }
      ]
    },
    {
      "key": "hero",
      "label": "Hero",
      "fields": [
        { "key": "headline",                  "label": "Headline",                  "type": "text",     "maxLength": 80 },
        { "key": "subheadline",               "label": "Subheadline",               "type": "text",     "maxLength": 120 },
        { "key": "body",                      "label": "Body Text",                 "type": "textarea", "maxLength": 300 },
        { "key": "cta_primary_text",          "label": "Primary Button Text",       "type": "text",     "maxLength": 40 },
        { "key": "cta_primary_link",          "label": "Primary Button Link",       "type": "text",     "maxLength": 80 },
        { "key": "cta_secondary_link",        "label": "Secondary Button Link",     "type": "text",     "maxLength": 80 },
        { "key": "services_section_headline", "label": "Services Section Headline", "type": "text",     "maxLength": 60 },
        { "key": "gallery_section_headline",  "label": "Gallery Section Headline",  "type": "text",     "maxLength": 60 },
        { "key": "gallery_section_body",      "label": "Gallery Section Body",      "type": "textarea", "maxLength": 200 },
        { "key": "reviews_section_headline",  "label": "Reviews Section Headline",  "type": "text",     "maxLength": 60 },
        { "key": "cta_section_headline",      "label": "CTA Section Headline",      "type": "text",     "maxLength": 80 },
        { "key": "cta_section_body",          "label": "CTA Section Body",          "type": "textarea", "maxLength": 300 },
        {
          "key": "featured_services",
          "label": "Featured Services (Hero Cards)",
          "type": "list",
          "item_label": "Card",
          "item_fields": [
            { "key": "title",       "label": "Title",       "type": "text", "maxLength": 60 },
            { "key": "description", "label": "Description", "type": "text", "maxLength": 150 }
          ]
        }
      ]
    },
    {
      "key": "about",
      "label": "About",
      "fields": [
        { "key": "hero_image",              "label": "Hero Image (filename or URL)", "type": "text",        "maxLength": 300 },
        { "key": "hero_headline",           "label": "Hero Headline",                "type": "text",        "maxLength": 80 },
        { "key": "hero_subtext",            "label": "Hero Subtext",                 "type": "text",        "maxLength": 120 },
        { "key": "section_title",           "label": "Section Title",                "type": "text",        "maxLength": 80 },
        { "key": "body_paragraphs",         "label": "Body Paragraphs",              "type": "simple_list", "item_label": "Paragraph" },
        { "key": "features",                "label": "Features List",                "type": "simple_list", "item_label": "Feature" },
        {
          "key": "values",
          "label": "Values",
          "type": "list",
          "item_label": "Value",
          "item_fields": [
            { "key": "icon",        "label": "Icon Name (e.g. Heart, Award, Users)", "type": "text",     "maxLength": 30 },
            { "key": "title",       "label": "Title",                                "type": "text",     "maxLength": 60 },
            { "key": "description", "label": "Description",                          "type": "textarea", "maxLength": 250 }
          ]
        },
        { "key": "values_section_headline", "label": "Values Section Headline",      "type": "text",     "maxLength": 60 },
        { "key": "visit_title",             "label": "Visit Us Title",               "type": "text",     "maxLength": 60 },
        { "key": "visit_body",              "label": "Visit Us Body",                "type": "textarea", "maxLength": 400 }
      ]
    },
    {
      "key": "services",
      "label": "Services",
      "fields": [
        {
          "key": "services",
          "label": "Services",
          "type": "list",
          "item_label": "Service Category",
          "item_fields": [
            { "key": "title",       "label": "Category Title",            "type": "text",        "required": true, "maxLength": 60 },
            { "key": "image",       "label": "Image (filename or URL)",   "type": "text",        "maxLength": 300 },
            { "key": "description", "label": "Description",               "type": "textarea",    "maxLength": 300 },
            { "key": "items",       "label": "Services in this Category", "type": "simple_list", "item_label": "Service" }
          ]
        }
      ]
    },
    {
      "key": "pricing",
      "label": "Pricing",
      "fields": [
        { "key": "intro", "label": "Pricing Intro", "type": "textarea", "maxLength": 300 },
        {
          "key": "sections",
          "label": "Pricing Sections",
          "type": "list",
          "item_label": "Section",
          "item_fields": [
            { "key": "key",   "label": "Section Key (camelCase, e.g. artificialNails)", "type": "text", "maxLength": 40 },
            { "key": "title", "label": "Section Title",                                 "type": "text", "maxLength": 60 },
            {
              "key": "items",
              "label": "Price Items",
              "type": "list",
              "item_label": "Item",
              "item_fields": [
                { "key": "name",  "label": "Service Name", "type": "text", "maxLength": 80 },
                { "key": "price", "label": "Price",        "type": "text", "maxLength": 20 }
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
        { "key": "headline",       "label": "Headline",        "type": "text",     "maxLength": 80 },
        { "key": "body",           "label": "Body",            "type": "textarea", "maxLength": 300 },
        { "key": "cta_headline",   "label": "CTA Headline",    "type": "text",     "maxLength": 80 },
        { "key": "cta_body",       "label": "CTA Body",        "type": "textarea", "maxLength": 300 },
        { "key": "follow_headline","label": "Follow Headline", "type": "text",     "maxLength": 80 },
        { "key": "follow_body",    "label": "Follow Body",     "type": "text",     "maxLength": 150 },
        { "key": "images", "label": "Gallery Images", "type": "image_gallery" }
      ]
    },
    {
      "key": "reviews",
      "label": "Reviews",
      "fields": [
        {
          "key": "reviews",
          "label": "Client Reviews",
          "type": "list",
          "item_label": "Review",
          "item_fields": [
            { "key": "text",   "label": "Review Text", "type": "textarea", "maxLength": 500 },
            { "key": "author", "label": "Author",      "type": "text",     "maxLength": 60 }
          ]
        }
      ]
    },
    {
      "key": "contact",
      "label": "Contact",
      "fields": [
        { "key": "headline",          "label": "Headline",                     "type": "text",        "maxLength": 80 },
        { "key": "intro",             "label": "Intro",                        "type": "textarea",    "maxLength": 300 },
        { "key": "form_title",        "label": "Form Title",                   "type": "text",        "maxLength": 80 },
        { "key": "form_success",      "label": "Form Success Message",         "type": "text",        "maxLength": 200 },
        { "key": "services_list",     "label": "Bookable Services (dropdown)", "type": "simple_list", "item_label": "Service" },
        { "key": "walk_ins_note",     "label": "Walk-Ins Note",                "type": "text",        "maxLength": 100 },
        { "key": "gift_cards_note",   "label": "Gift Cards Note",              "type": "text",        "maxLength": 100 },
        { "key": "storefront_image",  "label": "Storefront Image (filename)",  "type": "text",        "maxLength": 300 },
        { "key": "google_maps_embed", "label": "Google Maps Embed URL",        "type": "text",        "maxLength": 600 },
        { "key": "google_maps_link",  "label": "Google Maps Link",             "type": "url" }
      ]
    }
  ]
}'::jsonb,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  name               = EXCLUDED.name,
  github_repo        = EXCLUDED.github_repo,
  github_content_path = EXCLUDED.github_content_path,
  netlify_url        = EXCLUDED.netlify_url,
  owner_id           = EXCLUDED.owner_id,
  schema             = EXCLUDED.schema,
  updated_at         = now();
