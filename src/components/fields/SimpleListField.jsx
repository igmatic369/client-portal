import { fieldStyles as s, labelEl } from './fieldStyles'

function chevron(dir) {
  return dir === 'up' ? '▲' : '▼'
}

export default function SimpleListField({ field, value, onChange }) {
  const items = Array.isArray(value) ? value : []

  const addItem = () => onChange([...items, ''])

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  const moveItem = (i, dir) => {
    const next = [...items]
    const target = i + dir
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]
    onChange(next)
  }

  const updateItem = (i, val) => {
    const next = [...items]
    next[i] = val
    onChange(next)
  }

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              style={{ ...s.input, marginBottom: 0, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => moveItem(i, -1)}
              disabled={i === 0}
              title="Move up"
              style={reorderBtn(i === 0)}
            >
              {chevron('up')}
            </button>
            <button
              type="button"
              onClick={() => moveItem(i, 1)}
              disabled={i === items.length - 1}
              title="Move down"
              style={reorderBtn(i === items.length - 1)}
            >
              {chevron('down')}
            </button>
            <button
              type="button"
              onClick={() => removeItem(i)}
              title="Remove"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ef4444',
                padding: '0 4px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          style={{
            padding: '7px 14px',
            border: '1.5px dashed #d4d0cc',
            borderRadius: '7px',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#78716c',
            textAlign: 'center',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ea580c'
            e.currentTarget.style.color = '#ea580c'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d4d0cc'
            e.currentTarget.style.color = '#78716c'
          }}
        >
          + Add {field.item_label ?? 'Item'}
        </button>
      </div>
    </div>
  )
}

function reorderBtn(disabled) {
  return {
    background: 'none',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '10px',
    color: disabled ? '#d4d0cc' : '#78716c',
    padding: '2px 4px',
    lineHeight: 1,
    flexShrink: 0,
  }
}
