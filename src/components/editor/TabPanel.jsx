import FieldRenderer from './FieldRenderer'

// Self-keyed tab: exactly one field whose key matches the tab key.
// In this case content[tab.key] IS the field's value (e.g. a top-level array),
// not an object containing a same-named property.
function isSelfKeyed(tab) {
  return tab.fields?.length === 1 && tab.fields[0].key === tab.key
}

export default function TabPanel({ tab, tabData, onChange, siteSlug }) {
  if (isSelfKeyed(tab)) {
    const field = tab.fields[0]
    return (
      <div>
        <FieldRenderer
          field={field}
          value={tabData}
          onChange={onChange}
          siteSlug={siteSlug}
        />
      </div>
    )
  }

  const data = tabData ?? {}

  return (
    <div>
      {(tab.fields ?? []).map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={data[field.key]}
          onChange={(val) => onChange({ ...data, [field.key]: val })}
          siteSlug={siteSlug}
        />
      ))}
    </div>
  )
}
