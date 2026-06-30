import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { SelectedJob } from '../../../types/vtom'
import { highlightBashWithLines } from '../../../utils/bashHighlighter'

interface Props {
  selectedJob: SelectedJob | null
  scriptContent: string | null
  scriptLoading: boolean
  scriptError: string | null
  isDark: boolean
  onClose: () => void
}

/** Copie du texte dans le presse-papiers avec fallback pour contextes non-HTTPS. */
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

export function ScriptModal({
  selectedJob, scriptContent, scriptLoading, scriptError, isDark, onClose,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!scriptContent) return
    await copyToClipboard(scriptContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <div className="vtom-modal-overlay" onClick={onClose} style={{ zIndex: 1002 }}>
      <div className="vtom-modal script-modal" onClick={e => e.stopPropagation()}>
        <button className="vtom-modal__close" onClick={onClose}>✕</button>

        <div className="vtom-modal__header">
          <h3>📄 Contenu du script</h3>
          {selectedJob?.job.script && (
            <span className="script-modal__path">{selectedJob.job.script}</span>
          )}
        </div>

        <div className="vtom-modal__body script-modal__body">
          {scriptLoading && (
            <div className="script-modal__loading">
              <div className="script-modal__loading-icon">⏳</div>
              Récupération du script en cours...
            </div>
          )}

          {scriptError && !scriptLoading && (
            <div className={`script-modal__error ${isDark ? 'script-modal__error--dark' : ''}`}>
              <span>⚠️</span>
              <div>
                <strong>Erreur lors de la récupération :</strong><br />
                {scriptError}
              </div>
            </div>
          )}

          {scriptContent !== null && !scriptLoading && (
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
                {highlightBashWithLines(scriptContent)}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
