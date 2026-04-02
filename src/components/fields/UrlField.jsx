import { useState } from 'react'
import { fieldStyles as s, labelEl, errorEl } from './fieldStyles'

function isValidUrl(v) {
  try { new URL(v); return true } catch { return false }
}

export default function UrlField({ field, value = '', onChange }) {
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const str = String(value ?? '')
  const invalid = touched && str.length > 0 && !isValidUrl(str)

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <input
        type="url"
        value={str}
        placeholder={field.placeholder ?? 'https://'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setTouched(true) }}
        style={{
          ...s.input,
          ...(focused ? s.inputFocused : {}),
          ...(invalid ? s.inputError : {}),
        }}
      />
      {invalid && <div style={s.row}>{errorEl('Enter a valid URL (include https://)')}</div>}
    </div>
  )
}
