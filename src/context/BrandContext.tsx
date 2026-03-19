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

export interface DateRange {
  since: string  // YYYY-MM-DD
  until: string  // YYYY-MM-DD
}

interface BrandContextValue {
  brands: Brand[]
  activeBrand: Brand | null
  dateRange: DateRange
  isLoading: boolean
  setActiveBrand: (brand: Brand) => void
  setDateRange: (range: DateRange) => void
  refetchBrands: () => Promise<void>
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DATE_RANGE_STORAGE_KEY = "adops-date-range"
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

function getInitialDateRange(): DateRange {
  try {
    const stored = localStorage.getItem(DATE_RANGE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DateRange
      // Validate that dates are in correct format
      if (parsed.since && parsed.until &&
          dayjs(parsed.since, "YYYY-MM-DD", true).isValid() &&
          dayjs(parsed.until, "YYYY-MM-DD", true).isValid()) {
        return parsed
      }
    }
  } catch {
    // If parsing fails, fall through to default
  }
  return defaultDateRange()
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
  const [dateRange, setDateRangeState] = useState<DateRange>(getInitialDateRange)
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

  // Persist date range to localStorage whenever it changes
  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range)
    try {
      localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify(range))
    } catch (err) {
      console.warn("Failed to save date range to localStorage:", err)
    }
  }, [])

  return (
    <BrandContext.Provider
      value={{
        brands,
        activeBrand,
        dateRange,
        isLoading,
        setActiveBrand,
        setDateRange,
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
