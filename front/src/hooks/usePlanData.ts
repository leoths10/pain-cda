import { useContext } from 'react'
import { PlanDataContext } from '../contexts/PlanDataProvider'

export function usePlanData() {
  const context = useContext(PlanDataContext)
  if (!context) {
    throw new Error('usePlanData must be used within PlanDataProvider')
  }
  return context
}
