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
  error:  'Save failed',
}

// Immutably set a value at a dot-path in a nested object
function setNestedValue(obj, dotPath, value) {
  const keys = dotPath.split('.')
  const result = JSON.parse(JSON.stringify(obj))
  let cursor = result
  for (let i = 0; i < keys.length - 1; i++) cursor = cursor[keys[i]]
  cursor[keys[keys.length - 1]] = value
  return result
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
  const [viewMode, setViewMode]   = useState('preview') // 'preview' | 'form'

  const [publishing, setPublishing]     = useState(false)
  const [publishDone, setPublishDone]   = useState(false)
  const [banner, setBanner]             = useState(null)

  const debounceTimer    = useRef(null)
  const bannerTimer      = useRef(null)
  const publishDoneTimer = useRef(null)
  const latestContent    = useRef(null)
  const iframeRef        = useRef(null)
  const iframeReadyRef   = useRef(false)

  // ── Load site + schema + draft ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: siteRow, error: siteErr } = await supabase
        .from('sites')
        .select('id, name, slug, schema, netlify_url')
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
        // If site has no netlify_url, default to form view
        if (!siteRow.netlify_url) setViewMode('form')
      }
    }

    load()
    return () => { cancelled = true }
  }, [siteId])

  // ── Send content to iframe ──────────────────────────────────────────────────
  function sendContentToIframe(contentObj) {
    if (iframeRef.current?.contentWindow && iframeReadyRef.current && contentObj) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'preview-content-update', content: contentObj },
        '*'
      )
    }
  }

  // ── Listen for messages from iframe bridge ──────────────────────────────────
  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return

      if (event.data.type === 'preview-ready') {
        iframeReadyRef.current = true
        sendContentToIframe(latestContent.current)
        return
      }

      if (event.data.type === 'preview-field-change') {
        const { key, value } = event.data
        const newContent = setNestedValue(latestContent.current, key, value)
        latestContent.current = newContent
        setContent(newContent)
        setSaveStatus('dirty')
        sendContentToIframe(newContent)

        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
          save(latestContent.current)
        }, AUTOSAVE_DELAY)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, []) // uses refs — safe with empty deps

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
    sendContentToIframe(newContent)

    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      save(latestContent.current)
    }, AUTOSAVE_DELAY)
  }

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    clearTimeout(debounceTimer.current)
    if (saveStatus === 'dirty') {
      await save(latestContent.current)
    }

    setPublishing(true)
    setBanner(null)
    clearTimeout(bannerTimer.current)

    const { error: fnErr } = await supabase.functions.invoke('publish-content', {
      body: { site_id: siteId, content_json: latestContent.current },
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
      bannerTimer.current = setTimeout(() => setBanner(null), PUBLISH_SUCCESS_DISMISS)
      setPublishDone(true)
      publishDoneTimer.current = setTimeout(() => setPublishDone(false), PUBLISH_DONE_LABEL_DURATION)
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current)
      clearTimeout(bannerTimer.current)
      clearTimeout(publishDoneTimer.current)
    }
  }, [])

  // ── Derived state ───────────────────────────────────────────────────────────
  const publishDisabled = publishing || saveStatus === 'saving'

  const publishLabel = publishing
    ? 'Publishing…'
    : publishDone
      ? 'Published ✓'
      : 'Publish'

  const publishBtnStyle = {
    padding: '7px 16px',
    borderRadius: '7px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: publishDisabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s, color 0.2s',
    ...(publishDisabled
      ? { background: '#d4d0cc', color: '#a8a29e' }
      : publishDone
        ? { background: '#16a34a', color: '#fff' }
        : { background: '#ea580c', color: '#fff' }),
  }

  const previewUrl = site?.netlify_url ? `${site.netlify_url}?preview=true` : null

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loading editor…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4' }}>
        <div>
          <p style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</p>
          <button type="button" onClick={() => navigate('/')} style={{ color: '#ea580c', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#f5f5f4' }}>

      {/* ── Floating Toolbar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        height: '48px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '4px',
        maxWidth: '720px',
        width: 'max-content',
        whiteSpace: 'nowrap',
      }}>

        {/* Exit */}
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#44403c', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
        >
          ← Exit
        </button>

        <Divider />

        {/* Site name */}
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', padding: '0 4px' }}>
          {site?.name}
        </span>

        <Divider />

        {/* Save status */}
        <span style={{ fontSize: '12px', padding: '0 4px', minWidth: '100px', textAlign: 'center', ...statusStyle[saveStatus] }}>
          {statusText[saveStatus]}
        </span>

        <Divider />

        {/* View toggle */}
        {previewUrl ? (
          <button
            type="button"
            onClick={() => setViewMode((v) => v === 'preview' ? 'form' : 'preview')}
            style={{
              background: viewMode === 'form' ? '#fff7ed' : '#f5f5f4',
              border: `1px solid ${viewMode === 'form' ? '#fed7aa' : '#e7e5e4'}`,
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              color: viewMode === 'form' ? '#ea580c' : '#44403c',
            }}
          >
            {viewMode === 'preview' ? 'Form View' : 'Preview'}
          </button>
        ) : (
          <span style={{ fontSize: '12px', color: '#a8a29e', padding: '0 4px' }}>No preview URL</span>
        )}

        <Divider />

        {/* Publish */}
        <button
          type="button"
          disabled={publishDisabled}
          onClick={handlePublish}
          style={publishBtnStyle}
        >
          {publishLabel}
        </button>
      </div>

      {/* ── Banner ────────────────────────────────────────────────────────────── */}
      {banner && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          fontSize: '13px',
          fontWeight: 500,
          ...(banner.type === 'success'
            ? { background: '#f0fdf4', color: '#15803d', borderBottom: '1px solid #bbf7d0' }
            : { background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }),
        }}>
          <span>{banner.message}</span>
          <button
            type="button"
            onClick={() => { setBanner(null); clearTimeout(bannerTimer.current) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit', opacity: 0.6, padding: '0 4px', lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Preview iframe (always mounted, hidden in form view) ─────────────── */}
      {previewUrl && (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          title={site?.name}
          style={{
            display: viewMode === 'preview' ? 'block' : 'none',
            width: '100%',
            height: '100vh',
            border: 'none',
          }}
          onLoad={() => {
            // Reset ready flag — bridge will re-send 'preview-ready' after load
            iframeReadyRef.current = false
          }}
        />
      )}

      {/* ── Form view ─────────────────────────────────────────────────────────── */}
      {viewMode === 'form' && (
        <div style={{ height: '100vh', overflowY: 'auto', paddingTop: '72px' }}>
          <main style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 24px 48px' }}>
            {schema && content ? (
              <div style={{ background: '#fff', border: '1.5px solid #e7e5e4', borderRadius: '12px', padding: '28px' }}>
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
      )}
    </div>
  )
}

function Divider() {
  return <div style={{ width: '1px', height: '20px', background: '#e7e5e4', margin: '0 6px', flexShrink: 0 }} />
}
