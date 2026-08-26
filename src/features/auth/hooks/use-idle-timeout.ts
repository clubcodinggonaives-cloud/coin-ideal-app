import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/lib/constants"

const IDLE_LIMIT_MS = 60 * 60 * 1000 // 1h — admin/provider only, per this phase's brief
const CHECK_INTERVAL_MS = 60 * 1000
const ACTIVITY_DEBOUNCE_MS = 30 * 1000

const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "pointerdown"] as const

// Read by login.tsx. A router-state flag on the navigate() call below would
// race with DashboardLayout's OWN unauthenticated redirect (<Navigate
// to="/auth/login" state={{from: location}} replace/>, rendered as soon as
// `isAuthenticated` flips false from signOut()'s state update) -- whichever
// of the two fires second wins and its state can silently overwrite the
// other's. sessionStorage sidesteps that race entirely.
const IDLE_TIMEOUT_FLAG_KEY = "coin-ideal:idle-timeout-flag"

function consumeIdleTimeoutFlag(): boolean {
  try {
    const flagged = sessionStorage.getItem(IDLE_TIMEOUT_FLAG_KEY) === "1"
    if (flagged) sessionStorage.removeItem(IDLE_TIMEOUT_FLAG_KEY)
    return flagged
  } catch {
    return false
  }
}

/**
 * Idle timeout is a UX concept ("no interaction for N minutes"); Supabase's
 * access token (jwt_expiry, 3600s) is silently auto-refreshed by
 * supabase-js regardless of idle state, and the refresh token stays valid
 * far longer than that — so a purely visual "your session expired" banner
 * that doesn't actually end the Supabase session would be theater, not
 * security. This hook closes that gap: on timeout it calls the real
 * `signOut()` (revokes the refresh token server-side), so the session is
 * genuinely gone, not just hidden from view.
 *
 * Supabase's own native idle timeout (`[auth.sessions] inactivity_timeout`
 * in config.toml) was considered and rejected: it's project-wide (can't
 * single out admin/provider the way this brief requires) and pushing
 * config.toml is unsafe regardless (its site_url/redirect_urls are stale
 * 127.0.0.1 placeholders never aligned with the live project).
 */
function useIdleTimeout(enabled: boolean, limitMs: number = IDLE_LIMIT_MS) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const lastActivityRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    lastActivityRef.current = Date.now()

    // Debounced: at most one timestamp write per ACTIVITY_DEBOUNCE_MS,
    // never on every single mousemove/keydown, and never persisted to
    // Supabase — purely an in-memory marker for this tab.
    let lastWrite = 0
    const markActive = () => {
      const now = Date.now()
      if (now - lastWrite < ACTIVITY_DEBOUNCE_MS) return
      lastWrite = now
      lastActivityRef.current = now
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") markActive()
    }

    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, markActive, { passive: true })
    document.addEventListener("visibilitychange", onVisibilityChange)

    const interval = setInterval(async () => {
      if (Date.now() - lastActivityRef.current >= limitMs) {
        try {
          sessionStorage.setItem(IDLE_TIMEOUT_FLAG_KEY, "1")
        } catch {
          // sessionStorage unavailable -- login page just won't show the
          // "expired due to inactivity" message; sign-out still proceeds.
        }
        await signOut()
        navigate(ROUTES.LOGIN, { replace: true })
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, markActive)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      clearInterval(interval)
    }
  }, [enabled, limitMs, signOut, navigate])
}

export { useIdleTimeout, IDLE_LIMIT_MS, consumeIdleTimeoutFlag }
