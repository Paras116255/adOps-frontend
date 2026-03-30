import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import dayjs from "dayjs"
import { get } from "../lib/api"
import type { Brand } from "../lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_14_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month"
  | "custom"

export interface DateRange {
  since: string  // YYYY-MM-DD
  until: string  // YYYY-MM-DD
}

export interface DateFilter {
  preset: DatePreset
  dateRange: DateRange  // Used for display and when preset is "custom"
}

interface BrandContextValue {
  brands: Brand[]
  activeBrand: Brand | null
  dateRange: DateRange  // Kept for backward compatibility
  dateFilter: DateFilter
  isLoading: boolean
  setActiveBrand: (brand: Brand) => void
  setDateRange: (range: DateRange) => void  // Deprecated - use setDateFilter with preset="custom"
  setDateFilter: (filter: DateFilter) => void
  setPreset: (preset: DatePreset) => void  // Convenience method to set preset without date range
  refetchBrands: () => Promise<void>
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DATE_FILTER_STORAGE_KEY = "adops-date-filter"
const DATE_RANGE_STORAGE_KEY = "adops-date-range"  // Legacy - for backward compatibility
const ACTIVE_BRAND_STORAGE_KEY = "adops-active-brand-id"

function defaultDateRange(): DateRange {
  // Meta's "Last 30 days" calculation:
  // - Until: Yesterday (today's data is incomplete)
  // - Since: 29 days before yesterday (total = 30 days)
  // Example: If today is March 18, 2026:
  //   Yesterday = March 17
  //   29 days before = Feb 16
  //   Range: Feb 16 to Mar 17 = 30 days ✓
  const yesterday = dayjs().subtract(1, 'day')
  const twentyNineDaysAgo = yesterday.subtract(29, 'day')

  return {
    since: twentyNineDaysAgo.format("YYYY-MM-DD"),  // 29 days before yesterday
    until: yesterday.format("YYYY-MM-DD"),           // Yesterday
  }
}

function defaultDateFilter(): DateFilter {
  return {
    preset: "last_30_days",
    dateRange: defaultDateRange()
  }
}

function getInitialDateFilter(): DateFilter {
  try {
    // Try new format first
    const stored = localStorage.getItem(DATE_FILTER_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DateFilter
      // Validate preset and date range
      if (parsed.preset && parsed.dateRange &&
          dayjs(parsed.dateRange.since, "YYYY-MM-DD", true).isValid() &&
          dayjs(parsed.dateRange.until, "YYYY-MM-DD", true).isValid()) {
        return parsed
      }
    }

    // Fall back to legacy format
    const legacyStored = localStorage.getItem(DATE_RANGE_STORAGE_KEY)
    if (legacyStored) {
      const parsed = JSON.parse(legacyStored) as DateRange
      if (parsed.since && parsed.until &&
          dayjs(parsed.since, "YYYY-MM-DD", true).isValid() &&
          dayjs(parsed.until, "YYYY-MM-DD", true).isValid()) {
        return {
          preset: "custom",
          dateRange: parsed
        }
      }
    }
  } catch {
    // If parsing fails, fall through to default
  }
  return defaultDateFilter()
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BrandContext = createContext<BrandContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * BrandProvider must be mounted INSIDE ProtectedRoute so we are guaranteed
 * to have a valid access token when fetching brands.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeBrand, setActiveBrandState] = useState<Brand | null>(null)
  const [dateFilter, setDateFilterState] = useState<DateFilter>(getInitialDateFilter)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBrands = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await get<Brand[]>("/brands")
      setBrands(data ?? [])

      // Try to restore previously selected brand from localStorage
      const storedBrandId = localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY)
      let brandToSelect: Brand | null = null

      if (storedBrandId) {
        // Try to find the stored brand
        brandToSelect = data.find((b) => b.id === parseInt(storedBrandId)) ?? null
      }

      // If no stored brand or it doesn't exist anymore, select first brand
      if (!brandToSelect && data.length > 0) {
        brandToSelect = data[0]
      }

      setActiveBrandState(brandToSelect)
    } catch {
      // Silently ignore — user may have no brands yet
      setBrands([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch brands on mount
  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  const setActiveBrand = useCallback((brand: Brand) => {
    setActiveBrandState(brand)
    // Persist brand selection to localStorage
    try {
      localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, brand.id.toString())
    } catch (err) {
      console.warn("Failed to save active brand to localStorage:", err)
    }
  }, [])

  // Persist date filter to localStorage whenever it changes
  const setDateFilter = useCallback((filter: DateFilter) => {
    setDateFilterState(filter)
    try {
      localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify(filter))
    } catch (err) {
      console.warn("Failed to save date filter to localStorage:", err)
    }
  }, [])

  // Convenience method to set preset without specifying date range
  // Backend will calculate the actual dates
  const setPreset = useCallback((preset: DatePreset) => {
    // For display purposes, we still calculate the date range client-side
    // But components should use the preset when calling the backend
    const dateRange = preset === "custom" ? dateFilter.dateRange : defaultDateRange()
    setDateFilter({ preset, dateRange })
  }, [dateFilter.dateRange])

  // Legacy method - kept for backward compatibility
  // Sets preset to "custom" and uses explicit date range
  const setDateRange = useCallback((range: DateRange) => {
    setDateFilter({ preset: "custom", dateRange: range })
  }, [])

  return (
    <BrandContext.Provider
      value={{
        brands,
        activeBrand,
        dateRange: dateFilter.dateRange,  // For backward compatibility
        dateFilter,
        isLoading,
        setActiveBrand,
        setDateRange,  // Legacy method
        setDateFilter,
        setPreset,
        refetchBrands: fetchBrands,
      }}
    >
      {children}
    </BrandContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error("useBrand must be used inside <BrandProvider>")
  return ctx
}
