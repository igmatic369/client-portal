import { useState } from 'react'
import { fieldStyles as s, labelEl } from './fieldStyles'

function chevron(dir) {
  return dir === 'up' ? '▲' : '▼'
}

export default function ListField({ field, value, onChange, FieldRenderer }) {
  const items = Array.isArray(value) ? value : []
  const [collapsed, setCollapsed] = useState({})

  const toggle = (i) => setCollapsed((c) => ({ ...c, [i]: !c[i] }))

  const addItem = () => {
    const blank = {}
    ;(field.item_fields ?? []).forEach((f) => { blank[f.key] = f.type === 'list' ? [] : '' })
    onChange([...items, blank])
  }

  const removeItem = (i) => {
    const next = items.filter((_, idx) => idx !== i)
    onChange(next)
    setCollapsed((c) => {
      const copy = { ...c }
      delete copy[i]
      return copy
    })
  }

  const moveItem = (i, dir) => {
    const next = [...items]
    const target = i + dir
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]
    onChange(next)
  }

  const updateItem = (i, itemValue) => {
    const next = [...items]
    next[i] = itemValue
    onChange(next)
  }

  const getTitle = (item, idx) => {
    const firstTextField = (field.item_fields ?? []).find(
      (f) => f.type === 'text' || f.type === 'textarea' || !f.type
    )
    const val = firstTextField ? item[firstTextField.key] : null
    return val ? String(val) : `Item ${idx + 1}`
  }

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, i) => {
          const isCollapsed = collapsed[i] ?? true
          const title = getTitle(item, i)
          return (
            <div
              key={i}
              style={{
                border: '1.5px solid #e7e5e4',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Item header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                background: '#f9f8f7',
                borderBottom: isCollapsed ? 'none' : '1px solid #e7e5e4',
                cursor: 'pointer',
                userSelect: 'none',
              }}>
                {/* Collapse toggle */}
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#78716c',
                    padding: '0 4px',
                    lineHeight: 1,
                  }}
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? '▶' : '▼'}
                </button>

                {/* Title */}
                <span
                  style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#1c1917' }}
                  onClick={() => toggle(i)}
                >
                  {title}
                </span>

                {/* Reorder */}
                <button
                  type="button"
                  onClick={() => moveItem(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: i === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '10px',
                    color: i === 0 ? '#d4d0cc' : '#78716c',
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  {chevron('up')}
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, 1)}
                  disabled={i === items.length - 1}
                  title="Move down"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: i === items.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '10px',
                    color: i === items.length - 1 ? '#d4d0cc' : '#78716c',
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  {chevron('down')}
                </button>

                {/* Remove */}
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
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Item body */}
              {!isCollapsed && (
                <div style={{ padding: '12px' }}>
                  {(field.item_fields ?? []).map((subField) => (
                    <FieldRenderer
                      key={subField.key}
                      field={subField}
                      value={item[subField.key]}
                      onChange={(val) => updateItem(i, { ...item, [subField.key]: val })}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Add button */}
        <button
          type="button"
          onClick={addItem}
          style={{
            padding: '8px 14px',
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
