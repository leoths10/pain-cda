/**
 * Types de la couche documentaire (calques d'annotation posés sur le plan VTOM).
 * Le frontend travaille entièrement en espace d'`uid` (identifiants client stables) :
 * les flèches référencent les annotations par leur `uid`, jamais par un id SQL.
 */

export interface DocTag {
  label: string
  color: string
}

export interface DocAnnotation {
  /** Identifiant client stable (sert d'ancre aux flèches). */
  uid: string
  text: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

export type ArrowTargetType = 'app' | 'job' | 'annotation'

export interface DocArrow {
  /** uid de l'annotation source. */
  from_uid: string
  target_type: ArrowTargetType
  /** Nom de l'application VTOM, ou uid d'une autre annotation. */
  target_ref: string
  color: string
}

/** Métadonnées d'un calque telles que renvoyées par la liste. */
export interface PlanDocSummary {
  id: number
  title: string
  description: string | null
  updated_at: string | null
  annotations_count?: number
  arrows_count?: number
  tags: DocTag[]
  creator?: { uid: string; name: string } | null
}

/** Calque complet (métadonnées + contenu). */
export interface PlanDocFull extends PlanDocSummary {
  views?: number | null
  annotations: DocAnnotation[]
  arrows: DocArrow[]
}
