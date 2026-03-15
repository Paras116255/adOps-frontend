import { useState, useEffect, type FormEvent } from "react"
import { CheckCircle, XCircle, Link2, Unlink, Plus, DollarSign } from "lucide-react"
import Toggle from "../components/ui/Toggle"
import { useBrand } from "../context/BrandContext"
import { useToast } from "../context/ToastContext"
import { get, put, del, post } from "../lib/api"
import type { MetaConnection, NotificationSettings, AutomationRule } from "../lib/types"

// ─── Brand creation ───────────────────────────────────────────────────────────

function CreateBrandForm({ onCreated }: { onCreated: () => void }) {
  const { addToast } = useToast()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await post("/brands", { name: name.trim(), timezone: "UTC", currency: "USD" })
      setName("")
      addToast(`Brand "${name.trim()}" created`, "success")
      onCreated()
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to create brand", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Brand name"
        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm
                   hover:bg-blue-700 transition disabled:opacity-50"
      >
        <Plus size={14} />
        {loading ? "Creating…" : "Create"}
      </button>
    </form>
  )
}

// ─── Meta Connection section ──────────────────────────────────────────────────

function MetaConnectionSection() {
  const { activeBrand, refetchBrands } = useBrand()
  const { addToast } = useToast()
  const [conn,          setConn]          = useState<MetaConnection | null>(null)
  const [connLoading,   setConnLoading]   = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (!activeBrand) return
    setConnLoading(true)
    get<MetaConnection>("/integrations/meta/connection", { brand_id: activeBrand.id })
      .then(setConn)
      .catch(() => setConn(null))
      .finally(() => setConnLoading(false))
  }, [activeBrand])

  async function handleConnect() {
    if (!activeBrand) return
    try {
      const state = Math.random().toString(36).slice(2)
      sessionStorage.setItem("meta_oauth_state", state)
      sessionStorage.setItem("meta_oauth_brand_id", String(activeBrand.id))
      const res = await get<{ url: string }>("/integrations/meta/connect", {
        brand_id: activeBrand.id,
        state,
      })
      window.location.href = res.url
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Could not get OAuth URL", "error")
    }
  }

  async function handleDisconnect() {
    if (!activeBrand || disconnecting) return
    setDisconnecting(true)
    try {
      await del("/integrations/meta/disconnect", { brand_id: activeBrand.id })
      setConn(null)
      refetchBrands()
      addToast("Meta Ads disconnected", "info")
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Disconnect failed", "error")
    } finally {
      setDisconnecting(false)
    }
  }

  if (!activeBrand) {
    return <p className="text-sm text-gray-400">Select or create a brand first.</p>
  }

  return (
    <div>
      {connLoading ? (
        <div className="animate-pulse h-10 bg-gray-100 rounded-lg" />
      ) : conn ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
            <CheckCircle size={16} />
            Connected
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div><span className="text-gray-400">Ad Account:</span> {conn.ad_account_id}</div>
            <div>
              <span className="text-gray-400">Connected:</span>{" "}
              {new Date(conn.connected_at).toLocaleString()}
            </div>
            {conn.synced_at && (
              <div>
                <span className="text-gray-400">Last synced:</span>{" "}
                {new Date(conn.synced_at).toLocaleString()}
              </div>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-1.5
                       rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-50"
          >
            <Unlink size={14} />
            {disconnecting ? "Disconnecting…" : "Disconnect Meta Ads"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <XCircle size={16} />
            Not connected
          </div>
          <p className="text-xs text-gray-400">
            Connect your Meta Ads account to start syncing campaigns and metrics.
          </p>
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2
                       rounded-lg text-sm hover:bg-blue-700 transition"
          >
            <Link2 size={14} />
            Connect Meta Ads
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Notification Settings section ───────────────────────────────────────────

function NotificationSection() {
  const { activeBrand } = useBrand()
  const { addToast } = useToast()
  const [settings, setSettings] = useState<NotificationSettings>({
    telegram_enabled: false,
    telegram_chat_id: "",
    email_enabled: false,
  })
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!activeBrand) return
    setLoading(true)
    get<NotificationSettings>("/automation/notifications", { brand_id: activeBrand.id })
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeBrand])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!activeBrand) return
    setSaving(true)
    try {
      const updated = await put<NotificationSettings>(
        "/automation/notifications",
        settings,
        { brand_id: activeBrand.id },
      )
      setSettings(updated)
      addToast("Notification settings saved", "success")
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to save", "error")
    } finally {
      setSaving(false)
    }
  }

  if (!activeBrand) return null

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-100 rounded w-48" />
          <div className="h-6 bg-gray-100 rounded w-64" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium">Telegram alerts</span>
              <p className="text-xs text-gray-400">Send alert notifications to a Telegram group</p>
            </div>
            <Toggle
              enabled={settings.telegram_enabled}
              onChange={() => setSettings((s) => ({ ...s, telegram_enabled: !s.telegram_enabled }))}
            />
          </div>

          {settings.telegram_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={settings.telegram_chat_id}
                onChange={(e) => setSettings((s) => ({ ...s, telegram_chat_id: e.target.value }))}
                placeholder="-100123456789"
                className="w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Add the bot to a group, get the group ID, paste it here.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm
                       hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </>
      )}
    </form>
  )
}

// ─── CPP Threshold section ────────────────────────────────────────────────────

/**
 * CPP (Cost Per Purchase) Threshold — creates or updates an automation rule
 * that fires an alert when CPA (cost per acquisition) exceeds the threshold.
 *
 * Rule shape: metric=cpa, condition=greater_than, action=alert, severity=warning
 * Rule name: "CPP Threshold Alert" (used to identify and update it)
 */
const CPP_RULE_NAME = "CPP Threshold Alert"

function CppThresholdSection() {
  const { activeBrand } = useBrand()
  const { addToast } = useToast()

  const [threshold, setThreshold] = useState<string>("")
  const [existingRule, setExistingRule] = useState<AutomationRule | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  // Fetch existing rules and find the CPP threshold rule
  useEffect(() => {
    if (!activeBrand) return
    setLoading(true)
    get<AutomationRule[]>("/automation/rules", { brand_id: activeBrand.id })
      .then((rules) => {
        const rule = rules.find((r) => r.name === CPP_RULE_NAME) ?? null
        setExistingRule(rule)
        if (rule) setThreshold(String(rule.threshold))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeBrand])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!activeBrand) return
    const value = parseFloat(threshold)
    if (isNaN(value) || value <= 0) {
      addToast("Enter a valid threshold greater than 0", "error")
      return
    }
    setSaving(true)
    try {
      if (existingRule) {
        // Update existing rule
        await put<AutomationRule>(
          `/automation/rules/${existingRule.id}`,
          { threshold: value },
        )
        setExistingRule((r) => r ? { ...r, threshold: value } : r)
      } else {
        // Create new rule
        const created = await post<AutomationRule>(
          "/automation/rules",
          {
            name:      CPP_RULE_NAME,
            metric:    "cpa",
            condition: "greater_than",
            threshold: value,
            action:    "alert",
            severity:  "warning",
          },
          { brand_id: activeBrand.id },
        )
        setExistingRule(created)
      }
      addToast("CPP threshold saved", "success")
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to save threshold", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!existingRule) return
    setSaving(true)
    try {
      await del(`/automation/rules/${existingRule.id}`)
      setExistingRule(null)
      setThreshold("")
      addToast("CPP threshold rule removed", "info")
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to remove rule", "error")
    } finally {
      setSaving(false)
    }
  }

  if (!activeBrand) return null

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">
        Receive an alert when Cost Per Purchase (CPA) exceeds this amount.
        Color guide: ≤ $60 green · ≤ $100 yellow · &gt; $100 red.
      </p>

      {loading ? (
        <div className="animate-pulse h-10 bg-gray-100 rounded-lg w-48" />
      ) : (
        <form onSubmit={handleSave} className="flex items-center gap-3">
          <div className="relative">
            <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="1"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 80"
              className="border rounded-lg pl-7 pr-3 py-2 text-sm w-32
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={!threshold || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm
                       hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : existingRule ? "Update" : "Set Threshold"}
          </button>
          {existingRule && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="text-sm text-red-500 hover:text-red-700 transition disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </form>
      )}

      {existingRule && (
        <p className="text-xs text-gray-400 mt-2">
          Active rule: alert when CPA &gt; ${existingRule.threshold}
        </p>
      )}
    </div>
  )
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const { brands, activeBrand, refetchBrands } = useBrand()
  const [showCreateBrand, setShowCreateBrand] = useState(false)

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ── Brand Management ───────────────────────────────────────────── */}
      <section className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="font-semibold mb-1">Brand</h2>
        <p className="text-xs text-gray-400 mb-4">
          Active brand: <span className="font-medium text-gray-700">{activeBrand?.name ?? "None"}</span>
          {activeBrand && (
            <span className="ml-2 text-gray-400">
              (currency: {activeBrand.currency}, tz: {activeBrand.timezone})
            </span>
          )}
        </p>

        {brands.length === 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            No brands yet. Create one to get started.
          </p>
        )}

        <button
          onClick={() => setShowCreateBrand((v) => !v)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus size={13} />
          {showCreateBrand ? "Cancel" : "Create new brand"}
        </button>

        {showCreateBrand && (
          <CreateBrandForm
            onCreated={() => {
              refetchBrands()
              setShowCreateBrand(false)
            }}
          />
        )}
      </section>

      {/* ── Meta Ads Connection ─────────────────────────────────────────── */}
      <section className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="font-semibold mb-1">Meta Ads Connection</h2>
        <p className="text-xs text-gray-400 mb-4">
          Connect your Facebook / Instagram ad account to sync campaigns and metrics automatically.
        </p>
        <MetaConnectionSection />
      </section>

      {/* ── CPP Threshold ───────────────────────────────────────────────── */}
      <section className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="font-semibold mb-1">CPP Alert Threshold</h2>
        <CppThresholdSection />
      </section>

      {/* ── Notifications ───────────────────────────────────────────────── */}
      <section className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="font-semibold mb-1">Notifications</h2>
        <p className="text-xs text-gray-400 mb-4">
          Alert delivery settings for automation rules.
        </p>
        <NotificationSection />
      </section>
    </div>
  )
}
