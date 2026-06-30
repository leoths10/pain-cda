/**
 * Correspondance code statut VTOM → emoji :
 * E = terminé, W = attente, R = en cours, U = inconnu.
 */
export function getStatusIcon(status?: string): string {
  switch (status) {
    case 'E': return '✅'
    case 'W': return '⏳'
    case 'R': return '▶️'
    case 'U': return '🔄'
    default:  return '❓'
  }
}

/** Table de correspondance pour les couleurs VTOM saturées les plus fréquentes. */
const COLOR_MAP: Record<string, string> = {
  '#0000FF': '#5B7FFF', '#0000CD': '#6B8FFF', '#00008B': '#4A6FEE',
  '#000080': '#3B5FDD', '#0000AA': '#5A7FEE', '#4B68FF': '#5B7FFF',
  '#FF00FF': '#B85FFF', '#8B008B': '#9B58EA', '#800080': '#8B4FDD',
  '#9400D3': '#A45FEE', '#FF00AA': '#D068DD',
  '#FF0000': '#FF5555', '#DC143C': '#FF6666', '#8B0000': '#CC4444',
  '#CD5C5C': '#FF7777',
  '#00FF00': '#55DD77', '#00AA00': '#44CC66', '#008000': '#33BB55',
  '#32CD32': '#55DD77', '#00FF7F': '#55EE88',
  '#FFFF00': '#FFE555', '#FFD700': '#FFCC44', '#FFA500': '#FF9933',
  '#FF8C00': '#FF8822',
  '#00FFFF': '#33DDEE', '#00CED1': '#22CCDD', '#00AAAA': '#22BBCC',
  '#FF1493': '#FF5599', '#FF69B4': '#FF88BB', '#FFB6C1': '#FFAACC',
}

/**
 * Adoucit une couleur trop saturée, trop sombre ou trop claire pour l'affichage UI.
 * Consulte d'abord COLOR_MAP puis applique un algorithme de désaturation en fallback.
 */
export function softenColor(hexColor: string): string {
  const normalized = hexColor.toUpperCase()
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized]

  const hex = normalized.replace('#', '')
  if (hex.length !== 6) return hexColor

  let r = parseInt(hex.substring(0, 2), 16)
  let g = parseInt(hex.substring(2, 4), 16)
  let b = parseInt(hex.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hexColor

  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  const maxC = Math.max(r, g, b)
  const minC = Math.min(r, g, b)
  const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC

  // Si la couleur est "OK", on la retourne telle quelle
  if (saturation <= 0.8 && brightness >= 80 && brightness <= 220) return hexColor

  // Sinon on la ramène vers un gris neutre à 75%
  const target = 140
  r = Math.round(r * 0.75 + target * 0.25)
  g = Math.round(g * 0.75 + target * 0.25)
  b = Math.round(b * 0.75 + target * 0.25)

  // Ajuste la luminosité finale pour rester dans [100, 200]
  const nb = (r * 299 + g * 587 + b * 114) / 1000
  if (nb < 100) {
    const boost = 100 - nb
    r = Math.min(255, r + boost); g = Math.min(255, g + boost); b = Math.min(255, b + boost)
  } else if (nb > 200) {
    const reduce = nb - 200
    r = Math.max(60, r - reduce); g = Math.max(60, g - reduce); b = Math.max(60, b - reduce)
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
