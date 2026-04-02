import { useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'

export default function CurrencyField({ field, value, onChange }) {
  const [focused, setFocused] = useState(false)
  // Store display string locally so user can type freely; commit number on blur
  const [display, setDisplay] = useState(value != null ? String(value) : '')

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setDisplay(raw)
    const num = parseFloat(raw)
    onChange(isNaN(num) ? null : num)
  }

  // Sync if value changes from outside (e.g. initial load)
  const displayValue = focused ? display : (value != null ? String(value) : '')

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{
          position: 'absolute',
          left: '12px',
          fontSize: '14px',
          color: '#78716c',
          pointerEvents: 'none',
        }}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder="0"
          onChange={handleChange}
          onFocus={() => { setFocused(true); setDisplay(value != null ? String(value) : '') }}
          onBlur={() => setFocused(false)}
          style={{
            ...s.input,
            paddingLeft: '26px',
            ...(focused ? s.inputFocused : {}),
          }}
        />
      </div>
    </div>
  )
}
