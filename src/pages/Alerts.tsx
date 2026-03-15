import { useEffect, useState } from "react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import Badge from "../components/ui/Badge"
import { useBrand } from "../context/BrandContext"
import { get } from "../lib/api"
import type { AlertHistory, RuleSeverity } from "../lib/types"

dayjs.extend(relativeTime)

// severity → Badge type
function badgeType(severity: RuleSeverity): "danger" | "warning" | "info" {
  if (severity === "critical") return "danger"
  if (severity === "warning")  return "warning"
  return "info"
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function Alerts() {
  const { activeBrand } = useBrand()

  const [alerts,  setAlerts]  = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!activeBrand) return
    setLoading(true)
    setError(null)
    get<AlertHistory[]>("/automation/alerts", { brand_id: activeBrand.id })
      .then((data) => setAlerts(data ?? []))
      .catch((err) => setError(err.message ?? "Failed to load alerts"))
      .finally(() => setLoading(false))
  }, [activeBrand])

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-medium">No brand selected</p>
        <p className="text-sm mt-1">Create a brand in Settings to get started.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alerts &amp; Logs</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center border-b pb-4 last:border-none last:pb-0">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">No alerts yet</p>
            <p className="text-sm mt-1">Alerts will appear here when automation rules are triggered.</p>
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className="flex justify-between items-start border-b py-4 last:border-none last:pb-0 gap-4"
            >
              {/* Left: entity + rule info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {a.entity_name} — <span className="text-gray-500">{a.rule_name}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.metric.toUpperCase()} = {(a.actual_value ?? 0).toFixed(2)} (threshold: {a.threshold ?? 0})
                  {a.message && <span className="ml-2">· {a.message}</span>}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {dayjs(a.triggered_at).fromNow()}
                </p>
              </div>

              {/* Right: severity badge */}
              <div className="flex-shrink-0">
                <Badge type={badgeType(a.severity)}>{a.severity}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
