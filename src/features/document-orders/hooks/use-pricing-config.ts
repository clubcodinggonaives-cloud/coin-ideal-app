import { useQuery } from "@tanstack/react-query"
import { pricingService } from "@/services/pricing.service"
import {
  FALLBACK_COLOR_SURCHARGE_RATIO,
  FALLBACK_DELIVERY_FEE,
  FALLBACK_FINISHING_OPTIONS,
} from "@/features/document-orders/types"
import type { FinishingOption } from "@/types"

export interface PricingConfig {
  // Pick, pas FinishingOption complet : les valeurs FALLBACK_* (types.ts)
  // n'ont pas is_active/created_at, et rien en aval n'en a besoin — voir
  // print-options.tsx / order-summary.tsx qui attendent la même forme.
  finishingOptions: Pick<FinishingOption, "id" | "label" | "cost">[]
  colorSurchargeRatio: number
  flatDeliveryFee: number
}

/**
 * Tarifs live depuis Supabase (finishing_options + settings, voir
 * pricing.service.ts) pour le formulaire de commande. En cas d'échec réseau
 * ou de table vide, retombe sur les valeurs FALLBACK_* — les mêmes valeurs
 * qui vivaient en dur dans le code avant que 00028/00029 ne les rendent
 * configurables — pour que le formulaire reste utilisable plutôt que de
 * bloquer l'utilisateur derrière une erreur réseau.
 */
export function usePricingConfig() {
  return useQuery({
    queryKey: ["pricing-config"],
    queryFn: async (): Promise<PricingConfig> => {
      const [finishingOptions, settings] = await Promise.all([
        pricingService.getFinishingOptions(),
        pricingService.getSettings(),
      ])

      const colorSurchargeRatio = Number(settings.color_surcharge_ratio)
      const flatDeliveryFee = Number(settings.flat_delivery_fee)

      return {
        finishingOptions: finishingOptions.length > 0 ? finishingOptions : FALLBACK_FINISHING_OPTIONS,
        colorSurchargeRatio: Number.isFinite(colorSurchargeRatio)
          ? colorSurchargeRatio
          : FALLBACK_COLOR_SURCHARGE_RATIO,
        flatDeliveryFee: Number.isFinite(flatDeliveryFee) ? flatDeliveryFee : FALLBACK_DELIVERY_FEE,
      }
    },
    staleTime: 5 * 60 * 1000, // tarifs, pas des données qui changent seconde par seconde
  })
}
