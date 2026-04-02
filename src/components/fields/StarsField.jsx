import { useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'

export default function StarsField({ field, value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const current = Number(value) || 0
  const display = hovered || current

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <div style={{ display: 'flex', gap: '4px', paddingTop: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: star <= display ? '#f59e0b' : '#d4d0cc',
              padding: '0',
              lineHeight: 1,
              transition: 'color 0.1s',
            }}
          >
            ★
          </button>
        ))}
        {current > 0 && (
          <span style={{ fontSize: '13px', color: '#78716c', alignSelf: 'center', marginLeft: '4px' }}>
            {current}/5
          </span>
        )}
      </div>
    </div>
  )
}
