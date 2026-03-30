import { useEffect, useState, useMemo, useRef } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useBrand } from "../context/BrandContext"
import { get, ApiError } from "../lib/api"
import type { Campaign, DailyMetric } from "../lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, prefix = "") {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${prefix}${(n / 1_000).toFixed(1)}K`
  return `${prefix}${n.toFixed(2)}`
}

function cppColor(cpp: number) {
  if (cpp <= 60)  return "text-green-600"
  if (cpp <= 100) return "text-yellow-600"
  return "text-red-600"
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { activeBrand, dateRange, dateFilter } = useBrand()

  const [campaigns,   setCampaigns]  = useState<Campaign[]>([])
  const [metrics,     setMetrics]    = useState<DailyMetric[]>([])
  const [loading,     setLoading]    = useState(false)
  const [error,       setError]      = useState<string | null>(null)
  const [refreshKey,  setRefreshKey] = useState(0)

  // Track previous brand/date to distinguish hard-reset vs background refresh
  const prevBrandId = useRef<number | undefined>(undefined)
  const prevSince   = useRef<string>("")
  const prevUntil   = useRef<string>("")

  // Re-fetch when a background sync finishes
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1)
    window.addEventListener("adops:sync-complete", handler)
    return () => window.removeEventListener("adops:sync-complete", handler)
  }, [])

  // ── Fetch data when brand or date range changes ────────────────────────────
  useEffect(() => {
    if (!activeBrand) return

    const isBrandOrDateChange =
      activeBrand.id !== prevBrandId.current ||
      dateRange.since !== prevSince.current  ||
      dateRange.until !== prevUntil.current

    prevBrandId.current = activeBrand.id
    prevSince.current   = dateRange.since
    prevUntil.current   = dateRange.until

    setLoading(true)
    setError(null)
    // Only clear data on brand/date change; on sync-refresh keep old data
    // visible while the new fetch runs (avoids a flash of zeros).
    if (isBrandOrDateChange) {
      setCampaigns([])
      setMetrics([])
    }

    // Always use explicit date range for now
    // TODO: Implement aggregated API integration for preset-based queries
    // When preset !== "custom", the dates come from backend calculation via sync
    const metricsPromise = get<DailyMetric[]>("/ad-metrics", {
      brand_id:    activeBrand.id,
      entity_type: "campaign",
      since:       dateRange.since,
      until:       dateRange.until,
    })

    Promise.all([
      get<Campaign[]>("/integrations/meta/campaigns", { brand_id: activeBrand.id }),
      metricsPromise,
    ])
      .then(([camps, mets]) => {
        setCampaigns(camps ?? [])
        setMetrics(mets ?? [])
      })
      .catch((err) => {
        // 404 = no Meta connection yet — show empty state instead of error
        if (err instanceof ApiError && err.status === 404) {
          setCampaigns([])
          setMetrics([])
        } else {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data")
        }
      })
      .finally(() => setLoading(false))
  }, [activeBrand, dateRange, dateFilter.preset, refreshKey])

  // ── Aggregate KPIs from metrics ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalSpend     = metrics.reduce((s, m) => s + (m.spend ?? 0),     0)
    const totalPurchases = metrics.reduce((s, m) => s + (m.purchases ?? 0), 0)
    const totalRevenue   = metrics.reduce((s, m) => s + (m.revenue ?? 0),   0)
    const avgCPP         = totalPurchases > 0 ? totalSpend / totalPurchases : 0
    const activeCamps    = campaigns.filter((c) => c.status === "ACTIVE").length

    return { totalSpend, totalPurchases, totalRevenue, avgCPP, activeCamps }
  }, [metrics, campaigns])

  // ── Per-campaign metric rollup ─────────────────────────────────────────────
  const campaignRows = useMemo(() => {
    return campaigns.map((c) => {
      const rows  = metrics.filter((m) => m.entity_id === c.id)
      const spend = rows.reduce((s, m) => s + (m.spend ?? 0),     0)
      const purch = rows.reduce((s, m) => s + (m.purchases ?? 0), 0)
      const cpp   = purch > 0 ? spend / purch : 0
      return { ...c, spend, purchases: purch, cpp }
    })
  }, [campaigns, metrics])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-medium">No brand selected</p>
        <p className="text-sm mt-1">Create a brand in Settings to get started.</p>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              title="Total Spend (Meta)"
              value={`$${fmt(kpis.totalSpend)}`}
            />
            <KpiCard
              title="Total Orders"
              value={String(kpis.totalPurchases)}
            />
            <KpiCard
              title="Revenue"
              value={`$${fmt(kpis.totalRevenue)}`}
            />
            <KpiCard
              title="Average CPP"
              value={`$${kpis.avgCPP.toFixed(2)}`}
            />
            <KpiCard
              title="Active Campaigns"
              value={String(kpis.activeCamps)}
            />
          </>
        )}
      </div>

      {/* ── Campaign Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold mb-4">Campaign Overview</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : campaignRows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">No campaigns found</p>
            <p className="text-sm mt-1">
              Connect Meta Ads in Settings and click Sync to pull your campaigns.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="pb-2">Campaign</th>
                <th className="pb-2">Spend</th>
                <th className="pb-2">Purchases</th>
                <th className="pb-2">CPP</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaignRows.map((c) => (
                <tr key={c.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3">${fmt(c.spend)}</td>
                  <td className="py-3">{c.purchases}</td>
                  <td className={`py-3 font-medium ${cppColor(c.cpp)}`}>
                    ${c.cpp.toFixed(2)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                        ${c.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"}`}
                    >
                      {c.status === "ACTIVE" ? (
                        <TrendingUp size={10} />
                      ) : (
                        <TrendingDown size={10} />
                      )}
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── KPI Card sub-component ───────────────────────────────────────────────────

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
