import { useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'

export default function PhoneField({ field, value = '', onChange }) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <input
        type="tel"
        value={String(value ?? '')}
        placeholder={field.placeholder ?? '250-555-0100'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...s.input, ...(focused ? s.inputFocused : {}) }}
      />
    </div>
  )
}
