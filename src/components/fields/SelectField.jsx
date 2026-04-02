import { useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'

export default function SelectField({ field, value = '', onChange }) {
  const [focused, setFocused] = useState(false)
  const options = field.options ?? []

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...s.input,
          ...(focused ? s.inputFocused : {}),
          cursor: 'pointer',
        }}
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  )
}
