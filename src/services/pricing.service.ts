import { supabase } from "@/services/supabase/client"
import type { FinishingOption, DeliveryZone, Setting } from "@/types"

/**
 * Tarifs admin-configurables (supabase/migrations/00028-00029) : options de
 * finition, zones de livraison, réglages métier (majoration couleur, frais
 * de livraison forfaitaire, rétention des documents). Remplace les
 * constantes codées en dur qui vivaient dans
 * src/features/document-orders/types.ts — voir FALLBACK_* dans ce fichier
 * pour le comportement en cas d'échec réseau, jamais utilisées quand ces
 * tables répondent.
 */
class PricingService {
  async getFinishingOptions(): Promise<FinishingOption[]> {
    const { data, error } = await supabase
      .from("finishing_options")
      .select("*")
      .eq("is_active", true)
      .order("label", { ascending: true })

    if (error) throw error
    return (data ?? []) as FinishingOption[]
  }

  async getDeliveryZones(): Promise<DeliveryZone[]> {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true)
      .order("fee", { ascending: true })

    if (error) throw error
    return (data ?? []) as DeliveryZone[]
  }

  /** Toutes les entrées de `settings`, sous forme de map clé -> valeur JSON déjà désérialisée. */
  async getSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from("settings").select("key, value")

    if (error) throw error
    return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]))
  }

  // ===========================================================================
  // Admin — écritures directes. `finishing_options`/`delivery_zones`/`settings`
  // ont des policies `*_admin_all` (00028) qui autorisent déjà l'admin à
  // écrire directement — contrairement à orders/payments, aucune valeur ici
  // n'a besoin d'être recalculée côté serveur, donc pas de RPC nécessaire.
  // ===========================================================================
  async getAllFinishingOptions(): Promise<FinishingOption[]> {
    const { data, error } = await supabase
      .from("finishing_options")
      .select("*")
      .order("label", { ascending: true })

    if (error) throw error
    return (data ?? []) as FinishingOption[]
  }

  async createFinishingOption(input: { id: string; label: string; cost: number }): Promise<void> {
    const { error } = await supabase.from("finishing_options").insert(input)
    if (error) throw error
  }

  async updateFinishingOption(id: string, input: { label: string; cost: number }): Promise<void> {
    const { error } = await supabase.from("finishing_options").update(input).eq("id", id)
    if (error) throw error
  }

  async setFinishingOptionActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from("finishing_options").update({ is_active: isActive }).eq("id", id)
    if (error) throw error
  }

  async getAllDeliveryZones(): Promise<DeliveryZone[]> {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .order("fee", { ascending: true })

    if (error) throw error
    return (data ?? []) as DeliveryZone[]
  }

  async createDeliveryZone(input: { name: string; fee: number }): Promise<void> {
    const { error } = await supabase.from("delivery_zones").insert(input)
    if (error) throw error
  }

  async updateDeliveryZone(id: string, input: { name: string; fee: number }): Promise<void> {
    const { error } = await supabase.from("delivery_zones").update(input).eq("id", id)
    if (error) throw error
  }

  async setDeliveryZoneActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from("delivery_zones").update({ is_active: isActive }).eq("id", id)
    if (error) throw error
  }

  async getAllSettingsRows(): Promise<Setting[]> {
    const { data, error } = await supabase.from("settings").select("*").order("key", { ascending: true })
    if (error) throw error
    return (data ?? []) as Setting[]
  }

  async updateSetting(key: string, value: unknown): Promise<void> {
    const { error } = await supabase
      .from("settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)
    if (error) throw error
  }
}

export const pricingService = new PricingService()
