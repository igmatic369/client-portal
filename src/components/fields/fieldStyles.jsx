// Shared styles and helpers for all field components

export const fieldStyles = {
  wrapper: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#44403c',
    marginBottom: '6px',
  },
  required: {
    color: '#ef4444',
    marginLeft: '3px',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e7e5e4',
    borderRadius: '7px',
    fontSize: '14px',
    color: '#1c1917',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  inputFocused: {
    borderColor: '#ea580c',
    boxShadow: '0 0 0 3px rgba(234,88,12,0.08)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e7e5e4',
    borderRadius: '7px',
    fontSize: '14px',
    color: '#1c1917',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '18px',
    marginTop: '4px',
  },
  counter: {
    fontSize: '11px',
    color: '#a8a29e',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
  },
}

export function labelEl(field) {
  return (
    <label style={fieldStyles.label}>
      {field.label}
      {field.required && <span style={fieldStyles.required}>*</span>}
    </label>
  )
}

export function counterEl(str, maxLength) {
  if (!maxLength) return null
  return <span style={{ ...fieldStyles.counter, marginLeft: 'auto' }}>{str.length}/{maxLength}</span>
}

export function errorEl(msg) {
  return <span style={fieldStyles.errorText}>{msg}</span>
}
