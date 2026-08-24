export type PrintColor = "bw" | "color"
export type PrintSided = "simplex" | "duplex"
export type ReceptionMethod = "pickup" | "delivery"

export interface FinishingOption {
  id: string
  label: string
  /** Coût forfaitaire ajouté à l'estimation, en HTG. */
  cost: number
}

/** État complet du formulaire de commande, rempli au fil des étapes. */
export interface DocumentOrderState {
  file: File | null
  serviceId: string
  pages: number
  copies: number
  color: PrintColor
  sided: PrintSided
  finishingIds: string[]
  reception: ReceptionMethod
  deliveryAddress: string
  paymentMethod: string
  notes: string
}

export const INITIAL_ORDER_STATE: DocumentOrderState = {
  file: null,
  serviceId: "",
  pages: 1,
  copies: 1,
  color: "bw",
  sided: "simplex",
  finishingIds: [],
  reception: "pickup",
  deliveryAddress: "",
  paymentMethod: "cash",
  notes: "",
}

/**
 * Valeurs de repli UNIQUEMENT — depuis supabase/migrations/00028-00029, la
 * source de vérité est en base (`finishing_options`, `settings`), lue via
 * `usePricingConfig()` (features/document-orders/hooks/use-pricing-config.ts).
 * Ces constantes ne servent plus que dans deux cas :
 *   1. `usePricingConfig()` retombe dessus si la requête Supabase échoue ou
 *      renvoie une table vide (voir ce hook) ;
 *   2. `order-message-summary.tsx` les utilise pour décoder d'anciennes
 *      commandes historiques stockées en JSON dans `service_requests.message`
 *      (avant 00028) — ces commandes ont été tarifées avec CES valeurs à
 *      l'époque, donc les remplacer par les tarifs live fausserait leur
 *      affichage historique.
 * Ne plus les utiliser comme source de prix pour une NOUVELLE commande.
 */
export const FALLBACK_FINISHING_OPTIONS: FinishingOption[] = [
  { id: "binding", label: "Reliure", cost: 150 },
  { id: "lamination", label: "Plastification", cost: 100 },
  { id: "stapling", label: "Agrafage", cost: 25 },
]

export const FALLBACK_DELIVERY_FEE = 250
export const FALLBACK_COLOR_SURCHARGE_RATIO = 1.6
