import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const s = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#78716c', padding: 0 },
  heading: { fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 },
  clientBtn: {
    background: 'none', border: '1.5px solid #e7e5e4', borderRadius: '7px',
    padding: '8px 14px', fontSize: '13px', color: '#44403c', cursor: 'pointer', fontWeight: 500,
  },
  card: {
    background: '#fff', border: '1.5px solid #e7e5e4',
    borderRadius: '10px', padding: '28px', maxWidth: '640px',
  },
  field: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#44403c', marginBottom: '6px' },
  input: {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e7e5e4',
    borderRadius: '7px', fontSize: '14px', color: '#1c1917', outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e7e5e4',
    borderRadius: '7px', fontSize: '14px', color: '#1c1917', outline: 'none',
    background: '#fff', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e7e5e4',
    borderRadius: '7px', fontSize: '13px', color: '#1c1917', outline: 'none',
    fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
  },
  hint: { fontSize: '11px', color: '#a8a29e', marginTop: '4px' },
  actions: { display: 'flex', gap: '10px', marginTop: '24px', alignItems: 'center' },
  saveBtn: {
    background: '#ea580c', color: '#fff', border: 'none',
    borderRadius: '7px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none', border: '1.5px solid #e7e5e4', borderRadius: '7px',
    padding: '10px 18px', fontSize: '14px', color: '#44403c', cursor: 'pointer',
  },
  deleteBtn: {
    background: 'none', border: '1.5px solid #fecaca', borderRadius: '7px',
    padding: '10px 18px', fontSize: '14px', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
  },
  successBox: {
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    color: '#15803d', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
  },
}

export default function EditSite() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(null)
  const [slugEdited, setSlugEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: site, error: siteErr }, { data: usersData }] = await Promise.all([
        supabase.from('sites').select('*').eq('id', siteId).single(),
        supabase.functions.invoke('admin-list-users'),
      ])

      if (siteErr || !site) { setError('Site not found.'); return }

      setForm({
        name: site.name ?? '',
        slug: site.slug ?? '',
        github_repo: site.github_repo ?? '',
        github_content_path: site.github_content_path ?? 'src/content.json',
        netlify_url: site.netlify_url ?? '',
        netlify_site_id: site.netlify_site_id ?? '',
        owner_id: site.owner_id ?? '',
        schema: site.schema ? JSON.stringify(site.schema, null, 2) : '',
      })

      if (usersData?.users) setUsers(usersData.users)
    }
    load()
  }, [siteId])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleNameChange = (val) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: slugEdited ? f.slug : toSlug(val),
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    let parsedSchema = {}
    if (form.schema.trim()) {
      try { parsedSchema = JSON.parse(form.schema) }
      catch { setError('Schema is not valid JSON.'); return }
    }

    setSubmitting(true)
    const { error: updateErr } = await supabase.from('sites').update({
      name: form.name,
      slug: form.slug,
      github_repo: form.github_repo,
      github_content_path: form.github_content_path || 'src/content.json',
      netlify_url: form.netlify_url || null,
      netlify_site_id: form.netlify_site_id || null,
      owner_id: form.owner_id || null,
      schema: parsedSchema,
    }).eq('id', siteId)
    setSubmitting(false)

    if (updateErr) { setError(updateErr.message); return }
    setSuccess('Site saved successfully.')
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${form?.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const { error: delErr } = await supabase.from('sites').delete().eq('id', siteId)
    setDeleting(false)
    if (delErr) { setError(delErr.message); return }
    navigate('/admin/sites')
  }

  if (!form && !error) {
    return <p style={{ color: '#78716c', fontSize: '14px' }}>Loading site…</p>
  }

  return (
    <div>
      <div style={s.topBar}>
        <div style={s.topBarLeft}>
          <button style={s.backBtn} onClick={() => navigate('/admin/sites')}>← Sites</button>
          <h1 style={s.heading}>{form?.name ?? 'Edit Site'}</h1>
        </div>
        <button style={s.clientBtn} onClick={() => navigate(`/site/${siteId}/edit`)}>
          Edit as Client →
        </button>
      </div>

      {error && <div style={{ ...s.errorBox, maxWidth: '640px' }}>{error}</div>}

      {form && (
        <div style={s.card}>
          {success && <div style={s.successBox}>{success}</div>}

          <form onSubmit={handleSave}>
            <div style={s.field}>
              <label style={s.label}>Site Name *</label>
              <input
                style={s.input} required value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Slug *</label>
              <input
                style={s.input} required value={form.slug}
                onChange={(e) => { setSlugEdited(true); set('slug', e.target.value) }}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
              <p style={s.hint}>Changing the slug does NOT rename the GitHub repo or Netlify site</p>
            </div>

            <div style={s.field}>
              <label style={s.label}>GitHub Repo</label>
              <input
                style={s.input} value={form.github_repo}
                onChange={(e) => set('github_repo', e.target.value)}
                placeholder="igmatic369/site-name"
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Content Path</label>
              <input
                style={s.input} value={form.github_content_path}
                onChange={(e) => set('github_content_path', e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Netlify URL</label>
              <input
                style={s.input} value={form.netlify_url}
                onChange={(e) => set('netlify_url', e.target.value)}
                placeholder="https://sitename.netlify.app"
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Netlify Site ID <span style={{ color: '#a8a29e', fontWeight: 400 }}>(optional)</span></label>
              <input
                style={s.input} value={form.netlify_site_id}
                onChange={(e) => set('netlify_site_id', e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Owner</label>
              <select style={s.select} value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
                <option value="">— No owner assigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Schema JSON</label>
              <textarea
                style={{ ...s.textarea, minHeight: '200px' }}
                value={form.schema}
                onChange={(e) => set('schema', e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>

            <div style={s.actions}>
              <button type="submit" disabled={submitting} style={{
                ...s.saveBtn,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" style={s.cancelBtn} onClick={() => navigate('/admin/sites')}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...s.deleteBtn, opacity: deleting ? 0.6 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Site'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
