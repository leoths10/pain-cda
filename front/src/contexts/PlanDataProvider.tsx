// Données statiques du plan (hero, colonnes, détails des applications) issues de plan-data.json.
// Chargées une seule fois au montage via useMemo ; aucune requête réseau ici.
import { createContext, ReactNode, useMemo } from 'react'
import planDataJson from '../data/plan-data.json'
import type { AppDetail, PlanApplicationsEntry, PlanDataPayload } from '../types'

export interface PlanDataContextValue {
  planData: PlanDataPayload
  /** Liste aplatie de toutes les applications pour la recherche. */
  planApplications: PlanApplicationsEntry[]
  /** Retourne les détails d'une application (ou un placeholder si absente). */
  getAppDetail: (label: string) => AppDetail
}

export const PlanDataContext = createContext<PlanDataContextValue | undefined>(undefined)

const PLAN_DATA = planDataJson as PlanDataPayload

export function PlanDataProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PlanDataContextValue>(() => {
    const planApplications: PlanApplicationsEntry[] = PLAN_DATA.planColumns.flatMap(column =>
      column.items
        .filter(item => !item.muted)
        .map(item => ({ ...item, column: column.title }))
    )

    const getAppDetail = (label: string): AppDetail =>
      PLAN_DATA.planDetails[label] ?? {
        name: label,
        summary: 'Documentation à venir pour cette application.',
        treatments: [],
      }

    return { planData: PLAN_DATA, planApplications, getAppDetail }
  }, [])

  return <PlanDataContext.Provider value={value}>{children}</PlanDataContext.Provider>
}
