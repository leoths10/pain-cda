import type { PlanDocsController } from '../../hooks/usePlanDocs'

interface Props {
  docs: PlanDocsController
}

/**
 * Panneau flottant de pilotage de la couche documentaire :
 * sélection / création / suppression d'un calque, bascule lecture↔édition,
 * choix de l'outil (sélection / annotation / flèche) et sauvegarde.
 */
export function DocToolbar({ docs }: Props) {
  const {
    list, currentDoc, openDoc, closeDoc, createDoc, deleteDoc,
    saveCurrent, saving, dirty, error,
    editMode, setEditMode, tool, setTool, arrowFrom,
  } = docs

  const handleSelect = (value: string) => {
    if (value === '') closeDoc()
    else openDoc(Number(value))
  }

  const handleNew = () => {
    const title = window.prompt('Nom du nouveau calque :', 'Nouveau calque')
    if (title && title.trim()) createDoc(title.trim())
  }

  const handleDelete = () => {
    if (currentDoc && window.confirm(`Supprimer le calque « ${currentDoc.title} » ?`)) {
      deleteDoc(currentDoc.id)
    }
  }

  const hint = !editMode
    ? null
    : tool === 'annotation'
      ? 'Cliquez sur le plan pour poser une annotation.'
      : tool === 'arrow'
        ? (arrowFrom ? 'Cliquez une application ou une annotation cible.' : 'Cliquez l\'annotation de départ.')
        : 'Glissez une annotation pour la déplacer, double-clic pour éditer le texte.'

  return (
    <div className="doc-toolbar">
      <div className="doc-toolbar__row">
        <span className="doc-toolbar__title">📑 Documentation</span>
        <select
          className="doc-toolbar__select"
          value={currentDoc?.id ?? ''}
          onChange={e => handleSelect(e.target.value)}
        >
          <option value="">— Aucun calque —</option>
          {list.map(d => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
        <button type="button" className="doc-toolbar__btn" onClick={handleNew}>➕ Nouveau</button>
      </div>

      {currentDoc && (
        <div className="doc-toolbar__row">
          <button
            type="button"
            className={`doc-toolbar__btn ${editMode ? 'doc-toolbar__btn--active' : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? '👁 Lecture' : '✏️ Éditer'}
          </button>

          {editMode && (
            <>
              <span className="doc-toolbar__sep" />
              <button
                type="button"
                className={`doc-toolbar__btn ${tool === 'select' ? 'doc-toolbar__btn--active' : ''}`}
                onClick={() => setTool('select')}
                title="Sélection / déplacement"
              >🖱</button>
              <button
                type="button"
                className={`doc-toolbar__btn ${tool === 'annotation' ? 'doc-toolbar__btn--active' : ''}`}
                onClick={() => setTool('annotation')}
                title="Ajouter une annotation"
              >📝</button>
              <button
                type="button"
                className={`doc-toolbar__btn ${tool === 'arrow' ? 'doc-toolbar__btn--active' : ''}`}
                onClick={() => setTool('arrow')}
                title="Tracer une flèche"
              >↗</button>
              <span className="doc-toolbar__sep" />
              <button
                type="button"
                className="doc-toolbar__btn doc-toolbar__btn--save"
                onClick={saveCurrent}
                disabled={saving || !dirty}
              >
                {saving ? '⏳' : '💾'} Enregistrer{dirty ? ' *' : ''}
              </button>
              <button
                type="button"
                className="doc-toolbar__btn doc-toolbar__btn--danger"
                onClick={handleDelete}
              >🗑</button>
            </>
          )}
        </div>
      )}

      {hint && <div className="doc-toolbar__hint">{hint}</div>}
      {error && <div className="doc-toolbar__error">{error}</div>}
    </div>
  )
}
