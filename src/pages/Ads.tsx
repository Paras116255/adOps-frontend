/**
 * Ads Performance — Tabbed view for Campaigns, Ad Sets, and Ads
 *
 * Each tab shows a flat list of entities with full metrics
 */
import { useEffect, useState } from "react"
import { Pause, Play, Loader2 } from "lucide-react"
import { useBrand } from "../context/BrandContext"
import { get, post, ApiError } from "../lib/api"
import type { Campaign, AdSet, Ad, DailyMetric } from "../lib/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function rollup(metrics: DailyMetric[], entityId: number) {
  const rows    = metrics.filter((m) => m.entity_id === entityId)
  const spend   = rows.reduce((s, m) => s + (m.spend       ?? 0), 0)
  const impr    = rows.reduce((s, m) => s + (m.impressions ?? 0), 0)
  const reach   = rows.reduce((s, m) => s + (m.reach       ?? 0), 0)
  const clicks  = rows.reduce((s, m) => s + (m.clicks      ?? 0), 0)
  const purch   = rows.reduce((s, m) => s + (m.purchases   ?? 0), 0)
  const cpp     = purch > 0 ? spend / purch : 0
  return { spend, impressions: impr, reach, clicks, purchases: purch, cpp }
}

// Sort icon component
function SortIcon({ field, currentField, direction }: { field: string; currentField: string; direction: string }) {
  if (field !== currentField) {
    return <span className="text-gray-300">⇅</span>
  }
  return direction === "asc" ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// ─── Status Toggle ───────────────────────────────────────────────────────────

interface StatusToggleProps {
  status: string
  onPause: () => void
  onEnable: () => void
  loading?: boolean
}

function StatusToggle({ status, onPause, onEnable, loading }: StatusToggleProps) {
  const isActive = status === "ACTIVE"
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        isActive ? onPause() : onEnable()
      }}
      disabled={loading}
      title={isActive ? "Pause" : "Enable"}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition
        ${isActive
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
        disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 size={10} className="animate-spin" />
      ) : isActive ? (
        <Pause size={10} />
      ) : (
        <Play size={10} />
      )}
      {isActive ? "ACTIVE" : status}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabType = "campaigns" | "adsets" | "ads"

type SortField = "name" | "spend" | "impressions" | "reach" | "clicks" | "purchases" | "cpp"
type SortDirection = "asc" | "desc"

export default function Ads() {
  const { activeBrand, dateRange } = useBrand()

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem("ads-active-tab")
    return (saved as TabType) || "campaigns"
  })
  const [refreshKey, setRefreshKey] = useState(0)

  // Sorting & Pagination with persistence
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = localStorage.getItem("ads-sort-field")
    return (saved as SortField) || "spend"
  })
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const saved = localStorage.getItem("ads-sort-direction")
    return (saved as SortDirection) || "desc"
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])

  // Metrics
  const [campaignMetrics, setCampaignMetrics] = useState<DailyMetric[]>([])
  const [adsetMetrics, setAdsetMetrics] = useState<DailyMetric[]>([])
  const [adMetrics, setAdMetrics] = useState<DailyMetric[]>([])

  // Loading states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // Status updates
  const [statusLoading, setStatusLoading] = useState<Set<string>>(new Set())
  const [campaignStatuses, setCampaignStatuses] = useState<Record<number, string>>({})
  const [adsetStatuses, setAdsetStatuses] = useState<Record<number, string>>({})
  const [adStatuses, setAdStatuses] = useState<Record<number, string>>({})
  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem("ads-active-tab", activeTab)
  }, [activeTab])

  // Persist sort settings to localStorage
  useEffect(() => {
    localStorage.setItem("ads-sort-field", sortField)
  }, [sortField])

  useEffect(() => {
    localStorage.setItem("ads-sort-direction", sortDirection)
  }, [sortDirection])

  // Re-fetch on sync complete
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1)
    window.addEventListener("adops:sync-complete", handler)
    return () => window.removeEventListener("adops:sync-complete", handler)
  }, [])

  // Fetch data based on active tab
  useEffect(() => {
    if (!activeBrand) return

    setLoading(true)
    setError(null)
    setWarning(null)

    const fetchData = async () => {
      try {
        switch (activeTab) {
          case "campaigns":
            const [camps, campMets] = await Promise.all([
              get<Campaign[]>("/integrations/meta/campaigns", { brand_id: activeBrand.id }),
              get<DailyMetric[]>("/ad-metrics", {
                brand_id: activeBrand.id,
                entity_type: "campaign",
                since: dateRange.since,
                until: dateRange.until,
              }),
            ])
            setCampaigns(camps ?? [])
            setCampaignMetrics(campMets ?? [])
            break

          case "adsets":
            // Fetch all adsets in a single efficient API call
            const [allAdsets, adsetMets] = await Promise.all([
              get<AdSet[]>("/integrations/meta/adsets", { brand_id: activeBrand.id }),
              get<DailyMetric[]>("/ad-metrics", {
                brand_id: activeBrand.id,
                entity_type: "adset",
                since: dateRange.since,
                until: dateRange.until,
              }),
            ])

            setAdsets(allAdsets ?? [])
            setAdsetMetrics(adsetMets ?? [])
            break

          case "ads":
            // Fetch all ads in a single efficient API call
            const [allAds, adMets] = await Promise.all([
              get<Ad[]>("/integrations/meta/ads", { brand_id: activeBrand.id }),
              get<DailyMetric[]>("/ad-metrics", {
                brand_id: activeBrand.id,
                entity_type: "ad",
                since: dateRange.since,
                until: dateRange.until,
              }),
            ])

            setAds(allAds ?? [])
            setAdMetrics(adMets ?? [])

            // Warn if ads count doesn't match expectations and provide breakdown
            const adsWithMetrics = new Set(adMets?.map(m => m.entity_id) ?? [])
            const adsWithoutMetrics = (allAds ?? []).filter(a => !adsWithMetrics.has(a.id))
            if (adsWithoutMetrics.length > 0 && (allAds ?? []).length > 0) {
              const percentMissing = Math.round((adsWithoutMetrics.length / (allAds ?? []).length) * 100)
              if (percentMissing > 10) {
                const activeNoMetrics = adsWithoutMetrics.filter(a => a.status === "ACTIVE").length
                const pausedNoMetrics = adsWithoutMetrics.filter(a => a.status === "PAUSED").length
                const otherNoMetrics = adsWithoutMetrics.length - activeNoMetrics - pausedNoMetrics

                setWarning(
                  `${adsWithoutMetrics.length} of ${(allAds ?? []).length} ads (${percentMissing}%) have no metrics for the selected date range. ` +
                  `Breakdown: ${activeNoMetrics} ACTIVE, ${pausedNoMetrics} PAUSED` +
                  (otherNoMetrics > 0 ? `, ${otherNoMetrics} other` : '') +
                  `. These ads had no activity during this period.`
                )
              }
            }
            break
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // No Meta connection yet
        } else {
          setError(err instanceof Error ? err.message : "Failed to load data")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeBrand, dateRange, activeTab, refreshKey])

  // Status handlers
  async function handleCampaignStatus(campaign: Campaign, action: "pause" | "enable") {
    if (!activeBrand) return
    const key = `camp_${campaign.id}`
    setStatusLoading((prev) => new Set(prev).add(key))

    const prev = campaignStatuses[campaign.id] ?? campaign.status
    const next = action === "pause" ? "PAUSED" : "ACTIVE"

    setCampaignStatuses((s) => ({ ...s, [campaign.id]: next }))
    try {
      await post(
        `/integrations/meta/campaigns/${campaign.meta_campaign_id}/${action}`,
        null,
        { brand_id: activeBrand.id }
      )
    } catch {
      setCampaignStatuses((s) => ({ ...s, [campaign.id]: prev }))
    } finally {
      setStatusLoading((p) => { const n = new Set(p); n.delete(key); return n })
    }
  }

  async function handleAdsetStatus(adset: AdSet, action: "pause" | "enable") {
    if (!activeBrand) return
    const key = `adset_${adset.id}`
    setStatusLoading((prev) => new Set(prev).add(key))

    const prev = adsetStatuses[adset.id] ?? adset.status
    const next = action === "pause" ? "PAUSED" : "ACTIVE"

    setAdsetStatuses((s) => ({ ...s, [adset.id]: next }))
    try {
      await post(
        `/integrations/meta/adsets/${adset.meta_adset_id}/${action}`,
        null,
        { brand_id: activeBrand.id }
      )
    } catch {
      setAdsetStatuses((s) => ({ ...s, [adset.id]: prev }))
    } finally {
      setStatusLoading((p) => { const n = new Set(p); n.delete(key); return n })
    }
  }

  async function handleAdStatus(ad: Ad, action: "pause" | "enable") {
    if (!activeBrand) return
    const key = `ad_${ad.id}`
    setStatusLoading((prev) => new Set(prev).add(key))

    const prev = adStatuses[ad.id] ?? ad.status
    const next = action === "pause" ? "PAUSED" : "ACTIVE"

    setAdStatuses((s) => ({ ...s, [ad.id]: next }))
    try {
      await post(
        `/integrations/meta/ads/${ad.meta_ad_id}/${action}`,
        null,
        { brand_id: activeBrand.id }
      )
    } catch {
      setAdStatuses((s) => ({ ...s, [ad.id]: prev }))
    } finally {
      setStatusLoading((p) => { const n = new Set(p); n.delete(key); return n })
    }
  }

  // Sorting handler
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
    setCurrentPage(1) // Reset to first page on sort
  }

  // Get sorted and paginated data
  function getSortedData() {
    let data: Array<{ name: string; id: number; metrics: ReturnType<typeof rollup> }>

    if (activeTab === "campaigns") {
      data = campaigns.map(c => ({ name: c.name, id: c.id, metrics: rollup(campaignMetrics, c.id) }))
    } else if (activeTab === "adsets") {
      data = adsets.map(a => ({ name: a.name, id: a.id, metrics: rollup(adsetMetrics, a.id) }))
    } else {
      data = ads.map(a => ({ name: a.name, id: a.id, metrics: rollup(adMetrics, a.id) }))
    }

    // Sort
    data.sort((a, b) => {
      let aVal: number | string, bVal: number | string
      if (sortField === "name") {
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
      } else {
        aVal = a.metrics[sortField]
        bVal = b.metrics[sortField]
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return data
  }

  const sortedData = getSortedData()
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Empty / error states
  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-medium">No brand selected</p>
        <p className="text-sm mt-1">Create a brand in Settings to get started.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm">
        {error}
      </div>
    )
  }

  // Show warning banner for partial data
  const WarningBanner = warning ? (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm mb-4 flex items-start gap-2">
      <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div>
        <span className="font-medium">Partial Data:</span> {warning}
      </div>
    </div>
  ) : null

  // Render
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ads Performance</h1>

      {/* Warning Banner */}
      {WarningBanner}

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "campaigns" as TabType, label: "Campaigns", count: campaigns.length },
            { id: "adsets" as TabType, label: "Ad Sets", count: adsets.length },
            { id: "ads" as TabType, label: "Ads", count: ads.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1) // Reset to first page on tab change
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition
                ${activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Summary Cards */}
      {!loading && (activeTab === "campaigns" ? campaigns.length > 0 : activeTab === "adsets" ? adsets.length > 0 : ads.length > 0) && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total {activeTab === "campaigns" ? "Campaigns" : activeTab === "adsets" ? "Ad Sets" : "Ads"}</div>
            <div className="text-2xl font-bold text-gray-900">
              {activeTab === "campaigns" ? campaigns.length : activeTab === "adsets" ? adsets.length : ads.length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600">
              {activeTab === "campaigns"
                ? campaigns.filter(c => (campaignStatuses[c.id] ?? c.status) === "ACTIVE").length
                : activeTab === "adsets"
                ? adsets.filter(a => (adsetStatuses[a.id] ?? a.status) === "ACTIVE").length
                : ads.filter(a => (adStatuses[a.id] ?? a.status) === "ACTIVE").length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Paused</div>
            <div className="text-2xl font-bold text-orange-600">
              {activeTab === "campaigns"
                ? campaigns.filter(c => (campaignStatuses[c.id] ?? c.status) === "PAUSED").length
                : activeTab === "adsets"
                ? adsets.filter(a => (adsetStatuses[a.id] ?? a.status) === "PAUSED").length
                : ads.filter(a => (adStatuses[a.id] ?? a.status) === "PAUSED").length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total Spend</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(activeTab === "campaigns"
                ? campaigns.reduce((sum, c) => sum + rollup(campaignMetrics, c.id).spend, 0)
                : activeTab === "adsets"
                ? adsets.reduce((sum, a) => sum + rollup(adsetMetrics, a.id).spend, 0)
                : ads.reduce((sum, a) => sum + rollup(adMetrics, a.id).spend, 0)
              ).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-auto max-h-[600px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b text-xs font-medium uppercase tracking-wide sticky top-0 z-10">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Name
                  <SortIcon field="name" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              {activeTab === "ads" && <th className="px-4 py-3 w-20">Preview</th>}
              <th
                className="px-4 py-3 w-24 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("spend")}
              >
                <div className="flex items-center gap-2">
                  Amount Spent
                  <SortIcon field="spend" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 w-20 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("impressions")}
              >
                <div className="flex items-center gap-2">
                  Impressions
                  <SortIcon field="impressions" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 w-20 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("reach")}
                title="Unique people who saw your ads"
              >
                <div className="flex items-center gap-2">
                  Reach
                  <SortIcon field="reach" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 w-20 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("clicks")}
              >
                <div className="flex items-center gap-2">
                  Clicks
                  <SortIcon field="clicks" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 w-20 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("purchases")}
              >
                <div className="flex items-center gap-2">
                  Results
                  <SortIcon field="purchases" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 w-24 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort("cpp")}
              >
                <div className="flex items-center gap-2">
                  Cost per Result
                  <SortIcon field="cpp" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="px-4 py-3 w-28">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  {activeTab === "ads" && <td className="px-4 py-3"><Skeleton className="h-12 w-12 rounded" /></td>}
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))
            ) : activeTab === "campaigns" && campaigns.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400">
                  <p className="font-medium">No campaigns found</p>
                  <p className="text-xs mt-1">Connect Meta Ads in Settings and click Sync.</p>
                </td>
              </tr>
            ) : activeTab === "adsets" && adsets.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400">
                  <p className="font-medium">No ad sets found</p>
                  <p className="text-xs mt-1">Sync your campaigns first.</p>
                </td>
              </tr>
            ) : activeTab === "ads" && ads.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-400">
                  <p className="font-medium">No ads found</p>
                  <p className="text-xs mt-1">Sync your campaigns first.</p>
                </td>
              </tr>
            ) : (
              <>
                {activeTab === "campaigns" && paginatedData.map((item) => {
                  const campaign = campaigns.find(c => c.id === item.id)!
                  const status = campaignStatuses[campaign.id] ?? campaign.status
                  const key = `camp_${campaign.id}`

                  return (
                    <tr key={campaign.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium">{campaign.name}</td>
                      <td className="px-4 py-3">${fmt(item.metrics.spend)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.impressions)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.reach)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.clicks)}</td>
                      <td className="px-4 py-3">{item.metrics.purchases}</td>
                      <td className={`px-4 py-3 font-medium ${cppColor(item.metrics.cpp)}`}>
                        ${item.metrics.cpp.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusToggle
                          status={status}
                          loading={statusLoading.has(key)}
                          onPause={() => handleCampaignStatus(campaign, "pause")}
                          onEnable={() => handleCampaignStatus(campaign, "enable")}
                        />
                      </td>
                    </tr>
                  )
                })}

                {activeTab === "adsets" && paginatedData.map((item) => {
                  const adset = adsets.find(a => a.id === item.id)!
                  const status = adsetStatuses[adset.id] ?? adset.status
                  const key = `adset_${adset.id}`

                  return (
                    <tr key={adset.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium">{adset.name}</td>
                      <td className="px-4 py-3">${fmt(item.metrics.spend)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.impressions)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.reach)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.clicks)}</td>
                      <td className="px-4 py-3">{item.metrics.purchases}</td>
                      <td className={`px-4 py-3 font-medium ${cppColor(item.metrics.cpp)}`}>
                        ${item.metrics.cpp.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusToggle
                          status={status}
                          loading={statusLoading.has(key)}
                          onPause={() => handleAdsetStatus(adset, "pause")}
                          onEnable={() => handleAdsetStatus(adset, "enable")}
                        />
                      </td>
                    </tr>
                  )
                })}

                {activeTab === "ads" && paginatedData.map((item) => {
                  const ad = ads.find(a => a.id === item.id)!
                  const status = adStatuses[ad.id] ?? ad.status
                  const key = `ad_${ad.id}`
                  // Determine preview image/thumbnail
                  const previewUrl = ad.thumbnail_url || ad.image_url
                  const isVideo = ad.creative_type === "VIDEO"
                  // Check if ad has any metrics
                  const hasMetrics = item.metrics.spend > 0 || item.metrics.impressions > 0 || item.metrics.clicks > 0
                  const rowClass = hasMetrics
                    ? "border-t hover:bg-gray-50 transition"
                    : "border-t hover:bg-orange-50 transition bg-orange-50/30 border-l-4 border-l-orange-400"

                  return (
                    <tr key={ad.id} className={rowClass}>
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        {!hasMetrics && (
                          <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <title>No activity in selected date range</title>
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span>
                          {ad.name}
                          {!hasMetrics && (
                            <span className="ml-2 text-xs text-orange-600 font-medium">(No Activity)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {previewUrl ? (
                          <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100">
                            <img
                              src={previewUrl}
                              alt={ad.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback on image load error
                                e.currentTarget.style.display = "none"
                                e.currentTarget.parentElement!.classList.add("flex", "items-center", "justify-center")
                                e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-gray-400">No preview</span>'
                              }}
                            />
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">—</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">${fmt(item.metrics.spend)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.impressions)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.reach)}</td>
                      <td className="px-4 py-3">{fmt(item.metrics.clicks)}</td>
                      <td className="px-4 py-3">{item.metrics.purchases}</td>
                      <td className={`px-4 py-3 font-medium ${cppColor(item.metrics.cpp)}`}>
                        ${item.metrics.cpp.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusToggle
                          status={status}
                          loading={statusLoading.has(key)}
                          onPause={() => handleAdStatus(ad, "pause")}
                          onEnable={() => handleAdStatus(ad, "enable")}
                        />
                      </td>
                    </tr>
                  )
                })}
              </>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
