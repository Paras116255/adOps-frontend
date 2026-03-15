import { useState, useEffect } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { BrandProvider, useBrand } from "./context/BrandContext"
import { ToastProvider } from "./context/ToastContext"
import ProtectedRoute from "./components/ProtectedRoute"
import ErrorBoundary from "./components/ErrorBoundary"
import Layout from "./components/layout/Layout"
import Onboarding from "./components/Onboarding"
import { get } from "./lib/api"
import type { MetaConnection } from "./lib/types"

// Auth pages (no sidebar/layout)
import Login from "./pages/Login"
import Register from "./pages/Register"

// App pages (inside layout, require auth)
import Dashboard from "./pages/Dashboard"
import Ads from "./pages/Ads"
import Orders from "./pages/Orders"
import Automations from "./pages/Automations"
import Inbox from "./pages/Inbox"
import Alerts from "./pages/Alerts"
import Settings from "./pages/Settings"
import MetaCallback from "./pages/MetaCallback"

// ── Onboarding gate — sits inside BrandProvider ──────────────────────────────

/**
 * OnboardingGate checks whether the user needs onboarding after brands load.
 * Conditions that trigger the wizard:
 *   - No brands exist yet                  → start from Step 1 (brand creation)
 *   - Brand exists but no Meta connection  → start from Step 2 (Meta connect)
 * The wizard is skipped entirely on /meta/callback to avoid interfering with OAuth.
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { brands, activeBrand, isLoading } = useBrand()
  const location = useLocation()

  const [showWizard,  setShowWizard]  = useState(false)
  const [skipToBrand, setSkipToBrand] = useState(false)
  const [skipToMeta,  setSkipToMeta]  = useState(false)
  const [checked,     setChecked]     = useState(false)

  useEffect(() => {
    // Don't check while brands are loading or on the OAuth callback page
    if (isLoading) return
    if (location.pathname === "/meta/callback") {
      setChecked(true)
      return
    }

    if (brands.length === 0) {
      // No brands — start from the beginning
      setSkipToBrand(false)
      setSkipToMeta(false)
      setShowWizard(true)
      setChecked(true)
      return
    }

    if (!activeBrand) {
      setChecked(true)
      return
    }

    // Brand exists — check for Meta connection
    get<MetaConnection>("/integrations/meta/connection", { brand_id: activeBrand.id })
      .then(() => {
        // Connection found — no onboarding needed
        setShowWizard(false)
      })
      .catch(() => {
        // 404 = no connection — show the Meta step
        setSkipToMeta(true)
        setSkipToBrand(true)
        setShowWizard(true)
      })
      .finally(() => setChecked(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, brands.length, activeBrand?.id, location.pathname])

  return (
    <>
      {children}
      {checked && showWizard && (
        <Onboarding
          skipToBrand={skipToBrand}
          skipToMeta={skipToMeta}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  )
}

// ── Root app ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
    <ToastProvider>
    <AuthProvider>
      <Routes>
        {/* ── Public routes (no layout, no auth required) ───────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Protected routes (require auth) ───────────────────────────── */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              {/* BrandProvider is inside ProtectedRoute so it always has a valid token */}
              <BrandProvider>
                <OnboardingGate>
                  <Routes>
                    {/* Full-screen pages (no sidebar layout) */}
                    <Route path="/meta/callback" element={<MetaCallback />} />

                    {/* Sidebar layout pages */}
                    <Route
                      path="/*"
                      element={
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/ads" element={<Ads />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/automations" element={<Automations />} />
                            <Route path="/inbox" element={<Inbox />} />
                            <Route path="/alerts" element={<Alerts />} />
                            <Route path="/settings" element={<Settings />} />
                          </Routes>
                        </Layout>
                      }
                    />
                  </Routes>
                </OnboardingGate>
              </BrandProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
    </ToastProvider>
    </ErrorBoundary>
  )
}
