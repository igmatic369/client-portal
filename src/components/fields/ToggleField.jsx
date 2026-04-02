import { fieldStyles as s, labelEl } from './fieldStyles'

export default function ToggleField({ field, value, onChange }) {
  const checked = Boolean(value)

  return (
    <div style={{ ...s.wrapper, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {labelEl(field)}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          background: checked ? '#ea580c' : '#d4d0cc',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}
