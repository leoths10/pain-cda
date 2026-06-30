import { CSSProperties } from 'react'

// Contenu du bandeau de navigation (Hero)

export interface HeroAction {
  label: string
  icon?: string
  ariaLabel: string
  variant: 'primary' | 'outline'
  path: string
}

export interface HeroContent {
  icon: { glyph: string; label: string }
  eyebrow: string
  title: string
  subtitle: string
  actions: HeroAction[]
}

// Accès rapide et sections éditoriales

export interface Section {
  id: string
  title: string
  description: string
  highlights: string[]
}

export interface QuickLink {
  title: string
  description: string
  action: string
  accent: string
  to?: string
  /** Intent spécial : 'search' ouvre la modale de recherche au lieu de naviguer. */
  intent?: 'search'
}

export interface QuickAccessContent {
  eyebrow: string
  title: string
  links: QuickLink[]
}

// Plan VTOM statique (colonnes + applications)

export interface PlanItem {
  label: string
  color?: string
  muted?: boolean
}

export interface PlanColumn {
  id: string
  title: string
  placeholder: string
  items: PlanItem[]
}

/** Entrée dans la liste aplatie pour la recherche. */
export interface PlanApplicationsEntry extends PlanItem {
  column: string
}

// Détails d'une application (chargés depuis plan-data.json)

export interface TreatmentJob {
  label: string
}

export interface AppTreatment {
  name: string
  script: string
  jobs?: TreatmentJob[]
}

export interface AppDetail {
  name: string
  summary?: string
  treatments: AppTreatment[]
}

// Utilitaires partagés

/** Extension de CSSProperties autorisant les variables CSS custom (--var). */
export type CSSVarProperties = CSSProperties & { [key: `--${string}`]: string | number }

export type PlanDetailsMap = Record<string, AppDetail>

// Payload complet du fichier plan-data.json

export interface PlanDataPayload {
  hero: HeroContent
  homeSections: Section[]
  documentationSections: Section[]
  quickAccess: QuickAccessContent
  planColumns: PlanColumn[]
  planDetails: PlanDetailsMap
}
