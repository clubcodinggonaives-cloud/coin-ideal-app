import { useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { pinService } from "@/services/pin.service"

const ELEVATION_KEY = "coin-ideal:pin-elevated-at"
const ELEVATION_LIFETIME_MS = 20 * 60 * 1000 // 20 min — step-up control, not a Supabase session replacement

/**
 * This sessionStorage marker only gates whether the PIN entry screen is
 * shown again — it is never trusted as proof of anything by the server.
 * The actual verification (crypt() comparison, lockout) always happens in
 * verify_pin() (00060); editing this marker client-side can at most skip
 * the re-prompt UI, it cannot grant any RLS-gated data the user's real
 * Supabase session/role doesn't already permit.
 */
function isElevated(): boolean {
  try {
    const raw = sessionStorage.getItem(ELEVATION_KEY)
    if (!raw) return false
    const verifiedAt = Number(raw)
    return Number.isFinite(verifiedAt) && Date.now() - verifiedAt < ELEVATION_LIFETIME_MS
  } catch {
    return false
  }
}

function markElevated() {
  try {
    sessionStorage.setItem(ELEVATION_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (private mode etc.) -- PIN screen will
    // just re-prompt more often, not a functional break.
  }
}

function clearElevation() {
  try {
    sessionStorage.removeItem(ELEVATION_KEY)
  } catch {
    // no-op
  }
}

/**
 * Called from signOut() (use-auth.tsx) -- without this, a second
 * admin/provider account signing in on the same browser tab within 20
 * minutes of the previous one signing out would inherit their PIN
 * elevation, since sessionStorage otherwise persists for the tab's whole
 * lifetime regardless of which Supabase session is active.
 */
function clearPinElevationStorage() {
  clearElevation()
}

function usePin() {
  const [elevated, setElevatedState] = useState(isElevated)

  const setPin = useMutation({ mutationFn: (pin: string) => pinService.setPin(pin) })
  const verifyPin = useMutation({
    mutationFn: (pin: string) => pinService.verifyPin(pin),
    onSuccess: (result) => {
      if (result.ok) {
        markElevated()
        setElevatedState(true)
      }
    },
  })

  const refreshElevated = useCallback(() => setElevatedState(isElevated()), [])
  const clearElevated = useCallback(() => {
    clearElevation()
    setElevatedState(false)
  }, [])
  const elevate = useCallback(() => {
    markElevated()
    setElevatedState(true)
  }, [])

  return { elevated, refreshElevated, clearElevated, elevate, setPin, verifyPin }
}

export { usePin, clearPinElevationStorage }
