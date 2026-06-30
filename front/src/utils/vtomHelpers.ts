import type { Comment, ApplicationNode, VtomResource } from '../types/vtom'

/**
 * Détermine si un commentaire est visuellement associé à une application
 * (positionné juste en dessous et horizontalement aligné avec elle).
 */
export function isCommentNearApp(comment: Comment, app: ApplicationNode): boolean {
  const appBottom = app.y + 55
  const verticalGap = comment.y - appBottom
  const isBelow = verticalGap >= -20 && verticalGap <= 100

  const appCenterX = app.x + app.width / 2
  const commentCenterX = comment.x + comment.width / 2
  const isAligned = Math.abs(appCenterX - commentCenterX) <= app.width * 0.6

  return isBelow && isAligned
}

/** Extrait les ressources du domaine VTOM et les indexe par nom. */
export function extractResources(toursData: any): Map<string, VtomResource> {
  const map = new Map<string, VtomResource>()
  const resources = toursData?.Domain?.Resources?.Resource
  if (!resources) return map

  const arr = Array.isArray(resources) ? resources : [resources]
  for (const res of arr) {
    if (!res['@name']) continue
    map.set(res['@name'], {
      name: res['@name'],
      type: res['@type'] || 'Unknown',
      value: res.Value || '',
      comment: res['@comment'],
    })
  }
  return map
}

/**
 * Extrait les références `{NOM_RESSOURCE}` d'un paramètre et les résout
 * via la map des ressources disponibles.
 */
export function parseParameter(
  param: string,
  resources: Map<string, VtomResource>
): { text: string; resourceRefs: Array<{ name: string; value: string; type: string }> } {
  const resourceRefs: Array<{ name: string; value: string; type: string }> = []
  const regex = /\{([^}]+)\}/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(param)) !== null) {
    const resource = resources.get(match[1])
    if (resource) {
      resourceRefs.push({ name: match[1], value: resource.value, type: resource.type })
    }
  }
  return { text: param, resourceRefs }
}

/** Table des entités HTML françaises, nommées et numériques les plus courantes. */
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&',
  '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&eacute;': 'é', '&egrave;': 'è', '&ecirc;': 'ê',
  '&agrave;': 'à', '&acirc;': 'â', '&ccedil;': 'ç',
  '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û', '&ugrave;': 'ù',
  '&Eacute;': 'É', '&Egrave;': 'È', '&Agrave;': 'À', '&Ccedil;': 'Ç',
  '&euro;': '€',
}

/** Nettoie un label HTML : supprime les balises, décode les entités, normalise les espaces. */
export function cleanHtmlLabel(label: string): string {
  let text = label
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')

  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    text = text.replaceAll(entity, char)
  }

  return text
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Découpe un texte en lignes selon un nombre maximum de caractères, en respectant les mots. */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = []
  for (const rawLine of text.split('\n')) {
    if (rawLine.length <= maxCharsPerLine) { lines.push(rawLine); continue }
    let current = ''
    for (const word of rawLine.split(' ')) {
      const candidate = current ? `${current} ${word}` : word
      if (candidate.length > maxCharsPerLine && current) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

/**
 * Calcule le point d'intersection d'une droite (ox,oy)→centre(rx,ry,rw,rh)
 * avec le bord du rectangle. Utilisé pour que les flèches de dépendance
 * s'arrêtent sur le bord des applications au lieu de leur centre.
 */
export function clipToRect(
  ox: number, oy: number,
  rx: number, ry: number, rw: number, rh: number
): [number, number] {
  const cx = rx + rw / 2
  const cy = ry + rh / 2
  const dx = ox - cx
  const dy = oy - cy
  if (dx === 0 && dy === 0) return [cx, cy]
  const hw = rw / 2 - 4
  const hh = rh / 2 - 4
  const t = Math.abs(dx) * hh > Math.abs(dy) * hw
    ? hw / Math.abs(dx)
    : hh / Math.abs(dy)
  return [cx + dx * t, cy + dy * t]
}
