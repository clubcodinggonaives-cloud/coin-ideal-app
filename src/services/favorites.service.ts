import { supabase } from "@/services/supabase/client"
import type { Favorite } from "@/types"

class FavoritesService {
  async getFavorites(userId: string): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from("favorites")
      .select("*, service:services(*, provider:provider_profiles(*, profiles:profiles(*)), category:categories(*))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Favorite[]
  }

  async addFavorite(userId: string, serviceId: string): Promise<Favorite> {
    const { data, error } = await supabase
      .from("favorites")
      .insert({
        user_id: userId,
        service_id: serviceId,
      })
      .select("*, service:services(*)")
      .single()

    if (error) throw error
    return data as Favorite
  }

  async removeFavorite(userId: string, serviceId: string): Promise<void> {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("service_id", serviceId)

    if (error) throw error
  }

  async isFavorite(userId: string, serviceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("service_id", serviceId)
      .maybeSingle()

    if (error) throw error
    return data !== null
  }
}

export const favoritesService = new FavoritesService()
