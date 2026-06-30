import { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  paramName: string | null
  xmlContent: string | null
  xmlLoading: boolean
  xmlError: string | null
  isDark: boolean
  onClose: () => void
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

function highlightXml(xml: string): React.ReactNode[] {
  // Tokenizer XML minimal : balises, attributs, valeurs, commentaires, texte
  const result: React.ReactNode[] = []
  let remaining = xml
  let key = 0

  while (remaining.length > 0) {
    // Commentaire XML
    const comment = remaining.match(/^<!--[\s\S]*?-->/)
    if (comment) {
      result.push(<span key={key++} style={{ color: '#6a9955' }}>{comment[0]}</span>)
      remaining = remaining.slice(comment[0].length)
      continue
    }
    // Prologue / instruction de traitement
    const pi = remaining.match(/^<\?[\s\S]*?\?>/)
    if (pi) {
      result.push(<span key={key++} style={{ color: '#c586c0' }}>{pi[0]}</span>)
      remaining = remaining.slice(pi[0].length)
      continue
    }
    // Balise ouvrante/fermante avec attributs
    const tag = remaining.match(/^<\/?[^>]*>/)
    if (tag) {
      const full = tag[0]
      // Découpe : < nom attributs >
      const inner = full.slice(1, full.endsWith('/>') ? -2 : full.endsWith('>') ? -1 : full.length)
      const tagParts: React.ReactNode[] = []
      let rest = inner
      let k = 0
      // Nom de la balise
      const nameMatch = rest.match(/^\/?\s*[A-Za-z_][\w.-]*/)
      if (nameMatch) {
        tagParts.push(<span key={k++} style={{ color: '#4ec9b0' }}>{nameMatch[0]}</span>)
        rest = rest.slice(nameMatch[0].length)
      }
      // Attributs : nom="valeur"
      while (rest.length > 0) {
        const attr = rest.match(/^\s+([A-Za-z_][\w.-]*)(\s*=\s*(?:"[^"]*"|'[^']*'|\S+))?/)
        if (attr) {
          tagParts.push(<span key={k++} style={{ color: '#9cdcfe' }}>{attr[1]}</span>)
          if (attr[2]) {
            const eqVal = attr[2]
            const eqIdx = eqVal.indexOf('=')
            tagParts.push(<span key={k++} style={{ color: '#d4d4d4' }}>{eqVal.slice(0, eqIdx + 1)}</span>)
            tagParts.push(<span key={k++} style={{ color: '#ce9178' }}>{eqVal.slice(eqIdx + 1)}</span>)
          }
          const leading = attr[0].slice(0, attr[0].indexOf(attr[1]))
          rest = rest.slice(attr[0].length)
          if (leading) tagParts.unshift(<span key={k++ + 'sp'}>{leading}</span>)
          continue
        }
        tagParts.push(<span key={k++} style={{ color: '#d4d4d4' }}>{rest}</span>)
        rest = ''
      }
      result.push(
        <span key={key++} style={{ color: '#d4d4d4' }}>
          {'<'}
          {tagParts}
          {full.endsWith('/>') ? '/>' : '>'}
        </span>
      )
      remaining = remaining.slice(full.length)
      continue
    }
    // Texte brut jusqu'à la prochaine balise
    const text = remaining.match(/^[^<]+/)
    if (text) {
      result.push(<span key={key++} style={{ color: '#d4d4d4' }}>{text[0]}</span>)
      remaining = remaining.slice(text[0].length)
      continue
    }
    // Caractère non reconnu
    result.push(<span key={key++}>{remaining[0]}</span>)
    remaining = remaining.slice(1)
  }
  return result
}

export function MigradoXmlModal({
  paramName, xmlContent, xmlLoading, xmlError, isDark, onClose,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!xmlContent) return
    await copyToClipboard(xmlContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <div className="vtom-modal-overlay" onClick={onClose} style={{ zIndex: 1002 }}>
      <div className="vtom-modal script-modal" onClick={e => e.stopPropagation()}>
        <button className="vtom-modal__close" onClick={onClose}>✕</button>

        <div className="vtom-modal__header">
          <h3>📂 Fichier XML Migrado</h3>
          {paramName && (
            <span className="script-modal__path">/nfs/pay01/migrado/SLR/migrado-{paramName}.xml</span>
          )}
        </div>

        <div className="vtom-modal__body script-modal__body">
          {xmlLoading && (
            <div className="script-modal__loading">
              <div className="script-modal__loading-icon">⏳</div>
              Récupération du fichier XML en cours...
            </div>
          )}

          {xmlError && !xmlLoading && (
            <div className={`script-modal__error ${isDark ? 'script-modal__error--dark' : ''}`}>
              <span>⚠️</span>
              <div>
                <strong>Erreur lors de la récupération :</strong><br />
                {xmlError}
              </div>
            </div>
          )}

          {xmlContent !== null && !xmlLoading && (
            <>
              <div className="script-modal__toolbar">
                <button
                  type="button"
                  className={`script-modal__copy-btn ${copied ? 'script-modal__copy-btn--copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✅ Copié !' : '📋 Copier'}
                </button>
              </div>
              <pre className="script-modal__code">
                {highlightXml(xmlContent)}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
