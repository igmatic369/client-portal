import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { site_id } = await req.json()
    if (!site_id) {
      return json({ error: 'site_id is required' }, 400)
    }

    // RLS: only the site owner can read this row
    const { data: site, error: siteErr } = await supabase
      .from('sites')
      .select('github_repo, github_content_path')
      .eq('id', site_id)
      .single()

    if (siteErr || !site) {
      return json({ error: 'Site not found or access denied' }, 403)
    }

    const repo     = site.github_repo
    const filePath = site.github_content_path
    const branch   = 'main'
    const githubPat = Deno.env.get('GITHUB_PAT')

    if (!githubPat) {
      return json({ error: 'GITHUB_PAT secret not configured' }, 500)
    }

    const res = await fetch(
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

    if (!res.ok) {
      const body = await res.text()
      return json({ error: `GitHub fetch failed: ${res.status} ${body}` }, 502)
    }

    const data = await res.json()

    // GitHub returns content as base64 with newlines — decode as UTF-8
    const raw = atob(data.content.replace(/\n/g, ''))
    const text = new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0)))
    const content_json = JSON.parse(text)

    return json({ content_json })

  } catch (err) {
    console.error('fetch-content error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
