import { ReactNode, useMemo, useState } from 'react'
import GhostButton from './GhostButton'
import developerDocumentation from '../data/documentation_developpeur.json'
import userDocumentation from '../data/documentation_utilisateur.json'

type DocType = 'user' | 'developer'

interface DocumentationFile {
  title: string
  content: string
}

interface ParsedSection {
  title: string
  paragraphs: string[]
}

interface ParsedDocumentation {
  intro: string[]
  sections: ParsedSection[]
}

const DOC_MAP: Record<DocType, DocumentationFile> = {
  user: userDocumentation,
  developer: developerDocumentation,
}

/**
 * Parse le contenu brut d'une documentation pour extraire l'introduction
 * et les sections numérotées ("1. Titre\n..." sont détectées par regex).
 */
function parseDocumentationContent(doc: DocumentationFile): ParsedDocumentation {
  const sanitized = doc.content.replace(/\r/g, '').trim()
  if (!sanitized) return { intro: [], sections: [] }

  // Retire la première ligne si elle correspond au titre (doublon)
  const lines = sanitized.split('\n')
  const body = lines[0]?.trim().toLowerCase() === doc.title.trim().toLowerCase()
    ? lines.slice(1).join('\n').trim()
    : sanitized

  const sections: ParsedSection[] = []
  const regex = /(\d+\.\s+[^\n]+)\n([\s\S]*?)(?=(?:\n\d+\.\s+[^\n]+\n)|$)/g
  let match: RegExpExecArray | null
  let firstMatchIndex: number | null = null

  while ((match = regex.exec(body)) !== null) {
    if (firstMatchIndex === null) firstMatchIndex = match.index
    sections.push({
      title: match[1].trim(),
      paragraphs: match[2].trim().split('\n').map(p => p.trim()).filter(Boolean),
    })
  }

  const introText = firstMatchIndex !== null ? body.slice(0, firstMatchIndex).trim() : body
  const intro = introText.split('\n').map(p => p.trim()).filter(Boolean)

  return { intro, sections }
}

/** Rend une liste de paragraphes en détectant listes à puces et sous-sections numérotées (1.1, 1.2…). */
function renderParagraphBlocks(paragraphs: string[], keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let currentList: string[] = []
  let listCount = 0

  const flushList = () => {
    if (currentList.length === 0) return
    nodes.push(
      <ul key={`${keyPrefix}-list-${listCount}`} className="documentation-modal__list">
        {currentList.map((item, i) => (
          <li key={`${keyPrefix}-list-${listCount}-${i}`}>{item}</li>
        ))}
      </ul>,
    )
    currentList = []
    listCount += 1
  }

  paragraphs.forEach((text, i) => {
    if (text.startsWith('- ')) {
      currentList.push(text.slice(2).trim())
      return
    }
    flushList()

    if (/^\d+(?:\.\d+)+\s+/.test(text)) {
      nodes.push(
        <p key={`${keyPrefix}-subheading-${i}`} className="documentation-modal__subheading">
          <strong>{text}</strong>
        </p>,
      )
      return
    }

    nodes.push(
      <p key={`${keyPrefix}-paragraph-${i}`} className="documentation-modal__paragraph">
        {text}
      </p>,
    )
  })

  flushList()
  return nodes
}

function Documentation() {
  const [openDoc, setOpenDoc] = useState<DocType | null>(null)
  const activeDoc = openDoc ? DOC_MAP[openDoc] : null
  const parsedDoc = useMemo(
    () => (activeDoc ? parseDocumentationContent(activeDoc) : null),
    [activeDoc],
  )

  return (
    <>
      <section className="documentation-intro">
        <div>
          <p className="documentation-intro__eyebrow">Centre de ressources</p>
          <h2>Documentation utilisateur & développeur</h2>
          <p>
            Choisissez le guide adapté à votre profil : les utilisateurs y trouvent les parcours
            essentiels tandis que les développeurs accèdent à la vision technique et aux bonnes
            pratiques du projet.
          </p>
        </div>
        <div className="documentation-buttons">
          <GhostButton
            label="Documentation utilisateur"
            ariaLabel="Consulter la documentation utilisateur"
            icon="🧭"
            variant="primary"
            onClick={() => setOpenDoc('user')}
          />
          <GhostButton
            label="Documentation développeur"
            ariaLabel="Consulter la documentation développeur"
            icon="💻"
            variant="outline"
            onClick={() => setOpenDoc('developer')}
          />
        </div>
      </section>

      {activeDoc && parsedDoc && (
        <div
          className="documentation-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-label={activeDoc.title}
          onClick={() => setOpenDoc(null)}
        >
          <div className="documentation-modal" onClick={e => e.stopPropagation()}>
            <div className="documentation-modal__header">
              <div>
                <p className="documentation-modal__eyebrow">Vue détaillée</p>
                <h3>{activeDoc.title}</h3>
                <p>Contenu issu du référentiel JSON sélectionné.</p>
              </div>
              <button
                type="button"
                className="documentation-modal__close"
                aria-label="Fermer"
                onClick={() => setOpenDoc(null)}
              >
                ×
              </button>
            </div>
            <div className="documentation-modal__body">
              <article className="documentation-modal__content">
                {parsedDoc.intro.length > 0 && (
                  <div className="documentation-modal__intro">
                    {renderParagraphBlocks(parsedDoc.intro, `${activeDoc.title}-intro`)}
                  </div>
                )}
                {parsedDoc.sections.map(section => (
                  <section className="documentation-modal__section" key={section.title}>
                    <h4><strong>{section.title}</strong></h4>
                    {renderParagraphBlocks(section.paragraphs, section.title)}
                  </section>
                ))}
              </article>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Documentation
