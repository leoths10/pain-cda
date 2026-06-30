import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'

import { useVtomData } from '../hooks/useVtomData'
import { usePaysageVersion } from '../hooks/usePaysageVersion'
import { useVtomViewport } from '../hooks/useVtomViewport'
import { useVtomScripts } from '../hooks/useVtomScripts'
import { useVtomTooltip } from '../hooks/useVtomTooltip'
import { useTheme } from '../contexts/ThemeProvider'

import type {
  ApplicationNode, ApplicationLink, Job, TrafficLight, Comment, Column, Separator,
  SelectedApp, SelectedJob, VtomResource,
} from '../types/vtom'
import {
  extractApplications, extractLinks, extractAllJobs,
  extractTrafficLights, extractComments, extractColumns,
  extractSeparators, extractJobLinksForApp,
} from '../utils/vtomParser'
import { extractResources } from '../utils/vtomHelpers'

import { PlanHeader } from './vtom/PlanHeader'
import { PlanSvgCanvas } from './vtom/PlanSvgCanvas'
import { PlanMinimap } from './vtom/PlanMinimap'
import { AppTooltip } from './vtom/AppTooltip'
import { AppDetailModal } from './vtom/modals/AppDetailModal'
import { JobDetailModal } from './vtom/modals/JobDetailModal'
import { ScriptModal } from './vtom/modals/ScriptModal'
import { MigradoXmlModal } from './vtom/modals/MigradoXmlModal'
import { MigradoInfoModal, type MigradoField } from './vtom/modals/MigradoInfoModal'
import { AppSearchModal } from './vtom/modals/AppSearchModal'
import { JobSearchModal } from './vtom/modals/JobSearchModal'
import { ChaineBatchPanel } from './vtom/ChaineBatchPanel'
import { PlanLegend } from './vtom/PlanLegend'
import { DocToolbar } from './vtom/DocToolbar'
import { usePlanDocs } from '../hooks/usePlanDocs'

import { apiFetch } from '../utils/apiFetch'
import '../styles/VtomPlan.css'
import '../styles/Modals.css'

function VtomPlan() {
  const { data: toursData, loading, error, refresh, lastUpdate } = useVtomData()
  const { version: paysageVersion } = usePaysageVersion()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const location = useLocation()
  const navigate = useNavigate()

  // ── Parsed data ──────────────────────────────────────────────────────────
  const [applications, setApplications] = useState<ApplicationNode[]>([])
  const [links, setLinks] = useState<ApplicationLink[]>([])
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [trafficLights, setTrafficLights] = useState<TrafficLight[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [separators, setSeparators] = useState<Separator[]>([])
  const [resources, setResources] = useState<Map<string, VtomResource>>(new Map())

  // ── Sub-hooks ────────────────────────────────────────────────────────────
  const viewport = useVtomViewport()
  const scripts = useVtomScripts(applications)
  const tooltip = useVtomTooltip()
  const docs = usePlanDocs()

  // Charge la liste des calques documentaires au montage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { docs.loadList() }, [])

  // ── UI state ─────────────────────────────────────────────────────────────
  const [hoveredApp, setHoveredApp] = useState<string | null>(null)
  const [highlightedApp, setHighlightedApp] = useState<string | null>(null)
  const [hoveredComment, setHoveredComment] = useState<number | null>(null)
  const [selectedApp, setSelectedApp] = useState<SelectedApp | null>(null)
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null)
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false)
  const [isAppSearchOpen, setIsAppSearchOpen] = useState(false)
  const [isJobSearchOpen, setIsJobSearchOpen] = useState(false)
  const [isChaineBatchOpen, setIsChaineBatchOpen] = useState(false)
  const [isMigradoInfoOpen, setIsMigradoInfoOpen] = useState(false)
  const [isMigradoXmlOpen, setIsMigradoXmlOpen] = useState(false)
  const [migradoXmlParam, setMigradoXmlParam] = useState<string | null>(null)
  const [migradoXmlContent, setMigradoXmlContent] = useState<string | null>(null)
  const [migradoXmlLoading, setMigradoXmlLoading] = useState(false)
  const [migradoXmlError, setMigradoXmlError] = useState<string | null>(null)
  const [migradoFields, setMigradoFields] = useState<MigradoField[]>([])
  const [appSearchTerm, setAppSearchTerm] = useState('')
  const [jobSearchTerm, setJobSearchTerm] = useState('')

  // ── Minimap drag state ───────────────────────────────────────────────────
  const [isMinimapDragging, setIsMinimapDragging] = useState(false)
  const minimapRef = useRef<SVGSVGElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // ── Parse les données VTOM à la réception ────────────────────────────────
  useEffect(() => {
    if (!toursData) return
    const apps = extractApplications(toursData)
    setApplications(apps)
    setLinks(extractLinks(toursData))
    setAllJobs(extractAllJobs(apps))
    setTrafficLights(extractTrafficLights(toursData))
    setComments(extractComments(toursData))
    setColumns(extractColumns(toursData, apps))
    setSeparators(extractSeparators(toursData))
    setResources(extractResources(toursData))
    scripts.loadAllChaineBatch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toursData])

  // ── Scroll/ouverture depuis la recherche avancée ─────────────────────────
  useEffect(() => {
    const state = location.state as { highlightApp?: string; openJob?: string } | null
    if (!state?.highlightApp || applications.length === 0) return
    const app = applications.find(a => a.name === state.highlightApp)
    if (!app) return
    navigate(location.pathname, { replace: true, state: {} })
    viewport.scrollToSvgPoint(app.x + app.width / 2, app.y + 27)
    setHighlightedApp(app.name)
    setTimeout(() => setHighlightedApp(null), 3000)
    if (state.openJob) {
      const job = app.jobs?.find(j => j.name === state.openJob)
      if (job) {
        scripts.resetScriptState()
        setSelectedJob({ job, appName: app.name })
        if (job.script) scripts.loadScript(job.script)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, location.state])

  // ── Interactions ─────────────────────────────────────────────────────────

  const handleAppClick = (app: ApplicationNode, e: React.MouseEvent) => {
    e.stopPropagation()
    // En mode flèche, un clic sur une application complète la flèche en cours
    // au lieu d'ouvrir la fiche détaillée.
    if (docs.editMode && docs.tool === 'arrow' && docs.completeArrowToApp(app.name)) return
    setSelectedApp({ app, mouseX: e.clientX, mouseY: e.clientY })
  }

  const handleJobClick = (job: Job, appName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    scripts.resetScriptState()
    setSelectedJob({ job, appName })
    if (job.script) scripts.loadScript(job.script)
  }

  const handleAppMouseEnter = (app: ApplicationNode, e: React.MouseEvent<SVGGElement>) => {
    setHoveredApp(app.name)
    tooltip.onAppMouseEnter(app, e)
  }

  const handleAppMouseLeave = () => {
    setHoveredApp(null)
    tooltip.onAppMouseLeave()
  }

  const centerOnApp = (app: ApplicationNode) => {
    viewport.scrollToSvgPoint(app.x + app.width / 2, app.y + 27)
    setIsAppSearchOpen(false)
    setAppSearchTerm('')
    setHighlightedApp(app.name)
    setTimeout(() => setHighlightedApp(null), 3000)
  }

  const handleJobSelect = (_job: Job, parentApp: ApplicationNode) => {
    viewport.scrollToSvgPoint(parentApp.x + parentApp.width / 2, parentApp.y + 27)
    setIsJobSearchOpen(false)
    setJobSearchTerm('')
    setSelectedApp({ app: parentApp, mouseX: window.innerWidth / 2, mouseY: window.innerHeight / 2 })
  }

  const handleChaineBatchJobClick = (job: Job, appName: string) => {
    scripts.resetScriptState()
    setSelectedJob({ job, appName })
    if (job.script) scripts.loadScript(job.script)
  }

  const handleFetchMigradoXml = async (paramName: string) => {
    setMigradoXmlParam(paramName)
    setMigradoXmlContent(null)
    setMigradoXmlError(null)
    setMigradoFields([])
    setMigradoXmlLoading(true)
    setIsMigradoInfoOpen(true)
    setIsMigradoXmlOpen(false)
    try {
      const res = await apiFetch(`/api/vtom/migrado-xml?param=${encodeURIComponent(paramName)}`)
      const json = await res.json()
      if (!res.ok) {
        setMigradoXmlError(json.error || `Erreur ${res.status}`)
      } else {
        setMigradoXmlContent(json.content)
        setMigradoFields(json.fields ?? [])
      }
    } catch (err) {
      setMigradoXmlError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setMigradoXmlLoading(false)
    }
  }

  const closeMigradoModals = () => {
    setIsMigradoInfoOpen(false)
    setIsMigradoXmlOpen(false)
    setMigradoXmlContent(null)
    setMigradoXmlError(null)
    setMigradoXmlParam(null)
    setMigradoFields([])
  }

  const openScriptModal = (scriptPath: string) => {
    setIsScriptModalOpen(true)
    if (!scripts.scriptContent) scripts.loadScript(scriptPath)
  }

  const closeJobModal = () => {
    setSelectedJob(null)
    setIsScriptModalOpen(false)
    scripts.resetScriptState()
  }

  // Stabilisé pour ne pas casser la memoization de AppDetailModal.
  const getJobLinksForApp = useCallback(
    (appName: string, jobs: Job[]) => extractJobLinksForApp(toursData, appName, jobs),
    [toursData],
  )

  // ── Export PDF ───────────────────────────────────────────────────────────

  const handleExportPdf = () => {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const serialized = new XMLSerializer().serializeToString(clone)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Plan vTom</title>
<style>
@page { size: landscape; margin: 0; }
body { margin: 0; background: #fff; }
svg { width: 100%; height: auto; display: block; }
</style></head><body>
${serialized}
<script>window.onload = () => { window.focus(); window.print(); };</script>
</body></html>`)
    win.document.close()
  }

  // ── Minimap handlers ─────────────────────────────────────────────────────

  const svgPointFromMinimap = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const dom = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    return {
      x: vb.x + ((e.clientX - dom.left) / dom.width) * vb.width,
      y: vb.y + ((e.clientY - dom.top) / dom.height) * vb.height,
    }
  }

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isMinimapDragging) return
    const { x, y } = svgPointFromMinimap(e)
    viewport.scrollToSvgPoint(x, y)
  }

  const handleMinimapMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMinimapDragging) return
    const { x, y } = svgPointFromMinimap(e)
    viewport.scrollToSvgPoint(x, y)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`vtom-plan-wrapper ${viewport.isFullscreen ? 'vtom-plan-wrapper--fullscreen' : ''}`}>
      <div className="vtom-plan-container">

        {loading && !toursData && (
          <div className="vtom-plan-state vtom-plan-state--loading">
            <div className="vtom-plan-state__icon">⏳</div>
            <div>Chargement du plan VTOM depuis le serveur distant...</div>
            <div className="vtom-plan-state__hint">Récupération du fichier PAY_TOURS.xml</div>
          </div>
        )}

        {error && !toursData && (
          <div className="vtom-plan-state vtom-plan-state--error">
            <div className="vtom-plan-state__icon">⚠️</div>
            <div>Erreur lors du chargement du plan VTOM</div>
            <div className="vtom-plan-state__hint">{error}</div>
            <button type="button" className="vtom-plan-state__retry" onClick={refresh}>
              🔄 Réessayer
            </button>
          </div>
        )}

        {toursData && (
          <>
            <PlanHeader
              scale={viewport.scale}
              lastUpdate={lastUpdate}
              paysageVersion={paysageVersion}
              isFullscreen={viewport.isFullscreen}
              onZoomIn={() => viewport.zoomBy(0.1)}
              onZoomOut={() => viewport.zoomBy(-0.1)}
              onZoomChange={viewport.zoomTo}
              onZoomReset={viewport.zoomReset}
              onRefresh={refresh}
              onToggleFullscreen={viewport.toggleFullscreen}
              onOpenAppSearch={() => setIsAppSearchOpen(true)}
              onOpenJobSearch={() => setIsJobSearchOpen(true)}
              onOpenChaineBatch={() => setIsChaineBatchOpen(true)}
              onExportPdf={handleExportPdf}
              chaineBatchLoading={scripts.chaineBatchLoading}
              chaineBatchCount={scripts.chaineBatchEntries.length}
            />

            <div className="vtom-plan-content">
              <ChaineBatchPanel
                isOpen={isChaineBatchOpen}
                onClose={() => setIsChaineBatchOpen(false)}
                entries={scripts.chaineBatchEntries}
                isDark={isDark}
                loading={scripts.chaineBatchLoading}
                error={scripts.chaineBatchError}
                onJobClick={handleChaineBatchJobClick}
              />

              <div className="vtom-plan-canvas">
                <DocToolbar docs={docs} />
                <div
                  ref={viewport.scrollContainerRef}
                  className="vtom-scroll-container"
                  onScroll={viewport.onScroll}
                >
                  <PlanSvgCanvas
                    applications={applications}
                    links={links}
                    trafficLights={trafficLights}
                    comments={comments}
                    columns={columns}
                    separators={separators}
                    scale={viewport.scale}
                    isPanning={viewport.isPanning}
                    hoveredApp={hoveredApp}
                    highlightedApp={highlightedApp}
                    hoveredComment={hoveredComment}
                    isDark={isDark}
                    onMouseDown={viewport.onMouseDown}
                    onMouseMove={viewport.onMouseMove}
                    onMouseUp={viewport.onMouseUp}
                    onAppClick={handleAppClick}
                    onAppMouseEnter={handleAppMouseEnter}
                    onAppMouseLeave={handleAppMouseLeave}
                    onCommentMouseEnter={setHoveredComment}
                    onCommentMouseLeave={() => setHoveredComment(null)}
                    svgRef={svgRef}
                    docLayer={docs.currentDoc ? {
                      annotations: docs.annotations,
                      arrows: docs.arrows,
                      editMode: docs.editMode,
                      tool: docs.tool,
                      arrowFrom: docs.arrowFrom,
                      onPlaceAnnotation: docs.addAnnotation,
                      onMoveAnnotation: docs.moveAnnotation,
                      onEditAnnotation: docs.editAnnotationText,
                      onDeleteAnnotation: docs.deleteAnnotation,
                      onAnnotationClick: docs.onAnnotationClickArrow,
                    } : undefined}
                  />
                </div>

                <div className="vtom-nav-hints">
                  <span className="nav-hint"><kbd>Glisser</kbd> Déplacer</span>
                  <span className="nav-hint"><kbd>+</kbd><kbd>−</kbd> Zoom</span>
                  <span className="nav-hint"><kbd>0</kbd> Reset</span>
                </div>

                <PlanMinimap
                  applications={applications}
                  trafficLights={trafficLights}
                  columns={columns}
                  separators={separators}
                  scale={viewport.scale}
                  viewBox={viewport.viewBox}
                  isDark={isDark}
                  isMinimapDragging={isMinimapDragging}
                  minimapRef={minimapRef}
                  onMinimapClick={handleMinimapClick}
                  onMinimapMouseMove={handleMinimapMouseMove}
                  onMinimapMouseUp={() => setIsMinimapDragging(false)}
                  onMinimapViewportMouseDown={e => { e.stopPropagation(); setIsMinimapDragging(true) }}
                />
              </div>

              <PlanLegend />
            </div>

            {/* Modales */}
            {selectedApp && (
              <AppDetailModal
                app={selectedApp.app}
                isDark={isDark}
                resources={resources}
                onClose={() => setSelectedApp(null)}
                onJobClick={handleJobClick}
                getJobLinksForApp={getJobLinksForApp}
              />
            )}

            {selectedJob && (
              <JobDetailModal
                selectedJob={selectedJob}
                isDark={isDark}
                resources={resources}
                scriptLoading={scripts.scriptLoading}
                scriptReady={scripts.scriptContent !== null}
                chaineBatch={scripts.chaineBatch}
                migradoXmlLoading={migradoXmlLoading}
                onClose={closeJobModal}
                onFetchScript={openScriptModal}
                onFetchMigradoXml={handleFetchMigradoXml}
              />
            )}

            {isMigradoInfoOpen && (
              <MigradoInfoModal
                paramName={migradoXmlParam}
                fields={migradoFields}
                loading={migradoXmlLoading}
                error={migradoXmlError}
                isDark={isDark}
                onClose={closeMigradoModals}
                onViewXml={() => setIsMigradoXmlOpen(true)}
              />
            )}

            {isMigradoXmlOpen && (
              <MigradoXmlModal
                paramName={migradoXmlParam}
                xmlContent={migradoXmlContent}
                xmlLoading={migradoXmlLoading}
                xmlError={migradoXmlError}
                isDark={isDark}
                onClose={() => setIsMigradoXmlOpen(false)}
              />
            )}

            {isScriptModalOpen && (
              <ScriptModal
                selectedJob={selectedJob}
                scriptContent={scripts.scriptContent}
                scriptLoading={scripts.scriptLoading}
                scriptError={scripts.scriptError}
                isDark={isDark}
                onClose={() => setIsScriptModalOpen(false)}
              />
            )}

            {isAppSearchOpen && (
              <AppSearchModal
                applications={applications}
                searchTerm={appSearchTerm}
                isDark={isDark}
                onSearchChange={setAppSearchTerm}
                onSelectApp={centerOnApp}
                onClose={() => { setIsAppSearchOpen(false); setAppSearchTerm('') }}
              />
            )}

            {isJobSearchOpen && (
              <JobSearchModal
                jobs={allJobs}
                applications={applications}
                searchTerm={jobSearchTerm}
                isDark={isDark}
                onSearchChange={setJobSearchTerm}
                onSelectJob={handleJobSelect}
                onClose={() => { setIsJobSearchOpen(false); setJobSearchTerm('') }}
              />
            )}

            {tooltip.tooltipApp && createPortal(
              <AppTooltip
                app={tooltip.tooltipApp}
                links={links}
                tooltipPos={tooltip.tooltipPos}
                onMouseEnter={tooltip.onTooltipMouseEnter}
                onMouseLeave={tooltip.onTooltipMouseLeave}
              />,
              document.body,
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default VtomPlan
