import { COLOR_SURCHARGE_RATIO, FINISHING_OPTIONS, FLAT_DELIVERY_FEE, type DocumentOrderState } from "@/features/document-orders/types"

/**
 * Calcule le prix estimé d'une commande, conformément à la formule du
 * cahier des charges :
 *   Prix = nombre de pages × nombre de copies × prix unitaire + options + frais de livraison
 *
 * `unitPrice` provient toujours du service réel sélectionné (Supabase) —
 * jamais d'une valeur codée en dur ici.
 */
export function estimateOrderPrice(
  order: Pick<DocumentOrderState, "pages" | "copies" | "color" | "finishingIds" | "reception">,
  unitPrice: number
): number {
  const pages = Math.max(0, order.pages)
  const copies = Math.max(0, order.copies)
  const effectiveUnitPrice = order.color === "color" ? unitPrice * COLOR_SURCHARGE_RATIO : unitPrice

  const printingCost = pages * copies * effectiveUnitPrice

  const finishingCost = order.finishingIds.reduce((total, id) => {
    const option = FINISHING_OPTIONS.find((f) => f.id === id)
    return total + (option?.cost ?? 0)
  }, 0)

  const deliveryFee = order.reception === "delivery" ? FLAT_DELIVERY_FEE : 0

  return Math.round(printingCost + finishingCost + deliveryFee)
}
