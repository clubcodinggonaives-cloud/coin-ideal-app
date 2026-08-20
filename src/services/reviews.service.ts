import { supabase } from "@/services/supabase/client"
import type { Review } from "@/types"

class ReviewsService {
  async getReviewsByProvider(providerId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, reviewer:profiles(*), provider:provider_profiles(*)")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Review[]
  }

  async getReviewsByService(serviceId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, reviewer:profiles(*), provider:provider_profiles(*)")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Review[]
  }

  async createReview(data: {
    serviceId?: string
    providerId: string
    bookingId?: string
    rating: number
    comment: string
  }): Promise<Review> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        reviewer_id: user.id,
        provider_id: data.providerId,
        service_id: data.serviceId ?? null,
        booking_id: data.bookingId ?? null,
        rating: data.rating,
        comment: data.comment,
      })
      .select("*, reviewer:profiles(*), provider:provider_profiles(*)")
      .single()

    if (error) throw error
    return review as Review
  }

  async respondToReview(reviewId: string, response: string): Promise<Review> {
    const { data, error } = await supabase
      .from("reviews")
      .update({
        response,
        response_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select("*, reviewer:profiles(*), provider:provider_profiles(*)")
      .single()

    if (error) throw error
    return data as Review
  }
}

export const reviewsService = new ReviewsService()
