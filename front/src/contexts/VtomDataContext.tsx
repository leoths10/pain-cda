import { createContext, ReactNode, useContext, useMemo } from 'react'
import { useVtomData } from '../hooks/useVtomData'
import { extractApplications, extractAllJobs } from '../utils/vtomParser'

export interface VtomSearchableApp {
  name: string
  family: string
}

export interface VtomSearchableJob {
  name: string
  parentApp: string
}

interface VtomDataContextValue {
  searchableApps: VtomSearchableApp[]
  searchableJobs: VtomSearchableJob[]
  vtomLoading: boolean
}

const VtomDataContext = createContext<VtomDataContextValue>({
  searchableApps: [],
  searchableJobs: [],
  vtomLoading: false,
})

export function VtomDataProvider({ children }: { children: ReactNode }) {
  const { data: toursData, loading } = useVtomData()

  const { searchableApps, searchableJobs } = useMemo(() => {
    if (!toursData) return { searchableApps: [], searchableJobs: [] }
    const apps = extractApplications(toursData)
    return {
      searchableApps: apps.map(a => ({ name: a.name, family: a.family ?? '' })),
      searchableJobs: extractAllJobs(apps).map(j => ({
        name: j.name,
        parentApp: j.parentApp ?? '',
      })),
    }
  }, [toursData])

  return (
    <VtomDataContext.Provider value={{ searchableApps, searchableJobs, vtomLoading: loading }}>
      {children}
    </VtomDataContext.Provider>
  )
}

export function useVtomSearchData() {
  return useContext(VtomDataContext)
}