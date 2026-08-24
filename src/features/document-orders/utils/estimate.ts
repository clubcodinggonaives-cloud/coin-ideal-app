import {
  FALLBACK_COLOR_SURCHARGE_RATIO,
  FALLBACK_DELIVERY_FEE,
  FALLBACK_FINISHING_OPTIONS,
  type DocumentOrderState,
} from "@/features/document-orders/types"
import type { FinishingOption } from "@/types"

/** Tarifs nécessaires pour estimer une commande — voir usePricingConfig(). */
export interface EstimatePricing {
  finishingOptions: Pick<FinishingOption, "id" | "cost">[]
  colorSurchargeRatio: number
  flatDeliveryFee: number
}

const DEFAULT_PRICING: EstimatePricing = {
  finishingOptions: FALLBACK_FINISHING_OPTIONS,
  colorSurchargeRatio: FALLBACK_COLOR_SURCHARGE_RATIO,
  flatDeliveryFee: FALLBACK_DELIVERY_FEE,
}

/**
 * Calcule le prix ESTIMÉ d'une commande, conformément à la formule du
 * cahier des charges :
 *   Prix = nombre de pages × nombre de copies × prix unitaire + options + frais de livraison
 *
 * `unitPrice` provient toujours du service réel sélectionné (Supabase),
 * `pricing` des tarifs live (`usePricingConfig()`) — jamais de valeur codée
 * en dur ici. Ceci reste une PRÉVISUALISATION cliente pour l'UX : le montant
 * qui compte réellement est celui que `create_order()` calcule et renvoie
 * côté serveur (voir orders.service.ts) — ce nombre n'est jamais envoyé au
 * serveur comme le prix à facturer.
 */
export function estimateOrderPrice(
  order: Pick<DocumentOrderState, "pages" | "copies" | "color" | "finishingIds" | "reception">,
  unitPrice: number,
  pricing: EstimatePricing = DEFAULT_PRICING
): number {
  const pages = Math.max(0, order.pages)
  const copies = Math.max(0, order.copies)
  const effectiveUnitPrice = order.color === "color" ? unitPrice * pricing.colorSurchargeRatio : unitPrice

  const printingCost = pages * copies * effectiveUnitPrice

  const finishingCost = order.finishingIds.reduce((total, id) => {
    const option = pricing.finishingOptions.find((f) => f.id === id)
    return total + (option?.cost ?? 0)
  }, 0)

  const deliveryFee = order.reception === "delivery" ? pricing.flatDeliveryFee : 0

  return Math.round(printingCost + finishingCost + deliveryFee)
}
