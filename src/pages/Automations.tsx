/**
 * Automations — full CRUD for automation rules.
 *
 * List → toggle active, delete  (inline)
 * Create rule → inline form
 * Edit rule   → inline form (same component, pre-filled)
 */
import { useEffect, useState, type FormEvent } from "react"
import { Plus, Trash2, Pencil, X, Check, Loader2 } from "lucide-react"
import Toggle from "../components/ui/Toggle"
import { useBrand } from "../context/BrandContext"
import { get, post, put, del } from "../lib/api"
import type {
  AutomationRule,
  CreateRulePayload,
  UpdateRulePayload,
  RuleMetric,
  RuleCondition,
  RuleAction,
  RuleSeverity,
  RuleEntityType,
  LogicOperator,
} from "../lib/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const METRICS: { value: RuleMetric; label: string }[] = [
  { value: "spend", label: "Amount Spent" },
  { value: "cpa", label: "Cost per Result" },
  { value: "purchases", label: "Results" },
]

const CONDITIONS: { value: RuleCondition; label: string }[] = [
  { value: "greater_than", label: "Greater than" },
  { value: "less_than",    label: "Less than" },
  { value: "equals",       label: "Equals" },
]

const ACTIONS: { value: RuleAction; label: string }[] = [
  { value: "telegram_alert", label: "Send Telegram alert" },
  { value: "email_alert",    label: "Send Email alert" },
  { value: "pause_campaign", label: "Pause campaign" },
  { value: "pause_adset",    label: "Pause ad set" },
  { value: "pause_ad",       label: "Pause ad" },
]

const SEVERITIES: { value: RuleSeverity; label: string }[] = [
  { value: "info",     label: "Info" },
  { value: "warning",  label: "Warning" },
  { value: "critical", label: "Critical" },
]

const ENTITY_TYPES: { value: RuleEntityType; label: string }[] = [
  { value: "all",      label: "All entities" },
  { value: "campaign", label: "Campaigns only" },
  { value: "adset",    label: "Ad Sets only" },
  { value: "ad",       label: "Ads only" },
]

const LOGIC_OPERATORS: { value: LogicOperator; label: string }[] = [
  { value: "and", label: "AND (both must be true)" },
  { value: "or",  label: "OR (either can be true)" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityClass(s: RuleSeverity) {
  if (s === "critical") return "bg-red-100 text-red-700"
  if (s === "warning")  return "bg-yellow-100 text-yellow-700"
  return "bg-blue-100 text-blue-700"
}

function entityTypeClass(e: RuleEntityType) {
  if (e === "campaign") return "bg-purple-100 text-purple-700"
  if (e === "adset")    return "bg-green-100 text-green-700"
  if (e === "ad")       return "bg-orange-100 text-orange-700"
  return "bg-gray-100 text-gray-600"
}

// ─── Blank form state ─────────────────────────────────────────────────────────

type RuleForm = {
  name:               string
  metric:             RuleMetric
  condition:          RuleCondition
  threshold:          string   // string so input is controlled
  action:             RuleAction
  severity:           RuleSeverity
  entityType:         RuleEntityType
  // Relational constraints (optional)
  useSecondary:       boolean
  secondaryMetric:    RuleMetric
  secondaryCondition: RuleCondition
  secondaryThreshold: string
  logicOperator:      LogicOperator
}

const BLANK: RuleForm = {
  name:               "",
  metric:             "cpa",
  condition:          "greater_than",
  threshold:          "",
  action:             "telegram_alert",
  severity:           "warning",
  entityType:         "all",
  useSecondary:       false,
  secondaryMetric:    "purchases",
  secondaryCondition: "equals",
  secondaryThreshold: "",
  logicOperator:      "and",
}

// ─── Rule Form sub-component ─────────────────────────────────────────────────

interface RuleFormProps {
  initial:   RuleForm
  saving:    boolean
  error:     string | null
  submitLabel: string
  onSubmit:  (form: RuleForm) => void
  onCancel:  () => void
}

function RuleFormUI({ initial, saving, error, submitLabel, onSubmit, onCancel }: RuleFormProps) {
  const [form, setForm] = useState<RuleForm>(initial)
  const set = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4"
    >
      {/* Row 1: name + metric */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rule name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. High CPA alert"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
          <select
            value={form.metric}
            onChange={(e) => set("metric", e.target.value as RuleMetric)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: condition + threshold */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
          <select
            value={form.condition}
            onChange={(e) => set("condition", e.target.value as RuleCondition)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Threshold</label>
          <input
            type="number"
            required
            min={0}
            step="any"
            value={form.threshold}
            onChange={(e) => set("threshold", e.target.value)}
            placeholder="e.g. 50"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Row 3: action + severity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
          <select
            value={form.action}
            onChange={(e) => set("action", e.target.value as RuleAction)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
          <select
            value={form.severity}
            onChange={(e) => set("severity", e.target.value as RuleSeverity)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: entity type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Apply to</label>
        <select
          value={form.entityType}
          onChange={(e) => set("entityType", e.target.value as RuleEntityType)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {ENTITY_TYPES.map((et) => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>
      </div>

      {/* Row 5: Advanced - Relational constraints */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.useSecondary}
            onChange={(e) => set("useSecondary", e.target.checked)}
            className="rounded"
          />
          <span className="font-medium">Add second condition (relational rule)</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Example: "pause if spend &gt; $1.40 AND purchases = 0"</p>
      </div>

      {form.useSecondary && (
        <>
          {/* Logic operator */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Combine with</label>
            <select
              value={form.logicOperator}
              onChange={(e) => set("logicOperator", e.target.value as LogicOperator)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {LOGIC_OPERATORS.map((lo) => (
                <option key={lo.value} value={lo.value}>{lo.label}</option>
              ))}
            </select>
          </div>

          {/* Secondary condition fields */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">Second Condition</h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
                <select
                  value={form.secondaryMetric}
                  onChange={(e) => set("secondaryMetric", e.target.value as RuleMetric)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                <select
                  value={form.secondaryCondition}
                  onChange={(e) => set("secondaryCondition", e.target.value as RuleCondition)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Threshold</label>
                <input
                  type="number"
                  required={form.useSecondary}
                  min={0}
                  step="any"
                  value={form.secondaryThreshold}
                  onChange={(e) => set("secondaryThreshold", e.target.value)}
                  placeholder="e.g. 0"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm
                     hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Automations() {
  const { activeBrand } = useBrand()

  const [rules,     setRules]     = useState<AutomationRule[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Form visibility
  const [showCreate, setShowCreate] = useState(false)
  const [editId,     setEditId]     = useState<number | null>(null)

  // Per-action loading / error
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<Set<number>>(new Set())

  // ── Load rules ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeBrand) return
    setLoading(true)
    setError(null)
    get<AutomationRule[]>("/automation/rules", { brand_id: activeBrand.id })
      .then((data) => setRules(data ?? []))
      .catch((err) => setError(err.message ?? "Failed to load rules"))
      .finally(() => setLoading(false))
  }, [activeBrand])

  // ── Create rule ────────────────────────────────────────────────────────────
  async function handleCreate(form: RuleForm) {
    if (!activeBrand) return
    setSaving(true)
    setFormError(null)
    try {
      const payload: CreateRulePayload = {
        name:        form.name.trim(),
        metric:      form.metric,
        condition:   form.condition,
        threshold:   Number(form.threshold),
        action:      form.action,
        severity:    form.severity,
        entity_type: form.entityType,
      }

      // Add relational constraints if enabled
      if (form.useSecondary) {
        payload.secondary_metric = form.secondaryMetric
        payload.secondary_condition = form.secondaryCondition
        payload.secondary_threshold = Number(form.secondaryThreshold)
        payload.logic_operator = form.logicOperator
      }
      const created = await post<AutomationRule>(
        "/automation/rules",
        payload,
        { brand_id: activeBrand.id },
      )
      setRules((r) => [created, ...r])
      setShowCreate(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create rule")
    } finally {
      setSaving(false)
    }
  }

  // ── Update rule ────────────────────────────────────────────────────────────
  async function handleUpdate(id: number, form: RuleForm) {
    if (!activeBrand) return
    setSaving(true)
    setFormError(null)
    try {
      const payload: UpdateRulePayload = {
        name:        form.name.trim(),
        metric:      form.metric,
        condition:   form.condition,
        threshold:   Number(form.threshold),
        action:      form.action,
        severity:    form.severity,
        entity_type: form.entityType,
      }

      // Add relational constraints if enabled
      if (form.useSecondary) {
        payload.secondary_metric = form.secondaryMetric
        payload.secondary_condition = form.secondaryCondition
        payload.secondary_threshold = Number(form.secondaryThreshold)
        payload.logic_operator = form.logicOperator
      }
      const updated = await put<AutomationRule>(
        `/automation/rules/${id}`,
        payload,
        { brand_id: activeBrand.id }
      )
      setRules((r) => r.map((rule) => (rule.id === id ? updated : rule)))
      setEditId(null)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update rule")
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function handleToggle(rule: AutomationRule) {
    if (!activeBrand) return
    try {
      const updated = await put<AutomationRule>(
        `/automation/rules/${rule.id}`,
        { is_active: !rule.is_active },
        { brand_id: activeBrand.id }
      )
      setRules((r) => r.map((x) => (x.id === rule.id ? updated : x)))
    } catch {
      // no-op — toggle reverts automatically (state not changed on error)
    }
  }

  // ── Delete rule ────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!activeBrand) return
    if (!confirm("Delete this rule?")) return
    setDeleting((prev) => new Set(prev).add(id))
    try {
      await del(`/automation/rules/${id}`, { brand_id: activeBrand.id })
      setRules((r) => r.filter((x) => x.id !== id))
    } catch {
      // no-op
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  // ── No brand ───────────────────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-medium">No brand selected</p>
        <p className="text-sm mt-1">Create a brand in Settings to get started.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Automations</h1>
        {!showCreate && (
          <button
            onClick={() => { setShowCreate(true); setEditId(null); setFormError(null) }}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm
                       hover:bg-blue-700 transition"
          >
            <Plus size={14} />
            Create Rule
          </button>
        )}
      </div>

      {/* ── Create Form ── */}
      {showCreate && (
        <RuleFormUI
          initial={BLANK}
          saving={saving}
          error={formError}
          submitLabel="Create Rule"
          onSubmit={handleCreate}
          onCancel={() => { setShowCreate(false); setFormError(null) }}
        />
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && rules.length === 0 && !showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="font-medium">No automation rules yet</p>
          <p className="text-sm mt-1">Create a rule to automatically alert or pause campaigns.</p>
        </div>
      )}

      {/* ── Rules list ── */}
      {!loading && rules.map((rule) => (
        <div key={rule.id} className="bg-white rounded-xl shadow-sm">
          {editId === rule.id ? (
            <div className="p-4">
              <RuleFormUI
                initial={{
                  name:               rule.name,
                  metric:             rule.metric,
                  condition:          rule.condition,
                  threshold:          String(rule.threshold),
                  action:             rule.action,
                  severity:           rule.severity,
                  entityType:         rule.entity_type,
                  useSecondary:       !!rule.secondary_metric,
                  secondaryMetric:    rule.secondary_metric ?? "purchases",
                  secondaryCondition: rule.secondary_condition ?? "equals",
                  secondaryThreshold: rule.secondary_threshold != null ? String(rule.secondary_threshold) : "",
                  logicOperator:      rule.logic_operator ?? "and",
                }}
                saving={saving}
                error={formError}
                submitLabel="Save Changes"
                onSubmit={(form) => handleUpdate(rule.id, form)}
                onCancel={() => { setEditId(null); setFormError(null) }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Toggle */}
              <Toggle
                enabled={rule.is_active}
                onChange={() => handleToggle(rule)}
              />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{rule.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityClass(rule.severity)}`}>
                    {rule.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entityTypeClass(rule.entity_type)}`}>
                    {ENTITY_TYPES.find((et) => et.value === rule.entity_type)?.label}
                  </span>
                  {!rule.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  When <strong className="text-gray-600">{rule.metric.toUpperCase()}</strong>{" "}
                  {CONDITIONS.find((c) => c.value === rule.condition)?.label.toLowerCase()}{" "}
                  <strong className="text-gray-600">{rule.threshold}</strong>
                  {rule.secondary_metric && rule.secondary_condition && rule.secondary_threshold != null && rule.logic_operator && (
                    <>
                      {" "}
                      <span className="text-blue-600 font-semibold">{rule.logic_operator.toUpperCase()}</span>{" "}
                      <strong className="text-gray-600">{rule.secondary_metric.toUpperCase()}</strong>{" "}
                      {CONDITIONS.find((c) => c.value === rule.secondary_condition)?.label.toLowerCase()}{" "}
                      <strong className="text-gray-600">{rule.secondary_threshold}</strong>
                    </>
                  )}
                  {" → "}
                  {ACTIONS.find((a) => a.value === rule.action)?.label}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditId(rule.id); setShowCreate(false); setFormError(null) }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleting.has(rule.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded transition disabled:opacity-50"
                  title="Delete"
                >
                  {deleting.has(rule.id)
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
