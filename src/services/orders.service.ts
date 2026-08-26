import { supabase } from "@/services/supabase/client"
import type { CreateOrderItemInput, Order, OrderStatus, PaymentMethod } from "@/types"

const ORDER_SELECT = `
  *,
  service:services(*, category:categories(*)),
  items:order_items(*, finishings:order_item_finishings(*, finishing_option:finishing_options(*))),
  status_history:order_status_history(*),
  payments(*),
  delivery_address:addresses(*),
  client:profiles!orders_client_id_fkey(id, email, first_name, last_name, phone, avatar_url, bio, role, pin_set_at, created_at, updated_at)
`

/**
 * Couche d'accès à `orders`/`order_items`/`payments` (supabase/migrations/00028).
 *
 * Écriture : jamais un INSERT/UPDATE direct sur `orders` — ces tables ont
 * leurs privilèges INSERT/UPDATE/DELETE révoqués pour `authenticated` (voir
 * le commentaire "REVOKE" dans 00028). La seule façon de créer une commande
 * ou de changer son statut est d'appeler les fonctions RPC
 * `create_order()`/`update_order_status()`, qui recalculent le prix et
 * valident les transitions côté serveur — jamais depuis une valeur
 * envoyée par le client.
 */
class OrdersService {
  async createOrder(input: {
    serviceId: string
    receptionMethod: "pickup" | "delivery"
    items: CreateOrderItemInput[]
    deliveryAddressId?: string | null
    deliveryZoneId?: string | null
    notes?: string | null
    preferredPaymentMethod?: PaymentMethod | null
  }): Promise<string> {
    const { data, error } = await supabase.rpc("create_order", {
      p_service_id: input.serviceId,
      p_reception_method: input.receptionMethod,
      p_items: input.items,
      p_delivery_address_id: input.deliveryAddressId ?? null,
      p_delivery_zone_id: input.deliveryZoneId ?? null,
      p_notes: input.notes ?? null,
      p_preferred_payment_method: input.preferredPaymentMethod ?? null,
    })

    if (error) throw error
    return data as string
  }

  async updateOrderStatus(orderId: string, newStatus: OrderStatus, note?: string): Promise<void> {
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_note: note ?? null,
    })

    if (error) throw error
  }

  async getMyOrders(clientId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Order[]
  }

  /** Toutes les commandes — réservé au personnel COIN-IDEAL (RLS `orders_select_staff`). */
  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Order[]
  }

  async getOrder(orderId: string): Promise<Order> {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .single()

    if (error) throw error
    return data as unknown as Order
  }
}

export const ordersService = new OrdersService()
