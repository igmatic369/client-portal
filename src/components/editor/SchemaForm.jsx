import { useState } from 'react'
import TabPanel from './TabPanel'

export default function SchemaForm({ schema, content, onChange, siteSlug }) {
  const tabs = schema?.tabs ?? []
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '')

  if (tabs.length === 0) {
    return <p style={{ color: '#78716c', fontSize: '14px' }}>No schema defined for this site.</p>
  }

  const activeTabDef = tabs.find((t) => t.key === activeTab) ?? tabs[0]

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '2px',
        borderBottom: '1.5px solid #e7e5e4',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '9px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid #ea580c' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ea580c' : '#78716c',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
                marginBottom: '-1.5px',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Active tab fields */}
      <TabPanel
        tab={activeTabDef}
        tabData={content[activeTabDef.key]}
        onChange={(newTabData) => onChange({ ...content, [activeTabDef.key]: newTabData })}
        siteSlug={siteSlug}
      />
    </div>
  )
}
