/**
 * MetaCallback — handles the OAuth redirect from Meta (2-phase flow).
 *
 * Phase 1 (auto):  GET /integrations/meta/exchange?code=...
 *                  → { temp_key, accounts[] }
 *                  → user picks an ad account
 *
 * Phase 2 (user):  GET /integrations/meta/callback?brand_id=...&temp_key=...&ad_account_id=...
 *                  → connection saved → redirect to Settings
 *
 * The brand_id is persisted in sessionStorage by Settings.tsx before the OAuth redirect.
 */
import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CheckCircle, AlertCircle, Loader2, Building2 } from "lucide-react"
import { get } from "../lib/api"
import type { MetaAdAccount } from "../lib/types"

interface ExchangeResponse {
  temp_key: string
  accounts: MetaAdAccount[]
}

interface CallbackResponse {
  connection_id: number
  ad_account_id: string
  connected_at: string
}

export default function MetaCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const code    = params.get("code")
  const brandId = sessionStorage.getItem("meta_oauth_brand_id")

  // Phase-1 state
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([])
  const [tempKey,  setTempKey]  = useState<string | null>(null)
  const [phase1Loading, setPhase1Loading] = useState(true)

  // Phase-2 state
  const [connecting, setConnecting]     = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  // Shared state
  const [error, setError] = useState<string | null>(null)
  const [done,  setDone]  = useState(false)

  // Manual entry fallback (when no accounts returned)
  const [manualId, setManualId] = useState("")

  // Prevent double-firing in React Strict Mode
  const exchanged = useRef(false)

  // ── Phase 1: exchange code → get temp_key + accounts ─────────────────────
  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    if (!code || !brandId) {
      setError("Missing OAuth code or brand ID. Please try connecting again.")
      setPhase1Loading(false)
      return
    }

    get<ExchangeResponse>("/integrations/meta/exchange", { code })
      .then((res) => {
        setTempKey(res.temp_key)
        setAccounts(res.accounts ?? [])
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to exchange OAuth code with Meta."
        setError(msg)
      })
      .finally(() => setPhase1Loading(false))
  }, [code, brandId])

  // ── Phase 2: finalize connection with selected ad account ─────────────────
  async function handleSelectAccount(adAccountId: string) {
    if (!brandId || !tempKey || connecting) return
    setConnecting(true)
    setSelectedId(adAccountId)
    setError(null)
    try {
      await get<CallbackResponse>("/integrations/meta/callback", {
        brand_id:      Number(brandId),
        temp_key:      tempKey,
        ad_account_id: adAccountId,
      })
      sessionStorage.removeItem("meta_oauth_state")
      sessionStorage.removeItem("meta_oauth_brand_id")
      setDone(true)
      setTimeout(() => navigate("/settings"), 1800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed. Please try again."
      setError(msg)
      setConnecting(false)
      setSelectedId(null)
    }
  }

  // ── No OAuth code in URL ──────────────────────────────────────────────────
  if (!code) {
    return (
      <Shell>
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">Connection Failed</h2>
        <p className="text-sm text-gray-500 mb-4">No OAuth code received from Meta.</p>
        <button onClick={() => navigate("/settings")} className="text-blue-600 text-sm hover:underline">
          Back to Settings
        </button>
      </Shell>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <Shell>
        <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">Meta Ads Connected!</h2>
        <p className="text-sm text-gray-500">Redirecting to Settings…</p>
      </Shell>
    )
  }

  // ── Phase 1: exchanging code ──────────────────────────────────────────────
  if (phase1Loading) {
    return (
      <Shell>
        <Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="font-semibold mb-1">Connecting to Meta…</h2>
        <p className="text-sm text-gray-400">Exchanging your authorization code.</p>
      </Shell>
    )
  }

  // ── Phase 1 error ─────────────────────────────────────────────────────────
  if (error && !tempKey) {
    return (
      <Shell>
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">Authorization Failed</h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={() => navigate("/settings")} className="text-blue-600 text-sm hover:underline">
          Back to Settings
        </button>
      </Shell>
    )
  }

  // ── Phase 2: pick an ad account ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-1">
          <Building2 size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold">Select Ad Account</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-9">
          Choose which Meta ad account to connect to this brand.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {accounts.length > 0 ? (
          /* ── Account picker ── */
          <div className="space-y-2">
            {accounts.map((acc) => {
              const isSelected = selectedId === acc.id
              return (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.id)}
                  disabled={connecting}
                  className={`w-full text-left border rounded-xl px-4 py-3 transition
                    disabled:opacity-60
                    ${isSelected
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
                      : "hover:border-blue-400 hover:bg-blue-50"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{acc.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {acc.id} &middot; {acc.currency}
                        {acc.account_status === 1 && (
                          <span className="ml-2 text-green-500 font-medium">Active</span>
                        )}
                        {acc.account_status !== 1 && (
                          <span className="ml-2 text-yellow-500 font-medium">Status {acc.account_status}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && connecting && (
                      <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* ── Manual entry fallback (no accounts returned) ── */
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              No ad accounts were found on this Meta profile. Enter your ad account ID manually.
            </p>
            <p className="text-xs text-gray-400">
              Format: <code className="bg-gray-100 px-1 py-0.5 rounded">act_XXXXXXXXX</code>
            </p>
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="act_123456789"
              className="w-full border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => handleSelectAccount(manualId.trim())}
              disabled={!manualId.trim() || connecting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium
                         hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {connecting && <Loader2 size={15} className="animate-spin" />}
              {connecting ? "Connecting…" : "Connect Account"}
            </button>
          </div>
        )}

        <button
          onClick={() => navigate("/settings")}
          disabled={connecting}
          className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition block disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Centered card wrapper ─────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        {children}
      </div>
    </div>
  )
}
