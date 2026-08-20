import { useMutation, useQueryClient } from "@tanstack/react-query"
import { uploadsService } from "@/services/uploads.service"
import { bookingsService } from "@/services/bookings.service"
import type { DocumentOrderState } from "@/features/document-orders/types"
import type { Service } from "@/types"

interface SubmitDocumentOrderInput {
  order: DocumentOrderState
  service: Service
  providerId: string
  userId: string
  total: number
}

/**
 * Compose l'upload du fichier (Supabase Storage) et la création de la
 * demande (table `service_requests`, réutilisée telle quelle — voir
 * `bookingsService`) en une seule commande. Aucune nouvelle table ni
 * aucun nouveau service backend n'est introduit : le détail de la
 * configuration d'impression est sérialisé dans le champ `message`
 * existant, en attendant un modèle `orders` dédié (cahier des charges §11).
 */
export function useSubmitDocumentOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ order, service, providerId, userId, total }: SubmitDocumentOrderInput) => {
      let filePath: string | null = null
      if (order.file) {
        const uploaded = await uploadsService.uploadOrderDocument(userId, order.file)
        filePath = uploaded.path
      }

      // `filePath` only — the order-documents bucket is private (see
      // 00023_create_storage_buckets.sql). Whoever needs to view the file
      // later resolves a short-lived signed URL from this path via
      // uploadsService.getOrderDocumentUrl(), never a stored public URL.
      const messagePayload = {
        type: "document_order" as const,
        fileName: order.file?.name ?? null,
        filePath,
        pages: order.pages,
        copies: order.copies,
        color: order.color,
        sided: order.sided,
        finishingIds: order.finishingIds,
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        estimatedTotal: total,
      }

      return bookingsService.createServiceRequest({
        serviceId: service.id,
        providerId,
        message: JSON.stringify(messagePayload),
        address:
          order.reception === "delivery"
            ? order.deliveryAddress
            : "Retrait au local — COIN-IDEAL",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] })
    },
  })
}
