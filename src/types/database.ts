export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          state: string | null
          street: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          provider_id: string
          request_id: string
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          provider_id: string
          request_id: string
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          provider_id?: string
          request_id?: string
          scheduled_date?: string
          scheduled_time?: string
          service_id?: string
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          fee: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finishing_options: {
        Row: {
          cost: number
          created_at: string
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          cost: number
          created_at?: string
          id: string
          is_active?: boolean
          label: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_finishings: {
        Row: {
          cost: number
          finishing_id: string
          order_item_id: string
        }
        Insert: {
          cost: number
          finishing_id: string
          order_item_id: string
        }
        Update: {
          cost?: number
          finishing_id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_finishings_finishing_id_fkey"
            columns: ["finishing_id"]
            isOneToOne: false
            referencedRelation: "finishing_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_finishings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color: string
          copies: number
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          line_total: number
          order_id: string
          pages: number
          sided: string
          unit_price: number
        }
        Insert: {
          color: string
          copies: number
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          line_total: number
          order_id: string
          pages: number
          sided: string
          unit_price: number
        }
        Update: {
          color?: string
          copies?: number
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          line_total?: number
          order_id?: string
          pages?: number
          sided?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_reason: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          delivery_address_id: string | null
          delivery_fee: number
          delivery_zone_id: string | null
          id: string
          notes: string | null
          preferred_payment_method: string | null
          ready_at: string | null
          reception_method: string
          service_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_zone_id?: string | null
          id?: string
          notes?: string | null
          preferred_payment_method?: string | null
          ready_at?: string | null
          reception_method: string
          service_id: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_zone_id?: string | null
          id?: string
          notes?: string | null
          preferred_payment_method?: string | null
          ready_at?: string | null
          reception_method?: string
          service_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          order_id: string
          paid_at: string | null
          recorded_by: string | null
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          order_id: string
          paid_at?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          paid_at?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          business_name: string
          created_at: string
          description: string | null
          experience_years: number | null
          id: string
          is_available: boolean
          is_verified: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          rating: number
          specialties: string[] | null
          total_completed: number
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string | null
          experience_years?: number | null
          id?: string
          is_available?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          rating?: number
          specialties?: string[] | null
          total_completed?: number
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string | null
          experience_years?: number | null
          id?: string
          is_available?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          rating?: number
          specialties?: string[] | null
          total_completed?: number
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rating: number
          response: string | null
          response_at: string | null
          reviewer_id: string
          service_id: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          response?: string | null
          response_at?: string | null
          reviewer_id: string
          service_id?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          response?: string | null
          response_at?: string | null
          reviewer_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          service_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          service_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          service_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          service_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          service_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          service_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          address: string | null
          client_id: string
          created_at: string
          id: string
          message: string | null
          preferred_date: string | null
          preferred_time: string | null
          provider_id: string
          response_message: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id: string
          created_at?: string
          id?: string
          message?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_id: string
          response_message?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_id?: string
          response_message?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          conditions: string | null
          created_at: string
          description: string | null
          estimated_duration: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          price: number
          price_unit: string | null
          provider_id: string
          rating: number
          slug: string
          total_orders: number
          total_reviews: number
          updated_at: string
        }
        Insert: {
          category_id: string
          conditions?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          price: number
          price_unit?: string | null
          provider_id: string
          rating?: number
          slug: string
          total_orders?: number
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          conditions?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          price?: number
          price_unit?: string | null
          provider_id?: string
          rating?: number
          slug?: string
          total_orders?: number
          total_reviews?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_delivery_address_id?: string
          p_delivery_zone_id?: string
          p_items: Json
          p_notes?: string
          p_preferred_payment_method?: string
          p_reception_method: string
          p_service_id: string
        }
        Returns: string
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      record_payment: {
        Args: {
          p_amount: number
          p_method: string
          p_order_id: string
          p_reference?: string
          p_status?: string
        }
        Returns: string
      }
      update_order_status: {
        Args: { p_new_status: string; p_note?: string; p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

