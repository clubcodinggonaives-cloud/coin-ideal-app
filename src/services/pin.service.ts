import { supabase } from "@/services/supabase/client"

export interface VerifyPinResult {
  ok: boolean
  lockedUntil: string | null
}

class PinService {
  /** The RPC itself validates 6-digit format and role — errors surface its message. */
  async setPin(pin: string): Promise<void> {
    const { error } = await supabase.rpc("set_pin", { p_pin: pin })
    if (error) throw error
  }

  /**
   * Never resolves the actual comparison client-side -- `verify_pin` (00060)
   * does the crypt() hash comparison and lockout bookkeeping entirely
   * server-side; this just relays its boolean + lockout timestamp.
   */
  async verifyPin(pin: string): Promise<VerifyPinResult> {
    const { data, error } = await supabase.rpc("verify_pin", { p_pin: pin })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return { ok: !!row?.ok, lockedUntil: row?.locked_until ?? null }
  }
}

export const pinService = new PinService()
