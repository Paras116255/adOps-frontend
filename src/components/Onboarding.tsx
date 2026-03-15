/**
 * Onboarding wizard — shown automatically to first-time users who either:
 *   - have no brands yet, or
 *   - have a brand but no active Meta connection.
 *
 * Steps:
 *   1. Welcome
 *   2. Create brand
 *   3. Connect Meta Ads (launches OAuth flow)
 *   4. Done
 *
 * The wizard renders as a full-screen modal overlay on top of the app.
 * It can be dismissed at Step 3 and later (brand already created).
 */
import { useState, type FormEvent } from "react"
import {
  ArrowRight,
  Building2,
  Link2,
  CheckCircle,
  X,
  Loader2,
  Zap,
} from "lucide-react"
import { post, get } from "../lib/api"
import { useBrand } from "../context/BrandContext"

// ─── Step enum ────────────────────────────────────────────────────────────────

type Step = "welcome" | "brand" | "meta" | "done"

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingProps {
  /** Called when the wizard finishes or is dismissed. */
  onClose: () => void
  /** If the user already has a brand, skip straight to the Meta step. */
  skipToBrand?: boolean
  skipToMeta?: boolean
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding({ onClose, skipToBrand, skipToMeta }: OnboardingProps) {
  const { refetchBrands, activeBrand } = useBrand()

  const initialStep: Step =
    skipToMeta ? "meta" :
    skipToBrand ? "brand" :
    "welcome"

  const [step, setStep] = useState<Step>(initialStep)

  // ── Brand step state ──────────────────────────────────────────────────────
  const [brandName, setBrandName] = useState("")
  const [brandLoading, setBrandLoading] = useState(false)
  const [brandError, setBrandError] = useState<string | null>(null)

  // ── Meta step state ───────────────────────────────────────────────────────
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  // ── Step 2: create brand ──────────────────────────────────────────────────
  async function handleCreateBrand(e: FormEvent) {
    e.preventDefault()
    if (!brandName.trim()) return
    setBrandLoading(true)
    setBrandError(null)
    try {
      await post("/brands", { name: brandName.trim(), timezone: "UTC", currency: "USD" })
      await refetchBrands()
      setStep("meta")
    } catch (err: unknown) {
      setBrandError(err instanceof Error ? err.message : "Failed to create brand")
    } finally {
      setBrandLoading(false)
    }
  }

  // ── Step 3: start Meta OAuth flow ─────────────────────────────────────────
  async function handleConnectMeta() {
    const brand = activeBrand
    if (!brand) {
      setMetaError("No active brand found. Please reload and try again.")
      return
    }
    setMetaLoading(true)
    setMetaError(null)
    try {
      const state = Math.random().toString(36).slice(2)
      sessionStorage.setItem("meta_oauth_state", state)
      sessionStorage.setItem("meta_oauth_brand_id", String(brand.id))

      const res = await get<{ url: string }>("/integrations/meta/connect", {
        brand_id: brand.id,
        state,
      })
      // Leave the app — Meta will redirect back to /meta/callback
      window.location.href = res.url
    } catch (err: unknown) {
      setMetaError(err instanceof Error ? err.message : "Could not get OAuth URL")
      setMetaLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-blue-600 px-8 py-6 text-white relative">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={20} />
            <span className="font-semibold text-lg">AdOps Dashboard</span>
          </div>
          <p className="text-blue-100 text-sm">Quick setup — takes less than 2 minutes</p>

          {/* Step dots */}
          <div className="flex gap-2 mt-4">
            {(["welcome", "brand", "meta", "done"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-8 bg-white"
                    : i < (["welcome","brand","meta","done"] as Step[]).indexOf(step)
                      ? "w-4 bg-white/60"
                      : "w-4 bg-white/30"
                }`}
              />
            ))}
          </div>

          {/* Dismiss button (only from meta step onward) */}
          {(step === "meta" || step === "done") && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition"
              aria-label="Close setup wizard"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-8 py-8">

          {/* ── Step: Welcome ─────────────────────────────────────────────── */}
          {step === "welcome" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Zap size={28} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Welcome to AdOps!</h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Let's get you set up in two quick steps: create a brand workspace,
                then connect your Meta Ads account to start syncing campaigns.
              </p>
              <button
                onClick={() => setStep("brand")}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                           hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step: Create brand ────────────────────────────────────────── */}
          {step === "brand" && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Create your brand</h2>
                  <p className="text-xs text-gray-400">Step 1 of 2</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-5">
                A brand is your workspace — it holds your campaigns, metrics, and automations.
                You can create multiple brands later.
              </p>

              <form onSubmit={handleCreateBrand} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Store, My Business"
                    autoFocus
                    className="w-full border rounded-xl px-4 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {brandError && (
                  <p className="text-red-500 text-xs">{brandError}</p>
                )}

                <button
                  type="submit"
                  disabled={!brandName.trim() || brandLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                             hover:bg-blue-700 transition disabled:opacity-50
                             flex items-center justify-center gap-2"
                >
                  {brandLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Creating…</>
                    : <> Create Brand <ArrowRight size={16} /></>
                  }
                </button>
              </form>
            </div>
          )}

          {/* ── Step: Connect Meta ────────────────────────────────────────── */}
          {step === "meta" && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Link2 size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Connect Meta Ads</h2>
                  <p className="text-xs text-gray-400">Step 2 of 2</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                Authorize AdOps to read your Facebook / Instagram ad campaigns.
                You'll be redirected to Meta to approve the permissions — we only request
                read access and the ability to pause/enable ads.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                  What we access
                </div>
                {[
                  "Campaign names, status, and budget",
                  "Ad set and ad performance data",
                  "Spend, impressions, and click metrics",
                  "Ability to pause or enable campaigns & ad sets",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              {metaError && (
                <p className="text-red-500 text-xs mb-3">{metaError}</p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleConnectMeta}
                  disabled={metaLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                             hover:bg-blue-700 transition disabled:opacity-50
                             flex items-center justify-center gap-2"
                >
                  {metaLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Redirecting…</>
                    : <><Link2 size={16} /> Connect with Meta</>
                  }
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-gray-400 text-sm hover:text-gray-600 transition py-1"
                >
                  Skip for now — I'll connect later in Settings
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Done ────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">You're all set!</h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Your brand is created and Meta Ads is connected.
                Head to the Dashboard to see your campaigns.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                           hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
