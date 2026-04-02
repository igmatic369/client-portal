import { useState } from 'react'
import { fieldStyles as s, labelEl, errorEl } from './fieldStyles'

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function EmailField({ field, value = '', onChange }) {
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const str = String(value ?? '')
  const invalid = touched && str.length > 0 && !isValidEmail(str)

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <input
        type="email"
        value={str}
        placeholder={field.placeholder ?? 'you@example.com'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setTouched(true) }}
        style={{
          ...s.input,
          ...(focused ? s.inputFocused : {}),
          ...(invalid ? s.inputError : {}),
        }}
      />
      {invalid && <div style={s.row}>{errorEl('Enter a valid email address')}</div>}
    </div>
  )
}
