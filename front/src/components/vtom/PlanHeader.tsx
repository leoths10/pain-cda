import GhostButton from '../GhostButton'

interface Props {
  scale: number
  lastUpdate: string | null
  paysageVersion?: string | null
  isFullscreen: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomChange: (newScale: number) => void
  onZoomReset: () => void
  onRefresh: () => void
  onToggleFullscreen: () => void
  onOpenAppSearch: () => void
  onOpenJobSearch: () => void
  onOpenChaineBatch: () => void
  onExportPdf: () => void
  chaineBatchLoading?: boolean
  chaineBatchCount?: number
}

/** En-tête du plan : stats globales, recherche, contrôles de zoom et de vue. */
export function PlanHeader({
  scale, lastUpdate, paysageVersion, isFullscreen,
  onZoomIn, onZoomOut, onZoomChange, onZoomReset,
  onRefresh, onToggleFullscreen,
  onOpenAppSearch, onOpenJobSearch, onOpenChaineBatch, onExportPdf,
  chaineBatchLoading, chaineBatchCount,
}: Props) {
  return (
    <header className="vtom-plan-header">
      <div className="vtom-plan-header__intro">
        <p className="vtom-plan__eyebrow">
          <span className="vtom-plan__eyebrow-dot" aria-hidden="true" />
          Plan Ordonnanceur
          {lastUpdate && (
            <span className="vtom-plan__last-update">
              · Mise à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}
            </span>
          )}
        </p>
        <h2 className="vtom-plan-header__title">
          Plan <span className="vtom-plan-header__title-accent">vTom</span>
        </h2>
        {paysageVersion && (
          <p className="vtom-plan-header__paysage-version">
            Version de Paysage : <strong>{paysageVersion}</strong>
          </p>
        )}
        <p className="vtom-plan-header__subtitle">
          Cliquez sur une application pour explorer ses traitements.
        </p>

      </div>

      <div className="vtom-plan-controls">
        <div className="vtom-toolbar vtom-toolbar--search">
          <GhostButton
            label="🔎 Applications"
            ariaLabel="Ouvrir la recherche d'application"
            variant="outline"
            onClick={onOpenAppSearch}
          />
          <GhostButton
            label="🔍 Traitements"
            ariaLabel="Ouvrir la recherche de traitements"
            variant="outline"
            onClick={onOpenJobSearch}
          />
          <button
            type="button"
            className="ghost-btn ghost-btn--outline chaine-batch-header-btn"
            onClick={onOpenChaineBatch}
            aria-label="Ouvrir la liste des traitements CHAINE_BATCH"
          >
            🔗 CHAINE_BATCH
            {chaineBatchLoading && (
              <span className="chaine-batch-header-btn__badge chaine-batch-header-btn__badge--loading">…</span>
            )}
            {!chaineBatchLoading && !!chaineBatchCount && chaineBatchCount > 0 && (
              <span className="chaine-batch-header-btn__badge">{chaineBatchCount}</span>
            )}
          </button>
        </div>

        <div className="vtom-toolbar vtom-toolbar--zoom zoom-controls">
          <button className="zoom-btn" onClick={onZoomOut} aria-label="Zoom arrière" title="Zoom arrière (−)">−</button>
          <div className="zoom-slider-wrap">
            <input
              type="range"
              className="zoom-slider"
              min={30} max={200} step={5}
              value={Math.round(scale * 100)}
              onChange={e => onZoomChange(parseInt(e.target.value) / 100)}
              aria-label="Niveau de zoom"
            />
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
          </div>
          <button className="zoom-btn" onClick={onZoomIn} aria-label="Zoom avant" title="Zoom avant (+)">+</button>
          <span className="vtom-toolbar__divider" aria-hidden="true" />
          <button
            className="zoom-btn zoom-btn--reset"
            onClick={onZoomReset}
            aria-label="Réinitialiser la vue"
            title="Réinitialiser la position et le zoom (0)"
          >
            ⌂ Reset
          </button>
          <button
            type="button"
            className="zoom-btn zoom-btn--icon"
            onClick={onRefresh}
            aria-label="Rafraîchir les données"
            title="Rafraîchir"
          >
            🔄
          </button>
          <button
            type="button"
            className="zoom-btn zoom-btn--icon"
            onClick={onExportPdf}
            aria-label="Exporter le plan en PDF"
            title="Exporter en PDF"
          >
            📄
          </button>
          <button
            type="button"
            className="zoom-btn zoom-btn--icon"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Quitter le mode plein écran' : 'Afficher en plein écran'}
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? '🗗' : '🗖'}
          </button>
        </div>
      </div>
    </header>
  )
}
