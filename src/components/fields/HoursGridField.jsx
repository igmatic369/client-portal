import { fieldStyles as s, labelEl } from './fieldStyles'

const DAYS = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
]

const timeInput = {
  padding: '7px 8px',
  border: '1.5px solid #e7e5e4',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#1c1917',
  background: '#fff',
  outline: 'none',
  width: '90px',
}

export default function HoursGridField({ field, value, onChange }) {
  const hours = value ?? {}

  const update = (dayKey, prop, val) => {
    const current = hours[dayKey] ?? { open: '9:00', close: '17:00', closed: false }
    onChange({ ...hours, [dayKey]: { ...current, [prop]: val } })
  }

  return (
    <div style={s.wrapper}>
      {labelEl(field)}
      <div style={{
        border: '1.5px solid #e7e5e4',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr 1fr 80px',
          gap: '8px',
          padding: '8px 12px',
          background: '#f9f8f7',
          borderBottom: '1px solid #e7e5e4',
          fontSize: '11px',
          fontWeight: 600,
          color: '#78716c',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          <span>Day</span>
          <span>Opens</span>
          <span>Closes</span>
          <span style={{ textAlign: 'center' }}>Closed</span>
        </div>

        {DAYS.map((day, i) => {
          const row = hours[day.key] ?? { open: '9:00', close: '17:00', closed: false }
          return (
            <div
              key={day.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 1fr 80px',
                gap: '8px',
                padding: '8px 12px',
                alignItems: 'center',
                borderBottom: i < DAYS.length - 1 ? '1px solid #f5f5f4' : 'none',
                background: row.closed ? '#fafafa' : '#fff',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#44403c' }}>{day.label}</span>
              <input
                type="text"
                value={row.open}
                disabled={row.closed}
                onChange={(e) => update(day.key, 'open', e.target.value)}
                placeholder="9:00 AM"
                style={{ ...timeInput, opacity: row.closed ? 0.4 : 1 }}
              />
              <input
                type="text"
                value={row.close}
                disabled={row.closed}
                onChange={(e) => update(day.key, 'close', e.target.value)}
                placeholder="5:00 PM"
                style={{ ...timeInput, opacity: row.closed ? 0.4 : 1 }}
              />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.closed}
                  onClick={() => update(day.key, 'closed', !row.closed)}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: row.closed ? '#ea580c' : '#d4d0cc',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: row.closed ? '18px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
