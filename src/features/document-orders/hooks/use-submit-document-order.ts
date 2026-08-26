import { useMutation, useQueryClient } from "@tanstack/react-query"
import { uploadsService } from "@/services/uploads.service"
import { ordersService } from "@/services/orders.service"
import { isProofPaymentMethod } from "@/features/document-orders/types"
import type { DocumentOrderState } from "@/features/document-orders/types"
import type { CreateOrderItemInput, PaymentMethod, Service } from "@/types"

interface SubmitDocumentOrderInput {
  order: DocumentOrderState
  service: Service
  userId: string
}

/**
 * Upload du fichier (Storage privé `order-documents`) puis création de la
 * commande via `orders.service.ts` -> RPC `create_order()`
 * (supabase/migrations/00028). Remplace l'ancien flux qui sérialisait toute
 * la configuration d'impression en JSON dans `service_requests.message` —
 * voir docs/database/DATABASE_ARCHITECTURE.md §3.1. `service_requests`
 * reste utilisé ailleurs (demandes marketplace génériques), juste plus ici.
 *
 * Le prix n'est JAMAIS envoyé au serveur : seuls pages/copies/color/sided/
 * finishing_ids voyagent, et `create_order()` recalcule le total à partir
 * du tarif réel du service et des options actives. `total` n'est donc pas
 * un paramètre de cette mutation — voir estimateOrderPrice() pour la
 * prévisualisation affichée pendant que l'utilisateur remplit le formulaire.
 *
 * Phase 6 : l'adresse est désormais une vraie ligne `addresses` choisie ou
 * créée par le client lui-même (AddressPicker) — plus de création d'adresse
 * "à la volée" à partir d'un texte libre. Si le moyen de paiement choisi
 * est moncash/natcash, la preuve est téléversée dans le bucket privé
 * `payment-proofs` (00062) puis liée via `submit_payment_proof()` (00061)
 * une fois la commande créée (il faut un order_id réel pour le chemin de
 * stockage).
 */
export function useSubmitDocumentOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ order, service, userId }: SubmitDocumentOrderInput) => {
      let filePath: string | null = null
      if (order.file) {
        const uploaded = await uploadsService.uploadOrderDocument(userId, order.file)
        filePath = uploaded.path
      }

      const item: CreateOrderItemInput = {
        pages: order.pages,
        copies: order.copies,
        color: order.color,
        sided: order.sided,
        finishing_ids: order.finishingIds,
        file_path: filePath,
        file_name: order.file?.name ?? null,
      }

      const orderId = await ordersService.createOrder({
        serviceId: service.id,
        receptionMethod: order.reception,
        items: [item],
        deliveryAddressId: order.reception === "delivery" ? order.deliveryAddressId : null,
        notes: order.reception === "delivery" ? order.deliveryInstructions || null : null,
        preferredPaymentMethod: (order.paymentMethod as PaymentMethod) || null,
      })

      if (isProofPaymentMethod(order.paymentMethod) && order.paymentProofFile) {
        const proof = await uploadsService.uploadPaymentProof(userId, orderId, order.paymentProofFile)
        await ordersService.submitPaymentProof(orderId, proof.path, order.paymentReference || null)
      }

      return orderId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
