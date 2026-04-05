import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SchemaForm from '../components/editor/SchemaForm'
import testContent from '../test-data/opp-content.json'

const PUBLISH_SUCCESS_DISMISS = 10000
const PUBLISH_DONE_LABEL_DURATION = 2500

// Immutably set a value at a dot-path in a nested object
function setNestedValue(obj, dotPath, value) {
  const keys = dotPath.split('.')
  const result = JSON.parse(JSON.stringify(obj))
  let cursor = result
  for (let i = 0; i < keys.length - 1; i++) cursor = cursor[keys[i]]
  cursor[keys[keys.length - 1]] = value
  return result
}

const ITEM_TEMPLATES = {
  packages: {
    name: 'New Package', slug: '', number: 6, price: '$0',
    tagline: 'Package tagline', description: 'Package description',
    image: '', includes: ['Included item'],
    pumpkin_breakdown: [{ quantity: 0, type: 'Pumpkin type' }],
    highlight: false, badge: null, best_for: 'Best for...', note: ''
  },
  addons: {
    tag: 'Any Package', name: 'New Add-On', slug: '',
    image: '', price: '$0', restricted: false,
    description: 'Add-on description'
  },
  'gallery.photos': { src: '', alt: 'New photo', label: 'New Photo', span: 'col-span-1 row-span-1' },
  'faq.questions': { q: 'New question?', a: 'Answer here.' },
  'why_choose_us.features': { title: 'New Feature', description: 'Feature description.' },
  'how_it_works.steps': { number: '05', title: 'New Step', description: 'Step description.' },
  service_areas: 'New City',
}

// Immutably remove an item from a nested array at dot-path
function removeItem(obj, arrayPath, index) {
  const result = JSON.parse(JSON.stringify(obj))
  const keys = arrayPath.split('.')
  let arr = result
  for (const k of keys) arr = arr[k]
  arr.splice(index, 1)
  return result
}

// Immutably append a template item to a nested array at dot-path
function addItem(obj, arrayPath) {
  const result = JSON.parse(JSON.stringify(obj))
  const keys = arrayPath.split('.')
  let arr = result
  for (const k of keys) arr = arr[k]
  let template = JSON.parse(JSON.stringify(ITEM_TEMPLATES[arrayPath] ?? {}))
  if (template && typeof template === 'object' && 'slug' in template) {
    template.slug = arrayPath.split('.')[0] + '-' + Date.now()
  }
  arr.push(template)
  return result
}

// Immutably move an item within a nested array at dot-path
function reorderArray(obj, arrayPath, fromIndex, toIndex) {
  const result = JSON.parse(JSON.stringify(obj))
  const keys = arrayPath.split('.')
  let arr = result
  for (const k of keys) arr = arr[k]
  const [item] = arr.splice(fromIndex, 1)
  arr.splice(toIndex, 0, item)
  return result
}

// Returns a human-readable relative time string
function relativeTime(date) {
  if (!date) return null
  const diffMs = Date.now() - new Date(date).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  return new Date(date).toLocaleDateString()
}

export default function Editor() {
  const { siteId } = useParams()
  const navigate = useNavigate()

  const [site, setSite]           = useState(null)
  const [schema, setSchema]       = useState(null)
  const [content, setContent]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [viewMode, setViewMode]   = useState('preview') // 'preview' | 'form'

  // Save state
  const [dirty, setDirty]         = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  // Timestamp of the last persisted save (from Supabase updated_at or set on save)
  const [lastSaveTime, setLastSaveTime] = useState(null)

  // Draft history: [{ content, time }] — max 3, newest first — in-session saves
  const [draftHistory, setDraftHistory] = useState([])

  // Publish state
  const [publishing, setPublishing]     = useState(false)
  const [publishDone, setPublishDone]   = useState(false)
  const [banner, setBanner]             = useState(null)

  // Reset dropdown
  const [resetOpen, setResetOpen]       = useState(false)
  const [resetting, setResetting]       = useState(false)
  const resetRef                        = useRef(null)

  // Ticker to force re-render of relative times every 30s
  const [, setTick] = useState(0)

  const bannerTimer      = useRef(null)
  const publishDoneTimer = useRef(null)
  const savedTimer       = useRef(null)
  const tickTimer        = useRef(null)
  const latestContent    = useRef(null)
  const iframeRef        = useRef(null)
  const iframeReadyRef   = useRef(false)
  const siteRef          = useRef(null)

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
        .select('content_json, updated_at')
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
        siteRef.current = siteRow
        setSchema(siteRow.schema ?? null)
        setContent(initialContent)
        latestContent.current = initialContent
        if (draft?.updated_at) setLastSaveTime(draft.updated_at)
        setLoading(false)
        if (!siteRow.netlify_url) setViewMode('form')
      }
    }

    load()
    return () => { cancelled = true }
  }, [siteId])

  // ── Tick every 30s to keep relative times fresh ─────────────────────────────
  useEffect(() => {
    tickTimer.current = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(tickTimer.current)
  }, [])

  // ── Close reset dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    if (!resetOpen) return
    function handleOutside(e) {
      if (resetRef.current && !resetRef.current.contains(e.target)) {
        setResetOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [resetOpen])

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
        setDirty(true)
        sendContentToIframe(newContent)
      }

      if (event.data.type === 'preview-reorder') {
        const { arrayPath, fromIndex, toIndex } = event.data
        const newContent = reorderArray(latestContent.current, arrayPath, fromIndex, toIndex)
        latestContent.current = newContent
        setContent(newContent)
        setDirty(true)
        sendContentToIframe(newContent)
      }

      if (event.data.type === 'preview-remove-item') {
        const { arrayPath, index } = event.data
        const newContent = removeItem(latestContent.current, arrayPath, index)
        latestContent.current = newContent
        setContent(newContent)
        setDirty(true)
        sendContentToIframe(newContent)
      }

      if (event.data.type === 'preview-add-item') {
        const { arrayPath } = event.data
        const newContent = addItem(latestContent.current, arrayPath)
        latestContent.current = newContent
        setContent(newContent)
        setDirty(true)
        sendContentToIframe(newContent)
      }

      if (event.data.type === 'preview-image-upload') {
        ;(async () => {
          const { fileData, fileName, mimeType, contentKey } = event.data
          try {
            // Base64 data URL → Blob
            const base64 = fileData.split(',')[1]
            const binary = atob(base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            const blob = new Blob([bytes], { type: mimeType })

            const slug = siteRef.current?.slug || siteId
            const filePath = `${slug}/${Date.now()}-${fileName}`

            const { error: uploadErr } = await supabase.storage
              .from('site-images')
              .upload(filePath, blob, { contentType: mimeType })

            if (uploadErr) {
              console.error('[Editor] image upload failed:', uploadErr)
              return
            }

            const { data: urlData } = supabase.storage
              .from('site-images')
              .getPublicUrl(filePath)

            const newContent = setNestedValue(latestContent.current, contentKey, urlData.publicUrl)
            latestContent.current = newContent
            setContent(newContent)
            setDirty(true)
            sendContentToIframe(newContent)
          } catch (err) {
            console.error('[Editor] image upload error:', err)
          }
        })()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, []) // uses refs — safe with empty deps

  // ── Save draft ──────────────────────────────────────────────────────────────
  const save = async (contentToSave) => {
    setSaveStatus('saving')
    const now = new Date().toISOString()
    const { error: saveErr } = await supabase
      .from('content_drafts')
      .upsert(
        { site_id: siteId, content_json: contentToSave, updated_at: now },
        { onConflict: 'site_id' }
      )

    if (saveErr) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setDirty(false)
      setLastSaveTime(now)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleSaveDraft = () => {
    if (!dirty || saveStatus === 'saving') return
    // Push current content + timestamp to draft history before saving new version
    setDraftHistory((prev) => [
      { content: latestContent.current, time: new Date().toISOString() },
      ...prev,
    ].slice(0, 3))
    save(latestContent.current)
  }

  const handleChange = (newContent) => {
    setContent(newContent)
    latestContent.current = newContent
    setDirty(true)
    sendContentToIframe(newContent)
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = async (type) => {
    setResetOpen(false)
    setResetting(true)

    let newContent = null

    if (type === 'last-save') {
      const { data } = await supabase
        .from('content_drafts')
        .select('content_json')
        .eq('site_id', siteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      newContent = data?.content_json ?? null
    } else if (type.startsWith('history-')) {
      const idx = parseInt(type.split('-')[1], 10)
      newContent = draftHistory[idx]?.content ?? null
    } else if (type === 'original') {
      const { data, error: fnErr } = await supabase.functions.invoke('fetch-content', {
        body: { site_id: siteId },
      })
      if (!fnErr && data?.content_json) newContent = data.content_json
    }

    setResetting(false)

    if (!newContent) {
      setBanner({ type: 'error', message: 'Could not load that version.' })
      clearTimeout(bannerTimer.current)
      bannerTimer.current = setTimeout(() => setBanner(null), 4000)
      return
    }

    latestContent.current = newContent
    setContent(newContent)
    setDirty(true)
    sendContentToIframe(newContent)
  }

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (dirty) {
      setDraftHistory((prev) => [
        { content: latestContent.current, time: new Date().toISOString() },
        ...prev,
      ].slice(0, 3))
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
      bannerTimer.current = setTimeout(() => setBanner(null), PUBLISH_SUCCESS_DISMISS)
      setPublishDone(true)
      publishDoneTimer.current = setTimeout(() => setPublishDone(false), PUBLISH_DONE_LABEL_DURATION)
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(bannerTimer.current)
      clearTimeout(publishDoneTimer.current)
      clearTimeout(savedTimer.current)
      clearInterval(tickTimer.current)
    }
  }, [])

  // ── Derived state ───────────────────────────────────────────────────────────
  const publishDisabled = publishing || saveStatus === 'saving'
  const saveDraftDisabled = !dirty || saveStatus === 'saving'

  const publishLabel = publishing ? 'Publishing…' : publishDone ? 'Published ✓' : 'Publish'
  const saveDraftLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save Draft'

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

  const saveDraftBtnStyle = {
    padding: '7px 14px',
    borderRadius: '7px',
    border: '1px solid #e7e5e4',
    fontSize: '13px',
    fontWeight: 600,
    cursor: saveDraftDisabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s, color 0.2s',
    ...(saveStatus === 'saved'
      ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
      : saveStatus === 'error'
        ? { background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }
        : saveDraftDisabled
          ? { background: '#fafaf9', color: '#d4d0cc' }
          : { background: '#fff', color: '#44403c' }),
  }

  const resetBtnStyle = {
    padding: '7px 12px',
    borderRadius: '7px',
    border: '1px solid #e7e5e4',
    fontSize: '13px',
    fontWeight: 600,
    cursor: resetting ? 'not-allowed' : 'pointer',
    background: resetOpen ? '#f5f5f4' : '#fff',
    color: resetting ? '#a8a29e' : '#44403c',
    transition: 'background 0.15s',
  }

  const dirtyIndicatorStyle = {
    fontSize: '11px',
    color: dirty ? '#ea580c' : 'transparent',
    padding: '0 4px',
    minWidth: '90px',
    textAlign: 'center',
    userSelect: 'none',
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
        maxWidth: '920px',
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

        {/* Dirty indicator */}
        <span style={dirtyIndicatorStyle}>
          {dirty ? 'Unsaved changes' : ''}
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

        {/* Save Draft */}
        <button
          type="button"
          disabled={saveDraftDisabled}
          onClick={handleSaveDraft}
          style={saveDraftBtnStyle}
        >
          {saveDraftLabel}
        </button>

        {/* Reset dropdown */}
        <div ref={resetRef} style={{ position: 'relative' }}>
          <button
            type="button"
            disabled={resetting}
            onClick={() => setResetOpen((o) => !o)}
            style={resetBtnStyle}
            title="Reset to a previous version"
          >
            {resetting ? 'Loading…' : 'Reset ▾'}
          </button>

          {resetOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: '#fff',
              border: '1px solid #e7e5e4',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: '230px',
              overflow: 'hidden',
              zIndex: 10001,
            }}>
              <ResetItem
                label="Reset to last save"
                sub={lastSaveTime ? relativeTime(lastSaveTime) : 'Reload saved draft'}
                onClick={() => handleReset('last-save')}
              />
              {draftHistory.map((entry, i) => (
                <ResetItem
                  key={entry.time}
                  label={`Session save ${i + 1}`}
                  sub={relativeTime(entry.time)}
                  onClick={() => handleReset(`history-${i}`)}
                />
              ))}
              <div style={{ height: '1px', background: '#f0efee', margin: '2px 0' }} />
              <ResetItem
                label="Reset to original"
                sub="From GitHub — before any edits"
                onClick={() => handleReset('original')}
                danger
              />
            </div>
          )}
        </div>

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
            // onLoad fires AFTER the bridge has already sent preview-ready and
            // iframeReadyRef was set to true. Do NOT reset here — it would block
            // all subsequent sendContentToIframe calls.
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

function ResetItem({ label, sub, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? '#fef2f2' : '#f5f5f4' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      <div style={{ fontSize: '13px', fontWeight: 500, color: danger ? '#dc2626' : '#1c1917' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#a8a29e', marginTop: '1px' }}>{sub}</div>}
    </button>
  )
}
