import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { get, post, tokenStorage, ApiError } from "../lib/api"
import type { AuthUser, TokenPair } from "../lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true) // true until session rehydrate attempt
  const [error, setError] = useState<string | null>(null)

  // ── Listen for forced logout event from api.ts (token refresh failed) ──────
  useEffect(() => {
    const onLogout = () => {
      setUser(null)
      window.location.replace("/login")
    }
    window.addEventListener("adops:logout", onLogout)
    return () => window.removeEventListener("adops:logout", onLogout)
  }, [])

  // ── Rehydrate session on mount ────────────────────────────────────────────
  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }

    get<AuthUser>("/auth/me")
      .then((me) => setUser(me))
      .catch(() => {
        // Token invalid / expired and refresh also failed → clear
        tokenStorage.clear()
      })
      .finally(() => setIsLoading(false))
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const pair = await post<TokenPair>("/auth/login", { email, password })
      tokenStorage.set(pair)
      const me = await get<AuthUser>("/auth/me")
      setUser(me)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Login failed. Please try again."
      setError(msg)
      throw err // let the form catch it too
    }
  }, [])

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setError(null)
      try {
        const pair = await post<TokenPair>("/auth/register", {
          name,
          email,
          password,
        })
        tokenStorage.set(pair)
        const me = await get<AuthUser>("/auth/me")
        setUser(me)
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Registration failed. Please try again."
        setError(msg)
        throw err
      }
    },
    [],
  )

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    window.location.replace("/login")
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
