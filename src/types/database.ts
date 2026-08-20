export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          bio: string | null
          role: "client" | "provider" | "admin"
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: "client" | "provider" | "admin"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: "client" | "provider" | "admin"
          updated_at?: string
        }
      }
      provider_profiles: {
        Row: {
          id: string
          user_id: string
          business_name: string | null
          description: string | null
          specialties: string[] | null
          experience_years: number | null
          location: string | null
          latitude: number | null
          longitude: number | null
          is_verified: boolean
          is_available: boolean
          rating: number
          total_reviews: number
          total_completed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name?: string | null
          description?: string | null
          specialties?: string[] | null
          experience_years?: number | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          is_verified?: boolean
          is_available?: boolean
          rating?: number
          total_reviews?: number
          total_completed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string | null
          description?: string | null
          specialties?: string[] | null
          experience_years?: number | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          is_verified?: boolean
          is_available?: boolean
          rating?: number
          total_reviews?: number
          total_completed?: number
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          image_url?: string | null
          is_active?: boolean
        }
      }
      services: {
        Row: {
          id: string
          provider_id: string
          category_id: string
          name: string
          slug: string
          description: string
          price: number
          price_unit: string | null
          location: string
          latitude: number | null
          longitude: number | null
          estimated_duration: string | null
          conditions: string | null
          is_active: boolean
          is_verified: boolean
          rating: number
          total_reviews: number
          total_orders: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          category_id: string
          name: string
          slug: string
          description: string
          price: number
          price_unit?: string | null
          location: string
          latitude?: number | null
          longitude?: number | null
          estimated_duration?: string | null
          conditions?: string | null
          is_active?: boolean
          is_verified?: boolean
          rating?: number
          total_reviews?: number
          total_orders?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          category_id?: string
          name?: string
          slug?: string
          description?: string
          price?: number
          price_unit?: string | null
          location?: string
          latitude?: number | null
          longitude?: number | null
          estimated_duration?: string | null
          conditions?: string | null
          is_active?: boolean
          is_verified?: boolean
          rating?: number
          total_reviews?: number
          total_orders?: number
          updated_at?: string
        }
      }
      service_images: {
        Row: {
          id: string
          service_id: string
          url: string
          alt: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          url: string
          alt?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          url?: string
          alt?: string | null
          sort_order?: number
        }
      }
      service_availability: {
        Row: {
          id: string
          service_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
        }
        Insert: {
          id?: string
          service_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
        }
        Update: {
          id?: string
          service_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          label: string
          street: string
          city: string
          state: string | null
          zip_code: string | null
          country: string
          latitude: number | null
          longitude: number | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          street: string
          city: string
          state?: string | null
          zip_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          street?: string
          city?: string
          state?: string | null
          zip_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          is_default?: boolean
        }
      }
      service_requests: {
        Row: {
          id: string
          client_id: string
          service_id: string
          provider_id: string
          message: string
          preferred_date: string | null
          preferred_time: string | null
          address: string
          status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
          response_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          provider_id: string
          message: string
          preferred_date?: string | null
          preferred_time?: string | null
          address: string
          status?: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
          response_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          provider_id?: string
          message?: string
          preferred_date?: string | null
          preferred_time?: string | null
          address?: string
          status?: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
          response_message?: string | null
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          request_id: string
          client_id: string
          provider_id: string
          service_id: string
          scheduled_date: string
          scheduled_time: string | null
          status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
          total_price: number
          notes: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          client_id: string
          provider_id: string
          service_id: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
          total_price: number
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          client_id?: string
          provider_id?: string
          service_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
          total_price?: number
          notes?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          service_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
        }
      }
      reviews: {
        Row: {
          id: string
          reviewer_id: string
          provider_id: string
          service_id: string | null
          booking_id: string | null
          rating: number
          comment: string
          response: string | null
          response_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          provider_id: string
          service_id?: string | null
          booking_id?: string | null
          rating: number
          comment: string
          response?: string | null
          response_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          provider_id?: string
          service_id?: string | null
          booking_id?: string | null
          rating?: number
          comment?: string
          response?: string | null
          response_at?: string | null
        }
      }
      message_threads: {
        Row: {
          id: string
          participant_1: string
          participant_2: string
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          participant_1: string
          participant_2: string
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          participant_1?: string
          participant_2?: string
          last_message_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: "new_request" | "request_accepted" | "request_rejected" | "booking_confirmed" | "booking_completed" | "new_message" | "new_review" | "admin_notification"
          title: string
          message: string
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "new_request" | "request_accepted" | "request_rejected" | "booking_confirmed" | "booking_completed" | "new_message" | "new_review" | "admin_notification"
          title: string
          message: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "new_request" | "request_accepted" | "request_rejected" | "booking_confirmed" | "booking_completed" | "new_message" | "new_review" | "admin_notification"
          title?: string
          message?: string
          link?: string | null
          is_read?: boolean
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: "service" | "review" | "provider" | "user"
          target_id: string
          reason: string
          description: string | null
          status: "pending" | "reviewed" | "resolved" | "dismissed"
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: "service" | "review" | "provider" | "user"
          target_id: string
          reason: string
          description?: string | null
          status?: "pending" | "reviewed" | "resolved" | "dismissed"
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: "service" | "review" | "provider" | "user"
          target_id?: string
          reason?: string
          description?: string | null
          status?: "pending" | "reviewed" | "resolved" | "dismissed"
        }
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          details?: Json | null
        }
      }
    }
    Functions: Record<string, never>
  }
}
