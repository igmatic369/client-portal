import { useRef, useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'
import { uploadImage, deleteImage } from '../../utils/imageUpload'

export default function ImageSingleField({ field, value = '', onChange, siteSlug }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)
  const fileInputRef = useRef(null)

  const str = String(value ?? '')

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    setUploading(true)
    try {
      const url = await uploadImage(siteSlug, file)
      // Attempt to remove old image from storage (silently skips non-Supabase URLs)
      if (str) {
        try { await deleteImage(str) } catch { /* ignore */ }
      }
      setImgFailed(false)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (str) {
      try { await deleteImage(str) } catch { /* ignore */ }
    }
    setImgFailed(false)
    onChange('')
  }

  return (
    <div style={s.wrapper}>
      {labelEl(field)}

      {/* Preview area */}
      {str && (
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          {imgFailed ? (
            <div style={{
              width: '100%',
              height: '80px',
              background: '#fafaf9',
              border: '1.5px solid #e7e5e4',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#a8a29e',
              wordBreak: 'break-all',
              padding: '8px',
              boxSizing: 'border-box',
            }}>
              {str.length > 60 ? str.slice(0, 60) + '…' : str}
            </div>
          ) : (
            <img
              src={str}
              alt="preview"
              onError={() => setImgFailed(true)}
              style={{
                display: 'block',
                width: '100%',
                maxHeight: '160px',
                objectFit: 'cover',
                borderRadius: '7px',
                border: '1.5px solid #e7e5e4',
              }}
            />
          )}
          {/* Uploading overlay */}
          {uploading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.78)',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 500,
              color: '#44403c',
            }}>
              Uploading…
            </div>
          )}
        </div>
      )}

      {/* Uploading state when no existing image */}
      {!str && uploading && (
        <div style={{
          width: '100%',
          height: '80px',
          background: '#fafaf9',
          border: '1.5px solid #e7e5e4',
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 500,
          color: '#44403c',
          marginBottom: '10px',
        }}>
          Uploading…
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '7px 14px',
            border: '1.5px solid #e7e5e4',
            borderRadius: '7px',
            background: '#fff',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: uploading ? '#a8a29e' : '#44403c',
          }}
        >
          {str ? 'Change Image' : 'Upload Image'}
        </button>
        {str && (
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemove}
            style={{
              padding: '7px 14px',
              border: '1.5px solid #fecaca',
              borderRadius: '7px',
              background: '#fff',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              color: uploading ? '#a8a29e' : '#ef4444',
            }}
          >
            Remove
          </button>
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
