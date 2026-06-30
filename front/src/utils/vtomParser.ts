import type {
  ApplicationNode, ApplicationLink, Job, TrafficLight,
  Comment, Column, Separator, GraphComment, ExpectedResource
} from '../types/vtom'

/**
 * Utilitaires d'extraction depuis l'arbre JSON produit par xmltodict sur PAY_TOURS.xml.
 * Toutes les fonctions exportées prennent en entrée l'objet `toursData` brut.
 */

/** Compression horizontale du canvas : VTOM exporte avec beaucoup d'espace entre colonnes. */
const X_SCALE = 0.75

function getProps(propsRaw: any): Record<string, string> {
  const arr: any[] = Array.isArray(propsRaw) ? propsRaw : propsRaw ? [propsRaw] : []
  const map: Record<string, string> = {}
  arr.forEach((p: any) => { if (p && p['@key']) map[p['@key']] = p['@value'] ?? '' })
  return map
}

function toInt(value: any, fallback = 0): number {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

export function extractApplications(toursData: any): ApplicationNode[] {
  const apps: ApplicationNode[] = []
  try {
    const applicationsArray =
      toursData?.Domain?.Environments?.Environment?.Applications?.Application
    if (!Array.isArray(applicationsArray)) return apps

    applicationsArray.forEach((app: any) => {
      const node = app?.Node
      if (!node || !node['@x'] || !node['@y']) return

      const props = getProps(node?.Properties?.Property)
      const background = props['background'] ?? '#4b68ff'
      const width = Math.round(toInt(props['width'], 220) * X_SCALE)

      const jobs: Job[] = []
      if (app.Jobs?.Job) {
        const jobsData = Array.isArray(app.Jobs.Job) ? app.Jobs.Job : [app.Jobs.Job]
        jobsData.forEach((job: any) => {
          const jobProps = getProps(job?.Node?.Properties?.Property)
          const jobNode = job?.Node

          let parameters: string[] = []
          if (job.Parameters?.Parameter) {
            parameters = Array.isArray(job.Parameters.Parameter)
              ? job.Parameters.Parameter
              : [job.Parameters.Parameter]
          }

          jobs.push({
            name: job['@name'] || 'Sans nom',
            status: job['@status'],
            script: job.Script,
            parameters,
            frequency: job['@frequency'],
            mode: job['@mode'],
            minStart: job['@minStart'],
            maxStart: job['@maxStart'],
            retcode: job['@retcode'],
            background: jobProps['background'] ?? '#9932cc',
            x: jobNode?.['@x'] ? toInt(jobNode['@x']) : undefined,
            y: jobNode?.['@y'] ? toInt(jobNode['@y']) : undefined,
            width: jobNode?.['@width'] ? toInt(jobNode['@width'], 180) : 180,
            height: jobNode?.['@height'] ? toInt(jobNode['@height'], 60) : 60,
          })
        })
      }

      const expectedResources: ExpectedResource[] = []
      if (app.ExpectedResources?.ExpectedResource) {
        const erData = Array.isArray(app.ExpectedResources.ExpectedResource)
          ? app.ExpectedResources.ExpectedResource
          : [app.ExpectedResources.ExpectedResource]
        erData.forEach((er: any) => {
          if (er['@resource']) {
            expectedResources.push({
              resource: er['@resource'],
              operator: er['@operator'] || '',
              value: er.Value != null ? String(er.Value) : undefined,
              wait: er['@wait'] === '1',
              free: er['@free'] === '1',
            })
          }
        })
      }

      // Extraire les commentaires du schéma interne (app.Graph.Node)
      const graphComments: GraphComment[] = []
      const graphNodes = app?.Graph?.Node
      if (graphNodes) {
        const gnArr = Array.isArray(graphNodes) ? graphNodes : [graphNodes]
        gnArr.forEach((gn: any) => {
          if (gn['@objectType'] !== 'com') return
          const gnProps = getProps(gn?.Properties?.Property)
          const lbl: string = gn['@label'] || ''
          if (!lbl.trim()) return
          graphComments.push({
            x: toInt(gn['@x']),
            y: toInt(gn['@y']),
            width: toInt(gnProps['width'], 200),
            height: toInt(gnProps['height'], 40),
            label: lbl,
            foreground: gnProps['foreground'] ?? '#000000',
            background: gnProps['background'],
            font: gnProps['font'] ?? 'SansSerif#12#false#false',
          })
        })
      }

      apps.push({
        name: app['@name'] || 'Sans nom',
        x: Math.round(toInt(node['@x']) * X_SCALE),
        y: toInt(node['@y']),
        width,
        background,
        family: app['@family'],
        status: app['@status'],
        comment: app['@comment'],
        cycleEnabled: app['@cycleEnabled'],
        cycle: app['@cycle'],
        jobsCount: jobs.length,
        jobs,
        graphComments: graphComments.length > 0 ? graphComments : undefined,
        expectedResources: expectedResources.length > 0 ? expectedResources : undefined,
      })
    })
  } catch (e) {
    console.error('Erreur extraction applications:', e)
  }
  return apps
}

export function extractLinks(toursData: any): ApplicationLink[] {
  const links: ApplicationLink[] = []
  try {
    const linksData = toursData?.Domain?.Links?.Link
    if (!Array.isArray(linksData)) return links

    linksData.forEach((link: any) => {
      const parentApp = link['@parent']?.split('/')[1]
      const childApp = link['@child']?.split('/')[1]
      if (parentApp && childApp && parentApp !== childApp) {
        links.push({ from: parentApp, to: childApp, type: link['@type'] || 'M' })
      }
    })
  } catch (e) {
    console.error('Erreur extraction liens:', e)
  }
  return links
}

/** Transforme les jobs imbriqués (apps → jobs) en une liste plate, avec position résolue. */
export function extractAllJobs(apps: ApplicationNode[]): Job[] {
  return apps.flatMap(app =>
    (app.jobs ?? []).map(job => ({
      ...job,
      x: job.x ?? app.x + (app.width - (job.width ?? 180)) / 2,
      y: job.y ?? app.y + 100,
      width: job.width ?? 180,
      height: job.height ?? 60,
      parentApp: app.name,
    }))
  )
}

export function extractTrafficLights(toursData: any): TrafficLight[] {
  const lights: TrafficLight[] = []
  try {
    const nodes = toursData?.Domain?.Environments?.Environment?.Graph?.Node
    if (!Array.isArray(nodes)) return lights

    nodes.forEach((node: any) => {
      if (node['@objectType'] !== 'com') return
      const props = getProps(node?.Properties?.Property)
      if (props['icon'] === 'trafficlight_on' && node['@x'] && node['@y']) {
        lights.push({
          x: Math.round(toInt(node['@x']) * X_SCALE),
          y: toInt(node['@y']),
          width: toInt(props['width'], 90),
          height: toInt(props['height'], 40),
          label: node['@label'] || '',
        })
      }
    })
  } catch (e) {
    console.error('Erreur extraction feux rouges:', e)
  }
  return lights
}

/**
 * Résout les chevauchements entre commentaires avec une stratégie adaptée à chaque cas :
 *
 *  - Si les commentaires ont des **X différents et Y similaires** (écart Y < hauteur) :
 *    → Décalage sur l'axe **X** uniquement pour les placer côte à côte.
 *    → Plus rapide et visuellement cohérent (commentaires dans la même zone horizontale).
 *
 *  - Si les commentaires ont des **X identiques et Y similaires** (même colonne) :
 *    → Empilage sur l'axe **Y** dans l'espace disponible avant la prochaine application.
 *    → Si l'espace est insuffisant, fallback sur décalage X.
 *
 * L'algorithme travaille en passes successives jusqu'à stabilisation (max 5 passes)
 * pour propager les corrections en cascade.
 *
 * @internal
 */
function resolveCommentOverlaps(comments: Comment[], appBottoms: number[]): Comment[] {
  const colLabels = comments.filter(c => c.isColumnLabel)
  const result = comments.filter(c => !c.isColumnLabel).map(c => ({ ...c }))

  const GAP = 6
  const MAX_PASSES = 5

  // Détermine la prochaine limite d'application au-dessus d'un Y donné
  const nextAppBottom = (y: number): number => {
    for (let i = 0; i < appBottoms.length; i++) {
      if (appBottoms[i] > y) return appBottoms[i]
    }
    return y + 9999
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false

    // Trier à chaque passe : X d'abord (pour la stratégie X), puis Y
    result.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y)

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]
        const b = result[j]

        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y
        if (!overlapX || !overlapY) continue

        const diffX = Math.abs(a.x - b.x)
        const diffY = Math.abs(a.y - b.y)

        // ── Cas 1 : X différents (commentaires côte à côte) → ajuster X ──
        // Les commentaires sont déjà à des X différents, on les décale juste
        // pour supprimer le chevauchement horizontal.
        if (diffX >= diffY) {
          // b est à droite de a → pousser b vers la droite
          const newX = a.x + a.width + GAP
          if (newX !== b.x) {
            result[j] = { ...b, x: newX }
            changed = true
          }
          continue
        }

        // ── Cas 2 : X identiques ou très proches (même colonne) → empiler sur Y ──
        const newY = a.y + a.height + GAP
        const boundary = nextAppBottom(a.y)

        if (newY + b.height <= boundary) {
          // L'espace est suffisant : empiler
          if (newY !== b.y) {
            result[j] = { ...b, y: newY }
            changed = true
          }
        } else {
          // Espace insuffisant pour empiler → fallback sur décalage X
          const newX = a.x + a.width + GAP
          if (newX !== b.x) {
            result[j] = { ...b, x: newX }
            changed = true
          }
        }
      }
    }

    if (!changed) break
  }

  return [...colLabels, ...result]
}

/** Extrait les commentaires en résolvant les chevauchements via {@link resolveCommentOverlaps}. */
export function extractComments(toursData: any): Comment[] {
  const extracted: Comment[] = []

  // Bornes verticales utilisées pour empiler les commentaires sans déborder sur l'app suivante.
  const appBottoms: number[] = []
  try {
    const APP_HEIGHT = 55
    const appsRaw = toursData?.Domain?.Environments?.Environment?.Applications?.Application
    if (Array.isArray(appsRaw)) {
      appsRaw.forEach((app: any) => {
        const ay = app?.Node?.['@y']
        if (ay) appBottoms.push(toInt(ay) + APP_HEIGHT)
      })
      appBottoms.sort((a: number, b: number) => a - b)
    }
  } catch { /* ignore */ }

  try {
    const nodes = toursData?.Domain?.Environments?.Environment?.Graph?.Node
    if (!Array.isArray(nodes)) return extracted

    nodes.forEach((node: any) => {
      if (node['@objectType'] !== 'com') return
      const props = getProps(node?.Properties?.Property)
      if (props['icon'] === 'trafficlight_on') return
      if (!node['@x'] || !node['@y'] || !node['@label']) return

      const label = node['@label']
      const nodeY = toInt(node['@y'])
      const labelUpper = typeof label === 'string' ? label.toUpperCase() : ''
      const isColumnLabel = labelUpper.includes('<HTML>') && nodeY <= 10

      // Ignorer les nœuds dans la zone header qui ne sont pas des labels de colonnes
      if (!isColumnLabel && nodeY <= 10) return

      // Ignorer les labels parasites (chiffres ou espaces seuls, x < 50)
      const trimmed = typeof label === 'string' ? label.trim() : ''
      if (trimmed.length <= 1 && toInt(node['@x']) < 50) return

      extracted.push({
        x: Math.round(toInt(node['@x']) * X_SCALE),
        y: nodeY,
        width: toInt(props['width'], 200),
        height: toInt(props['height'], 40),
        label,
        foreground: props['foreground'] ?? '#000000',
        font: props['font'] ?? 'SansSerif#12#false#false',
        isColumnLabel,
      })
    })
  } catch (e) {
    console.error('Erreur extraction commentaires:', e)
  }
  return resolveCommentOverlaps(extracted, appBottoms)
}

/** Détecte les colonnes via les labels HTML positionnés en haut du canvas (Y ≤ 10). */
export function extractColumns(toursData: any, apps: ApplicationNode[]): Column[] {
  try {
    const nodes = toursData?.Domain?.Environments?.Environment?.Graph?.Node
    if (!Array.isArray(nodes)) return []

    const palette = ['#818cf8', '#34d399', '#fbbf24', '#60a5fa', '#f472b6']
    const colNodes: { name: string; x: number }[] = []

    nodes.forEach((node: any) => {
      if (node['@objectType'] !== 'com') return
      const label = node['@label']
      const nodeY = toInt(node['@y'], 999)
      if (typeof label === 'string' && label.toUpperCase().includes('<HTML>') && nodeY <= 10 && node['@x']) {
        const clean = label.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
        colNodes.push({ name: clean, x: Math.round(toInt(node['@x']) * X_SCALE) })
      }
    })

    if (colNodes.length === 0) return []
    colNodes.sort((a, b) => a.x - b.x)

    const maxAppRight = apps.length > 0
      ? Math.max(...apps.map(a => a.x + a.width)) + 80
      : colNodes[colNodes.length - 1].x + 400

    return colNodes.map((col, i) => {
      const isLast = i + 1 >= colNodes.length
      const rawWidth = isLast
        ? maxAppRight - col.x
        : colNodes[i + 1].x - col.x
      // Pour la dernière colonne, garantir une largeur minimale pour que le label
      // ne déborde pas dans la colonne précédente (police bold + letter-spacing)
      const minWidth = isLast ? col.name.length * 11 + 48 : 0
      return {
        name: col.name,
        x: col.x,
        width: Math.max(rawWidth, minWidth),
        color: palette[i % palette.length],
      }
    })
  } catch {
    return []
  }
}

export function extractSeparators(toursData: any): Separator[] {
  try {
    const nodes = toursData?.Domain?.Environments?.Environment?.Graph?.Node
    if (!Array.isArray(nodes)) return []

    // Une seule passe : collecte les labels de colonnes (com) et les séparateurs (nod).
    const colNodesRaw: { name: string; x: number }[] = []
    const raw: Separator[] = []
    nodes.forEach((n: any) => {
      const type = n['@objectType']
      if (type === 'com') {
        const lbl = n['@label'] || ''
        if (lbl.toUpperCase().includes('<HTML>') && toInt(n['@y'], 999) <= 10 && n['@x']) {
          const clean = lbl.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
          colNodesRaw.push({ name: clean, x: Math.round(toInt(n['@x']) * X_SCALE) })
        }
        return
      }
      if (type === 'nod' && n['@x'] && n['@y']) {
        const props = getProps(n?.Properties?.Property)
        const w = toInt(props['width'], 20)
        const h = toInt(props['height'], 20)
        raw.push({
          label: n['@label'] || '',
          x: Math.round(toInt(n['@x']) * X_SCALE),
          y: toInt(n['@y']),
          width: Math.round(w * X_SCALE),
          height: h,
          background: props['background'] ?? '#d3d3d3',
          foreground: props['foreground'] ?? '#000000',
          font: props['font'] ?? 'SansSerif#11#true#false',
          textVisible: props['textVisible'] !== 'false',
          isVertical: w <= 25 && h > 100,
        } as Separator)
      }
    })
    colNodesRaw.sort((a, b) => a.x - b.x)

    const paysageCol = colNodesRaw.find(c => c.name.toUpperCase().includes('PAYSAGE'))
    const paysageIdx = paysageCol ? colNodesRaw.indexOf(paysageCol) : -1
    const paysageX = paysageCol?.x ?? 0
    const paysageRight = paysageIdx >= 0 && paysageIdx + 1 < colNodesRaw.length
      ? colNodesRaw[paysageIdx + 1].x
      : 9999

    const COLUMN_HEADER_BOTTOM = 90

    return raw.map(s => {
      if (s.isVertical) return s
      const origRight = s.x + s.width
      const clampedY = s.y < COLUMN_HEADER_BOTTOM ? COLUMN_HEADER_BOTTOM : s.y
      if (s.x < paysageX) {
        const newX = paysageX
        const newWidth = Math.max(0, Math.min(origRight, paysageRight) - newX)
        return { ...s, x: newX, y: clampedY, width: newWidth }
      }
      if (s.x >= paysageX && origRight > paysageRight) {
        return { ...s, y: clampedY, width: Math.max(0, paysageRight - s.x) }
      }
      return { ...s, y: clampedY }
    }).filter(s => s.width > 0 || s.isVertical)
  } catch {
    return []
  }
}

export function extractJobLinksForApp(toursData: any, appName: string, jobs: Job[]) {
  const jobLinks: Array<{ from: string; to: string; type: string }> = []
  try {
    const linksData = toursData?.Domain?.Links?.Link
    if (!Array.isArray(linksData)) return jobLinks

    linksData.forEach((link: any) => {
      const parentParts = link['@parent']?.split('/')
      const childParts = link['@child']?.split('/')
      if (parentParts?.length === 3 && childParts?.length === 3) {
        const [, parentApp, parentJob] = parentParts
        const [, childApp, childJob] = childParts
        if (parentApp === appName && childApp === appName &&
            jobs.some(j => j.name === parentJob) &&
            jobs.some(j => j.name === childJob)) {
          jobLinks.push({ from: parentJob, to: childJob, type: link['@type'] || 'M' })
        }
      }
    })
  } catch (e) {
    console.error('Erreur extraction liens jobs:', e)
  }
  return jobLinks
}
