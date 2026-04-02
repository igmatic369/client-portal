import { useState } from 'react'
import { fieldStyles as s, labelEl, counterEl, errorEl } from './fieldStyles'

export default function TextField({ field, value = '', onChange }) {
  const [focused, setFocused] = useState(false)
  const str = String(value ?? '')
  const isRequired = field.required && str.trim() === ''

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <input
        type="text"
        value={str}
        maxLength={field.maxLength}
        placeholder={field.placeholder ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...s.input,
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
