import type { TokenPair } from "./types"

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081"

const TOKEN_KEY = "adops_access_token"
const REFRESH_KEY = "adops_refresh_token"

// ─── Token helpers ────────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  set: (pair: TokenPair): void => {
    localStorage.setItem(TOKEN_KEY, pair.access_token)
    localStorage.setItem(REFRESH_KEY, pair.refresh_token)
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// ─── Internal: token refresh ──────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh calls (e.g. multiple 401s at once)
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return false

      const pair: TokenPair = await res.json()
      tokenStorage.set(pair)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ─── Core request ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const accessToken = tokenStorage.getAccess()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  // ── 401: attempt token refresh then retry once ────────────────────────────
  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, init, true)
    }
    // Refresh failed — clear auth and signal redirect to login
    tokenStorage.clear()
    window.dispatchEvent(new Event("adops:logout"))
    throw new ApiError(401, "Session expired. Please log in again.")
  }

  // ── Non-2xx: parse error body ─────────────────────────────────────────────
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message)
  }

  // ── 204 No Content ────────────────────────────────────────────────────────
  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * GET /some/path
 * Appends query params automatically when provided.
 *
 * @example
 * get<Campaign[]>("/integrations/meta/campaigns", { brand_id: "1" })
 */
export function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = params ? `${path}?${buildQuery(params)}` : path
  return request<T>(url, { method: "GET" })
}

/**
 * POST /some/path
 * Body is JSON-serialised automatically.
 */
export function post<T>(
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = params ? `${path}?${buildQuery(params)}` : path
  return request<T>(url, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/**
 * PUT /some/path
 */
export function put<T>(
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = params ? `${path}?${buildQuery(params)}` : path
  return request<T>(url, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/**
 * DELETE /some/path
 */
export function del<T = void>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = params ? `${path}?${buildQuery(params)}` : path
  return request<T>(url, { method: "DELETE" })
}

// ─── Query string builder ────────────────────────────────────────────────────

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
}
