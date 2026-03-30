import { useState, useEffect, useRef } from "react"
import { Calendar, RefreshCw, LogOut, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useBrand, type DatePreset } from "../../context/BrandContext"
import { useAuth } from "../../context/AuthContext"
import { get, post } from "../../lib/api"
import type { MetaConnection } from "../../lib/types"

dayjs.extend(relativeTime)

// ─── Date range presets ───────────────────────────────────────────────────────
// These now match the backend presets exactly, ensuring data accuracy with Meta Ads Manager

const PRESETS: Array<{ label: string; preset: DatePreset }> = [
  { label: "Today",         preset: "today" },
  { label: "Yesterday",     preset: "yesterday" },
  { label: "Last 7 days",   preset: "last_7_days" },
  { label: "Last 14 days",  preset: "last_14_days" },
  { label: "Last 30 days",  preset: "last_30_days" },
  { label: "Last 90 days",  preset: "last_90_days" },
  { label: "This month",    preset: "this_month" },
  { label: "Last month",    preset: "last_month" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Topbar() {
  const { brands, activeBrand, dateRange, dateFilter, setActiveBrand, setDateRange, setPreset } = useBrand()
  const { logout } = useAuth()

  const [brandOpen, setBrandOpen] = useState(false)
  const [dateOpen,  setDateOpen]  = useState(false)
  const [syncing,   setSyncing]   = useState(false)
  const [syncedAt,  setSyncedAt]  = useState<string | null>(null)
  const [syncError, setSyncError] = useState(false)

  const brandRef = useRef<HTMLDivElement>(null)
  const dateRef  = useRef<HTMLDivElement>(null)

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false)
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  // ── Fetch Meta connection status when active brand changes ───────────────────
  useEffect(() => {
    if (!activeBrand) return
    get<MetaConnection>(`/integrations/meta/connection`, { brand_id: activeBrand.id })
      .then((conn) => setSyncedAt(conn.synced_at))
      .catch(() => setSyncedAt(null))
  }, [activeBrand])

  // ── Background polling for sync status (every 30 seconds) ────────────────────
  useEffect(() => {
    if (!activeBrand) return

    const intervalId = setInterval(async () => {
      try {
        const conn = await get<MetaConnection>("/integrations/meta/connection", { brand_id: activeBrand.id })
        // If synced_at changed, update state and notify other components
        if (conn.synced_at !== syncedAt) {
          setSyncedAt(conn.synced_at)
          // Dispatch event so Ads page can reload data automatically
          window.dispatchEvent(new Event("adops:sync-complete"))
        }
      } catch {
        // Silently fail - connection might be unavailable
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(intervalId)
  }, [activeBrand, syncedAt])

  // ── Trigger a manual sync ────────────────────────────────────────────────────
  async function handleSync() {
    if (!activeBrand || syncing) return
    setSyncing(true)
    setSyncError(false)
    try {
      // Fire campaigns + metrics in parallel. Metrics use the current date range
      // so the dashboard reflects whatever window the user has selected.
      await Promise.all([
        post("/integrations/meta/sync", undefined, { brand_id: activeBrand.id }),
        post("/ad-metrics/sync/range", undefined, {
          brand_id: activeBrand.id,
          since:    dateRange.since,
          until:    dateRange.until,
        }),
      ])
      // Refresh sync timestamp + notify pages to reload their data.
      // Both syncs run through the queue asynchronously; 15 s gives the
      // campaign consumer (300 ms pacing × N ad sets) enough time to finish
      // before the dashboard re-fetches metrics.
      setTimeout(() => {
        get<MetaConnection>("/integrations/meta/connection", { brand_id: activeBrand.id })
          .then((conn) => setSyncedAt(conn.synced_at))
          .catch(() => {})
        window.dispatchEvent(new Event("adops:sync-complete"))
      }, 15_000)
    } catch {
      setSyncError(true)
    } finally {
      setSyncing(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const dateLabel = dateFilter.preset === "custom"
    ? `${dayjs(dateRange.since).format("MMM D")} – ${dayjs(dateRange.until).format("MMM D, YYYY")}`
    : PRESETS.find(p => p.preset === dateFilter.preset)?.label || "Custom"

  const syncLabel = syncedAt
    ? `Synced ${dayjs(syncedAt).fromNow()}`
    : "Not synced"

  return (
    <div className="bg-white border-b px-6 py-3 flex justify-between items-center gap-4">

      {/* ── Left: brand selector ─────────────────────────────────────────── */}
      <div className="relative" ref={brandRef}>
        <button
          onClick={() => setBrandOpen((o) => !o)}
          className="flex items-center gap-2 border px-4 py-1.5 rounded-lg bg-gray-50
                     hover:bg-gray-100 transition text-sm font-medium"
        >
          {activeBrand ? activeBrand.name : "Select brand"}
          <ChevronDown size={14} className={`transition-transform ${brandOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {brandOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 bg-white shadow-lg border rounded-lg mt-1 w-48 py-1"
            >
              {brands.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-400">No brands yet</div>
              ) : (
                brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setActiveBrand(b); setBrandOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition
                                ${activeBrand?.id === b.id ? "font-semibold text-blue-600" : "text-gray-700"}`}
                  >
                    {b.name}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: date range + sync status + sync button + logout ─────── */}
      <div className="flex items-center gap-3">

        {/* Date range picker */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setDateOpen((o) => !o)}
            className="flex items-center gap-2 border px-3 py-1.5 rounded-lg bg-gray-50
                       hover:bg-gray-100 transition text-sm"
          >
            <Calendar size={14} />
            {dateLabel}
          </button>

          <AnimatePresence>
            {dateOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 bg-white shadow-lg border rounded-lg mt-1 w-56 py-1"
              >
                {PRESETS.map((p, idx) => {
                  const active = dateFilter.preset === p.preset
                  return (
                    <button
                      key={idx}
                      onClick={() => { setPreset(p.preset); setDateOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition
                                  ${active ? "font-semibold text-blue-600" : "text-gray-700"}`}
                    >
                      {p.label}
                    </button>
                  )
                })}

                {/* Custom range inputs */}
                <div className="border-t mx-2 my-1" />
                <div className="px-4 py-2 space-y-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">Custom Range</div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">From</label>
                    <input
                      type="date"
                      value={dateRange.since}
                      max={dateRange.until}
                      onChange={(e) => {
                        // Switching to custom preset when manually adjusting dates
                        setDateRange({ ...dateRange, since: e.target.value })
                      }}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">To</label>
                    <input
                      type="date"
                      value={dateRange.until}
                      min={dateRange.since}
                      max={dayjs().subtract(1, "day").format("YYYY-MM-DD")}
                      onChange={(e) => {
                        // Switching to custom preset when manually adjusting dates
                        setDateRange({ ...dateRange, until: e.target.value })
                      }}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <button
                    onClick={() => setDateOpen(false)}
                    className="w-full bg-blue-600 text-white rounded py-1 text-xs font-medium hover:bg-blue-700 transition"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sync status */}
        <span className={`text-xs ${syncError ? "text-red-500" : "text-green-600"}`}>
          {syncError ? "Sync failed" : syncLabel}
        </span>

        {/* Sync Now button */}
        <button
          onClick={handleSync}
          disabled={syncing || !activeBrand}
          title="Sync campaigns & metrics"
          className="flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm
                     hover:bg-gray-50 transition disabled:opacity-40"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync"}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 text-gray-500 hover:text-red-600
                     border px-3 py-1.5 rounded-lg text-sm hover:bg-red-50 transition"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  )
}
