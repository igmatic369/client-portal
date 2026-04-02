import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const s = {
  topBar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '13px', color: '#78716c', padding: 0,
  },
  heading: { fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 },
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
  actions: { display: 'flex', gap: '10px', marginTop: '24px' },
  submitBtn: {
    background: '#ea580c', color: '#fff', border: 'none',
    borderRadius: '7px', padding: '10px 22px', fontSize: '14px',
    fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none', border: '1.5px solid #e7e5e4', borderRadius: '7px',
    padding: '10px 18px', fontSize: '14px', color: '#44403c', cursor: 'pointer',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
  },
}

export default function CreateSite() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    name: '', slug: '', github_repo: '', github_content_path: 'src/content.json',
    netlify_url: '', netlify_site_id: '', owner_id: '', schema: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.functions.invoke('admin-list-users').then(({ data }) => {
      if (data?.users) setUsers(data.users)
    })
  }, [])

  const handleNameChange = (val) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: slugEdited ? f.slug : toSlug(val),
    }))
  }

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate schema JSON if provided
    let parsedSchema = {}
    if (form.schema.trim()) {
      try { parsedSchema = JSON.parse(form.schema) }
      catch { setError('Schema is not valid JSON.'); return }
    }

    setSubmitting(true)
    const { error: insertErr } = await supabase.from('sites').insert({
      name: form.name,
      slug: form.slug,
      github_repo: form.github_repo,
      github_content_path: form.github_content_path || 'src/content.json',
      netlify_url: form.netlify_url || null,
      netlify_site_id: form.netlify_site_id || null,
      owner_id: form.owner_id || null,
      schema: parsedSchema,
    })
    setSubmitting(false)

    if (insertErr) { setError(insertErr.message); return }
    navigate('/admin/sites')
  }

  return (
    <div>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('/admin/sites')}>← Sites</button>
        <h1 style={s.heading}>Create New Site</h1>
      </div>

      <div style={s.card}>
        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Site Name *</label>
            <input
              style={s.input} required value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="LD Nails & Spa"
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Slug *</label>
            <input
              style={s.input} required value={form.slug}
              onChange={(e) => { setSlugEdited(true); set('slug', e.target.value) }}
              placeholder="ld-nails-and-spa"
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
            <p style={s.hint}>URL-safe identifier, auto-generated from name</p>
          </div>

          <div style={s.field}>
            <label style={s.label}>GitHub Repo</label>
            <input
              style={s.input} value={form.github_repo}
              onChange={(e) => set('github_repo', e.target.value)}
              placeholder="igmatic369/ld-nails-site"
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Content Path</label>
            <input
              style={s.input} value={form.github_content_path}
              onChange={(e) => set('github_content_path', e.target.value)}
              placeholder="src/content.json"
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
              placeholder="abc123de-..."
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Owner</label>
            <select
              style={s.select} value={form.owner_id}
              onChange={(e) => set('owner_id', e.target.value)}
            >
              <option value="">— Select an owner —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Schema JSON <span style={{ color: '#a8a29e', fontWeight: 400 }}>(paste JSON, or leave empty to configure later)</span></label>
            <textarea
              style={{ ...s.textarea, minHeight: '160px' }}
              value={form.schema}
              onChange={(e) => set('schema', e.target.value)}
              placeholder={'{\n  "tabs": [...]\n}'}
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
          </div>

          <div style={s.actions}>
            <button type="submit" disabled={submitting} style={{
              ...s.submitBtn,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
              {submitting ? 'Creating…' : 'Create Site'}
            </button>
            <button type="button" style={s.cancelBtn} onClick={() => navigate('/admin/sites')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
