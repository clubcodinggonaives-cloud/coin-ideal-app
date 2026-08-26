export type UserRole = "client" | "provider" | "admin"

export type RequestStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled"
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
export type NotificationType =
  | "new_request"
  | "request_accepted"
  | "request_rejected"
  | "booking_confirmed"
  | "booking_completed"
  | "new_message"
  | "new_review"
  | "admin_notification"
  | "order_status_change"

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  pin_set_at: string | null
  created_at: string
  updated_at: string
}

export interface ProviderProfile {
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

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  image_url: string | null
  is_active: boolean
  service_count?: number
  created_at: string
}

export interface Service {
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
  images: string[] | null
  created_at: string
  updated_at: string
  provider?: ProviderProfile
  category?: Category
}

export interface ServiceImage {
  id: string
  service_id: string
  url: string
  alt: string | null
  sort_order: number
  created_at: string
}

export interface ServiceAvailability {
  id: string
  service_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

export interface Address {
  id: string
  user_id: string
  label: string
  street: string
  city: string
  state: string | null
  zip_code: string | null
  country: string
  phone: string | null
  latitude: number | null
  longitude: number | null
  is_default: boolean
  created_at: string
}

export interface ServiceRequest {
  id: string
  client_id: string
  service_id: string
  provider_id: string
  message: string
  preferred_date: string | null
  preferred_time: string | null
  address: string
  status: RequestStatus
  response_message: string | null
  created_at: string
  updated_at: string
  service?: Service
  client?: Profile
  provider?: Profile
}

export interface Booking {
  id: string
  request_id: string
  client_id: string
  provider_id: string
  service_id: string
  scheduled_date: string
  scheduled_time: string | null
  status: BookingStatus
  total_price: number
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  service?: Service
  client?: Profile
  provider?: Profile
}

export interface Favorite {
  id: string
  user_id: string
  service_id: string
  created_at: string
  service?: Service
}

export interface Review {
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
  reviewer?: Profile
  provider?: ProviderProfile
}

export interface MessageThread {
  id: string
  participant_1: string
  participant_2: string
  last_message_at: string
  created_at: string
  participant1?: Profile
  participant2?: Profile
}

export interface Message {
  id: string
  thread_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  target_type: "service" | "review" | "provider" | "user"
  target_id: string
  reason: string
  description: string | null
  status: "pending" | "reviewed" | "resolved" | "dismissed"
  created_at: string
}

export interface AdminLog {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown> | null
  created_at: string
}

// =============================================================================
// Orders / payments / configurable pricing (supabase/migrations/00028-00029)
// =============================================================================
export type OrderStatus =
  | "en_attente"
  | "confirmee"
  | "en_preparation"
  | "prete"
  | "en_livraison"
  | "livree"
  | "retiree"
  | "annulee"

export type OrderColor = "bw" | "color"
export type OrderSided = "simplex" | "duplex"
export type OrderReceptionMethod = "pickup" | "delivery"
export type PaymentMethod = "cash" | "moncash" | "natcash" | "transfer"
export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded"

export interface FinishingOption {
  id: string
  label: string
  cost: number
  is_active: boolean
  created_at: string
}

export interface DeliveryZone {
  id: string
  name: string
  fee: number
  is_active: boolean
  created_at: string
}

export interface Setting {
  key: string
  value: unknown
  description: string | null
  updated_at: string
}

export interface OrderItemFinishing {
  order_item_id: string
  finishing_id: string
  cost: number
  finishing_option?: FinishingOption
}

export interface OrderItem {
  id: string
  order_id: string
  file_path: string | null
  file_name: string | null
  pages: number
  copies: number
  color: OrderColor
  sided: OrderSided
  unit_price: number
  line_total: number
  created_at: string
  finishings?: OrderItemFinishing[]
}

export interface OrderStatusHistoryEntry {
  id: string
  order_id: string
  status: string
  note: string | null
  changed_by: string | null
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: PaymentMethod
  reference: string | null
  status: PaymentStatus
  recorded_by: string | null
  paid_at: string | null
  created_at: string
}

export interface Order {
  id: string
  client_id: string
  service_id: string
  status: OrderStatus
  reception_method: OrderReceptionMethod
  delivery_address_id: string | null
  delivery_zone_id: string | null
  delivery_fee: number
  subtotal: number
  total: number
  notes: string | null
  preferred_payment_method: PaymentMethod | null
  payment_proof_path: string | null
  payment_reference: string | null
  payment_proof_submitted_at: string | null
  cancelled_reason: string | null
  ready_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  service?: Service
  items?: OrderItem[]
  status_history?: OrderStatusHistoryEntry[]
  payments?: Payment[]
  delivery_address?: Address
  client?: Profile
}

/** Input shape for a single line of `create_order()` — see orders.service.ts. */
export interface CreateOrderItemInput {
  pages: number
  copies: number
  color: OrderColor
  sided: OrderSided
  finishing_ids: string[]
  file_path?: string | null
  file_name?: string | null
}

// =============================================================================
// Contact form (supabase/migrations/00034)
// =============================================================================
export type ContactMessageStatus = "new" | "read" | "archived"

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactMessageStatus
  admin_reply: string | null
  replied_at: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SearchFilters {
  query?: string
  category?: string
  location?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  isVerified?: boolean
  sortBy?: "relevance" | "price_asc" | "price_desc" | "rating" | "popular"
  page?: number
  pageSize?: number
}
