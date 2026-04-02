import { useState } from 'react'
import { fieldStyles as s, labelEl, errorEl } from './fieldStyles'

export default function TextareaField({ field, value = '', onChange }) {
  const [focused, setFocused] = useState(false)
  const str = String(value ?? '')
  const isRequired = field.required && str.trim() === ''

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <textarea
        value={str}
        rows={field.rows ?? 3}
        maxLength={field.maxLength}
        placeholder={field.placeholder ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...s.textarea,
          ...(focused ? s.inputFocused : {}),
          ...(isRequired ? s.inputError : {}),
        }}
      />
      <div style={s.row}>
        {isRequired && errorEl('This field is required')}
        {field.maxLength && <span style={{ ...s.counter, marginLeft: 'auto' }}>{str.length}/{field.maxLength}</span>}
      </div>
    </div>
  )
}
