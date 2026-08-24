import { supabase } from "@/services/supabase/client"
import type { Payment, PaymentMethod, PaymentStatus } from "@/types"

/**
 * `payments` (supabase/migrations/00028) n'a aucune policy d'écriture
 * directe — voir le commentaire de la migration. Le seul moyen
 * d'enregistrer un paiement est `record_payment()`, réservé au personnel
 * COIN-IDEAL (rôle provider|admin) côté serveur : un client ne peut jamais
 * s'auto-déclarer "payé" (cahier des charges §14 — le système, pas le
 * client, fait foi sur le statut d'un paiement).
 */
class PaymentsService {
  async recordPayment(input: {
    orderId: string
    amount: number
    method: PaymentMethod
    reference?: string | null
    status?: PaymentStatus
  }): Promise<string> {
    const { data, error } = await supabase.rpc("record_payment", {
      p_order_id: input.orderId,
      p_amount: input.amount,
      p_method: input.method,
      p_reference: input.reference ?? null,
      p_status: input.status ?? "pending",
    })

    if (error) throw error
    return data as string
  }

  async getPaymentsForOrder(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Payment[]
  }
}

export const paymentsService = new PaymentsService()
