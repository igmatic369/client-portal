import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SchemaForm from '../components/editor/SchemaForm'
import testContent from '../test-data/opp-content.json'

const AUTOSAVE_DELAY = 2000
const PUBLISH_SUCCESS_DISMISS = 10000
const PUBLISH_DONE_LABEL_DURATION = 2500

const statusStyle = {
  idle:   { color: '#a8a29e' },
  dirty:  { color: '#a8a29e' },
  saving: { color: '#78716c' },
  saved:  { color: '#16a34a' },
  error:  { color: '#ef4444' },
}

const statusText = {
  idle:   '',
  dirty:  'Unsaved changes',
  saving: 'Saving…',
  saved:  'Draft saved ✓',
  error:  'Save failed — will retry',
}

export default function Editor() {
  const { siteId } = useParams()
  const navigate = useNavigate()

  const [site, setSite]           = useState(null)
  const [schema, setSchema]       = useState(null)
  const [content, setContent]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')

  const [publishing, setPublishing]     = useState(false)
  const [publishDone, setPublishDone]   = useState(false)   // briefly shows "Published ✓"
  const [banner, setBanner]             = useState(null)    // { type: 'success'|'error', message }

  const debounceTimer    = useRef(null)
  const bannerTimer      = useRef(null)
  const publishDoneTimer = useRef(null)
  const latestContent    = useRef(null)

  // ── Load site + schema + draft ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: siteRow, error: siteErr } = await supabase
        .from('sites')
        .select('id, name, slug, schema')
        .eq('id', siteId)
        .single()

      if (siteErr || !siteRow) {
        if (!cancelled) setError('Site not found.')
        setLoading(false)
        return
      }

      const { data: draft } = await supabase
        .from('content_drafts')
        .select('content_json')
        .eq('site_id', siteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Determine initial content: draft → GitHub → test data fallback
      let initialContent
      if (draft?.content_json) {
        initialContent = draft.content_json
      } else {
        const { data: fetched, error: fetchErr } = await supabase.functions.invoke('fetch-content', {
          body: { site_id: siteId },
        })
        if (!fetchErr && fetched?.content_json) {
          initialContent = fetched.content_json
        } else {
          console.warn('fetch-content failed, falling back to test data:', fetchErr)
          initialContent = testContent
        }
      }

      if (!cancelled) {
        setSite(siteRow)
        setSchema(siteRow.schema ?? null)
        setContent(initialContent)
        latestContent.current = initialContent
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [siteId])

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const save = async (contentToSave) => {
    setSaveStatus('saving')
    const { error: saveErr } = await supabase
      .from('content_drafts')
      .upsert(
        { site_id: siteId, content_json: contentToSave, updated_at: new Date().toISOString() },
        { onConflict: 'site_id' }
      )

    if (saveErr) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus((s) => s === 'saved' ? 'idle' : s), 3000)
    }
  }

  const handleChange = (newContent) => {
    setContent(newContent)
    latestContent.current = newContent
    setSaveStatus('dirty')

    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      save(latestContent.current)
    }, AUTOSAVE_DELAY)
  }

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    // Flush any pending auto-save first so the draft is current
    clearTimeout(debounceTimer.current)
    if (saveStatus === 'dirty') {
      await save(latestContent.current)
    }

    setPublishing(true)
    setBanner(null)
    clearTimeout(bannerTimer.current)

    const { error: fnErr } = await supabase.functions.invoke('publish-content', {
      body: { site_id: siteId, content_json: content },
    })

    setPublishing(false)

    if (fnErr) {
      setBanner({ type: 'error', message: fnErr.message ?? 'Publish failed. Your draft is still saved.' })
    } else {
      setBanner({
        type: 'success',
        message: 'Changes published! Your site will update in about 2 minutes.',
      })
      setSaveStatus('idle')

      // Auto-dismiss success banner
      bannerTimer.current = setTimeout(() => setBanner(null), PUBLISH_SUCCESS_DISMISS)

      // Briefly show "Published ✓" on the button
      setPublishDone(true)
      publishDoneTimer.current = setTimeout(() => setPublishDone(false), PUBLISH_DONE_LABEL_DURATION)
    }
  }

  // ── Cleanup timers ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current)
      clearTimeout(bannerTimer.current)
      clearTimeout(publishDoneTimer.current)
    }
  }, [])

  // ── Derived publish button state ────────────────────────────────────────────
  const publishDisabled = publishing || saveStatus === 'saving'

  const publishLabel = publishing
    ? 'Publishing…'
    : publishDone
      ? 'Published ✓'
      : 'Publish'

  const publishStyle = {
    padding: '8px 18px',
    borderRadius: '7px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: publishDisabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s, color 0.2s',
    ...(publishDisabled
      ? { background: '#d4d0cc', color: '#a8a29e' }
      : publishDone
        ? { background: '#16a34a', color: '#fff' }
        : { background: '#ea580c', color: '#fff' }),
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={pageWrap}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loading editor…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={pageWrap}>
        <p style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</p>
        <button type="button" onClick={() => navigate('/')} style={{ color: '#ea580c', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4' }}>
      {/* Top bar */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e7e5e4',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: '1.5px solid #e7e5e4',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              color: '#44403c',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ← Dashboard
          </button>
          {site && (
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1c1917' }}>
              {site.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', ...statusStyle[saveStatus] }}>
            {statusText[saveStatus]}
          </span>
          <button
            type="button"
            disabled={publishDisabled}
            onClick={handlePublish}
            style={publishStyle}
          >
            {publishLabel}
          </button>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 500,
          ...(banner.type === 'success'
            ? { background: '#f0fdf4', color: '#15803d', borderBottom: '1px solid #bbf7d0' }
            : { background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }),
        }}>
          <span>{banner.message}</span>
          <button
            type="button"
            onClick={() => { setBanner(null); clearTimeout(bannerTimer.current) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: 'inherit',
              opacity: 0.6,
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '36px 24px' }}>
        {schema && content ? (
          <div style={{
            background: '#fff',
            border: '1.5px solid #e7e5e4',
            borderRadius: '12px',
            padding: '28px',
          }}>
            <SchemaForm
              schema={schema}
              content={content}
              onChange={handleChange}
              siteSlug={site?.slug}
            />
          </div>
        ) : (
          <div style={{
            padding: '40px',
            background: '#fafaf9',
            border: '1.5px dashed #d4d0cc',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#78716c',
            fontSize: '14px',
          }}>
            {!schema
              ? 'No schema configured for this site. Run the SQL setup in Supabase.'
              : 'No content loaded.'}
          </div>
        )}
      </main>
    </div>
  )
}

const pageWrap = {
  maxWidth: '820px',
  margin: '0 auto',
  padding: '32px 24px',
}
