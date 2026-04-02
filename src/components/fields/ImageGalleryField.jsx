import { useRef, useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'
import { uploadImage, deleteImage } from '../../utils/imageUpload'

const MAX_IMAGES = 50

// Detect format and normalise to [{src, alt}] for internal use.
// Returns { items, isStringArray } so we can convert back correctly on onChange.
function normalize(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return { items: [], isStringArray: false }
  }
  if (typeof value[0] === 'string') {
    return { items: value.map((src) => ({ src, alt: '' })), isStringArray: true }
  }
  return {
    items: value.map((v) => ({ src: v?.src ?? '', alt: v?.alt ?? '' })),
    isStringArray: false,
  }
}

function denormalize(items, isStringArray) {
  return isStringArray ? items.map((i) => i.src) : items
}

export default function ImageGalleryField({ field, value, onChange, siteSlug }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const { items, isStringArray } = normalize(value)
  const atMax = items.length >= MAX_IMAGES

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be picked again
    setError(null)
    setUploading(true)
    try {
      const url = await uploadImage(siteSlug, file)
      const newItems = [...items, { src: url, alt: '' }]
      onChange(denormalize(newItems, isStringArray))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (i) => {
    const { src } = items[i]
    const newItems = items.filter((_, idx) => idx !== i)
    onChange(denormalize(newItems, isStringArray))
    try { await deleteImage(src) } catch { /* silently skip non-Supabase URLs */ }
  }

  const handleMove = (i, dir) => {
    const newItems = [...items]
    const target = i + dir
    if (target < 0 || target >= newItems.length) return
    ;[newItems[i], newItems[target]] = [newItems[target], newItems[i]]
    onChange(denormalize(newItems, isStringArray))
  }

  const handleAltChange = (i, alt) => {
    const newItems = items.map((item, idx) => idx === i ? { ...item, alt } : item)
    onChange(denormalize(newItems, isStringArray))
  }

  return (
    <div style={s.wrapper}>
      {/* Label row with image count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        {labelEl(field)}
        <span style={{ fontSize: '11px', color: '#a8a29e' }}>
          {items.length} / {MAX_IMAGES}
        </span>
      </div>

      {/* Thumbnail grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '8px',
      }}>
        {/* Image tiles */}
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Tile */}
            <div style={{
              position: 'relative',
              border: '1.5px solid #e7e5e4',
              borderRadius: '7px',
              overflow: 'hidden',
              background: '#fafaf9',
            }}>
              <img
                src={item.src}
                alt={item.alt || `Image ${i + 1}`}
                onError={(e) => { e.currentTarget.style.opacity = '0.25' }}
                style={{ display: 'block', width: '100%', height: '100px', objectFit: 'cover' }}
              />
              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                title="Remove"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Reorder arrows */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
              <button
                type="button"
                onClick={() => handleMove(i, -1)}
                disabled={i === 0}
                title="Move left"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: i === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  color: i === 0 ? '#d4d0cc' : '#78716c',
                  padding: '2px 6px',
                  lineHeight: 1,
                }}
              >←</button>
              <button
                type="button"
                onClick={() => handleMove(i, 1)}
                disabled={i === items.length - 1}
                title="Move right"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: i === items.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  color: i === items.length - 1 ? '#d4d0cc' : '#78716c',
                  padding: '2px 6px',
                  lineHeight: 1,
                }}
              >→</button>
            </div>

            {/* Alt text input — only for object-array format */}
            {!isStringArray && (
              <input
                type="text"
                value={item.alt}
                placeholder="Alt text…"
                onChange={(e) => handleAltChange(i, e.target.value)}
                style={{
                  ...s.input,
                  fontSize: '11px',
                  padding: '5px 8px',
                }}
              />
            )}
          </div>
        ))}

        {/* Add Photo tile */}
        {!atMax && (
          <div>
            <button
              type="button"
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload image"
              style={{
                width: '100%',
                height: '100px',
                border: '1.5px dashed #d4d0cc',
                borderRadius: '7px',
                background: '#fff',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: uploading ? '#a8a29e' : '#78716c',
                fontSize: '12px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.borderColor = '#ea580c'
                  e.currentTarget.style.color = '#ea580c'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d4d0cc'
                e.currentTarget.style.color = uploading ? '#a8a29e' : '#78716c'
              }}
            >
              {uploading ? (
                <>
                  <span style={{ fontSize: '18px' }}>⏳</span>
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '22px', lineHeight: 1, fontWeight: 300 }}>+</span>
                  <span>Add Photo</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      {/* Upload error */}
      {error && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
