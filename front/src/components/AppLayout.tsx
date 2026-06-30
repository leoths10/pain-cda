// Layout racine de l'application : gère le routage global et l'état de la modale de recherche.
// La route /login est publique ; toutes les autres sont protégées par ProtectedRoute.
import { useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdvancedSearchModal from './AdvancedSearchModal'
import CookieConsent from './CookieConsent'
import Documentation from './Documentation'
import Footer from './Footer'
import Hero from './Hero'
import Home from './Home'
import Login from './Login'
import VtomPlan from './VtomPlan'
import { ProtectedRoute } from './ProtectedRoute'
import { usePlanData } from '../hooks/usePlanData'
import { VtomDataProvider } from '../contexts'

function AppLayout() {
  const { planData, planApplications } = usePlanData()
  const location = useLocation()
  // La recherche avancée est pilotée depuis AppLayout pour être accessible
  // depuis le Hero (bouton) et la page Home (card).
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const openSearch = useCallback(() => setIsSearchOpen(true), [])
  const closeSearch = useCallback(() => setIsSearchOpen(false), [])


  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <VtomDataProvider>
                <div className="page">
                  <Hero content={planData.hero} activePath={location.pathname} />
                  <Routes>
                    <Route path="/" element={<Home onOpenSearch={openSearch} />} />
                    <Route path="/documentation" element={<Documentation />} />
                    <Route path="/vtom-plan" element={<VtomPlan />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  <AdvancedSearchModal
                    applications={planApplications}
                    isOpen={isSearchOpen}
                    onClose={closeSearch}
                  />
                  <CookieConsent />
                  <Footer />
                </div>
              </VtomDataProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default AppLayout
