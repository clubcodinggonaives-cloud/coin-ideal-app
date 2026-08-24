import { useMutation, useQueryClient } from "@tanstack/react-query"
import { uploadsService } from "@/services/uploads.service"
import { ordersService } from "@/services/orders.service"
import { addressesService } from "@/services/addresses.service"
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

      let deliveryAddressId: string | null = null
      if (order.reception === "delivery") {
        // Le formulaire ne capture qu'un champ texte libre — create_order()
        // exige une ligne `addresses` réelle (delivery_address_id est une
        // FK). On la crée à la volée plutôt que de modifier la migration
        // déjà validée pour accepter du texte libre.
        const address = await addressesService.createAddress({
          userId,
          label: "Commande COIN-IDEAL",
          street: order.deliveryAddress,
          city: "Gonaïves",
        })
        deliveryAddressId = address.id
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
        deliveryAddressId,
        notes: order.notes || null,
        preferredPaymentMethod: (order.paymentMethod as PaymentMethod) || null,
      })

      return orderId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
