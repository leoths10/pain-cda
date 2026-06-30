import type { VtomResource } from '../../types/vtom'
import { parseParameter } from '../../utils/vtomHelpers'

interface Props {
  param: string
  resources: Map<string, VtomResource>
  style?: React.CSSProperties
}

/**
 * Affiche un paramètre VTOM en résolvant ses références `{NOM_RESSOURCE}`
 * (chaque référence est affichée avec sa valeur et son type).
 */
export function ParameterDisplay({ param, resources, style }: Props) {
  const { resourceRefs } = parseParameter(param, resources)

  const baseStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: '#f3f4f6',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '8px',
    wordBreak: 'break-all',
    border: '1px solid #e5e7eb',
    ...style,
  }

  return (
    <div style={baseStyle}>
      <div style={{ marginBottom: resourceRefs.length ? '6px' : 0, color: '#374151' }}>{param}</div>
      {resourceRefs.map((ref, i) => (
        <div
          key={i}
          style={{
            marginTop: '4px', paddingTop: '6px',
            borderTop: '1px solid #d1d5db', fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 600, color: '#667eea',
              backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '4px',
            }}>
              📁 {ref.name}
            </span>
            <span style={{ color: '#6b7280' }}>→</span>
            <span style={{
              color: '#059669', fontWeight: 500,
              backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '4px',
            }}>
              {ref.value}
            </span>
            <span style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>
              (type: {ref.type})
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
