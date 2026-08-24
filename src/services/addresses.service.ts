import { supabase } from "@/services/supabase/client"
import type { Address } from "@/types"

/**
 * Aucun service n'existait pour la table `addresses` (gap trouvé pendant
 * l'intégration frontend : le formulaire de commande ne capturait qu'un
 * champ texte libre, jamais une ligne `addresses` réelle, alors que
 * `orders.delivery_address_id` — voir 00028 — référence une adresse
 * appartenant à l'utilisateur). `createAddress` est utilisé par
 * `useSubmitDocumentOrder` pour transformer ce texte libre en une adresse
 * structurée avant d'appeler `create_order()`.
 */
class AddressesService {
  async getUserAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Address[]
  }

  async createAddress(input: {
    userId: string
    label?: string
    street: string
    city: string
    country?: string
  }): Promise<Address> {
    const { data, error } = await supabase
      .from("addresses")
      .insert({
        user_id: input.userId,
        label: input.label ?? "Livraison",
        street: input.street,
        city: input.city,
        country: input.country ?? "Haïti",
      })
      .select()
      .single()

    if (error) throw error
    return data as Address
  }
}

export const addressesService = new AddressesService()
