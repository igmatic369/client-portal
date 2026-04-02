import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: verify caller is a logged-in user ─────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    // Use the user's JWT so RLS applies (they can only access their own sites)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Service-role client for operations that bypass RLS (write to history, delete draft)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Parse body ──────────────────────────────────────────────────────────
    const { site_id, content_json } = await req.json()
    if (!site_id || !content_json) {
      return json({ error: 'site_id and content_json are required' }, 400)
    }

    // ── Fetch site (RLS: only owner can read this row) ──────────────────────
    const { data: site, error: siteErr } = await supabase
      .from('sites')
      .select('id, name, github_repo, github_content_path')
      .eq('id', site_id)
      .single()

    if (siteErr || !site) {
      return json({ error: 'Site not found or access denied' }, 403)
    }

    const repo = site.github_repo                         // e.g. "igmatic369/okanagan-porch-pumpkins"
    const filePath = site.github_content_path             // e.g. "src/content.json"
    const branch = 'main'
    const githubPat = Deno.env.get('GITHUB_PAT')

    if (!githubPat) {
      return json({ error: 'GITHUB_PAT secret not configured' }, 500)
    }

    // ── Get current file SHA (required by GitHub API to update a file) ──────
    const shaRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'NoWebsiteLeads-Portal',
        },
      }
    )

    if (!shaRes.ok) {
      const body = await shaRes.text()
      return json({ error: `GitHub SHA fetch failed: ${shaRes.status} ${body}` }, 502)
    }

    const shaData = await shaRes.json()
    const currentSha: string = shaData.sha

    // ── Push updated content.json to GitHub ─────────────────────────────────
    const bytes = new TextEncoder().encode(JSON.stringify(content_json, null, 2))
    const encoded = btoa(String.fromCharCode(...bytes))

    const pushRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'NoWebsiteLeads-Portal',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `portal: update ${filePath}`,
          content: encoded,
          sha: currentSha,
          branch,
        }),
      }
    )

    if (!pushRes.ok) {
      const body = await pushRes.text()
      return json({ error: `GitHub push failed: ${pushRes.status} ${body}` }, 502)
    }

    // ── Write to content_history (admin client, bypasses RLS) ───────────────
    const { data: { user } } = await supabase.auth.getUser()
    await admin.from('content_history').insert({
      site_id,
      content_json,
      published_by: user?.id ?? null,
    })

    // ── Delete the active draft (it's now live) ──────────────────────────────
    await admin.from('content_drafts').delete().eq('site_id', site_id)

    return json({ ok: true })

  } catch (err) {
    console.error('publish-content error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
