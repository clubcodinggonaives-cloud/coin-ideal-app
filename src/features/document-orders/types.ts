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

export const FINISHING_OPTIONS: FinishingOption[] = [
  { id: "binding", label: "Reliure", cost: 150 },
  { id: "lamination", label: "Plastification", cost: 100 },
  { id: "stapling", label: "Agrafage", cost: 25 },
]

/** Frais de livraison forfaitaire (HTG). À remplacer par un calcul par zone quand celui-ci sera configurable. */
export const FLAT_DELIVERY_FEE = 250

/** Surcharge appliquée par page lorsque l'impression est en couleur plutôt qu'en noir et blanc. */
export const COLOR_SURCHARGE_RATIO = 1.6
