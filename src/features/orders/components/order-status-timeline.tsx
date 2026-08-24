import { Check, X } from "lucide-react"
import { ORDER_DELIVERY_STEPS, ORDER_PICKUP_STEPS, ORDER_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/utils/cn"
import type { Order } from "@/types"

interface OrderStatusTimelineProps {
  order: Pick<Order, "status" | "reception_method" | "cancelled_reason">
}

/**
 * Progression visuelle de la commande — cahier des charges §5 :
 *   retrait   : EN ATTENTE → CONFIRMÉE → EN PRÉPARATION → PRÊTE → RETIRÉE
 *   livraison : EN ATTENTE → CONFIRMÉE → EN PRÉPARATION → PRÊTE → EN LIVRAISON → LIVRÉE
 * ANNULÉE peut survenir depuis n'importe quelle étape — affichée à part
 * plutôt que comme une étape de plus sur la ligne, pour ne pas laisser
 * croire qu'une commande annulée progresse encore.
 */
function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
  if (order.status === "annulee") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <X className="h-4 w-4 shrink-0" />
        <span>
          Commande annulée
          {order.cancelled_reason ? ` — ${order.cancelled_reason}` : ""}
        </span>
      </div>
    )
  }

  const steps: readonly string[] = order.reception_method === "delivery" ? ORDER_DELIVERY_STEPS : ORDER_PICKUP_STEPS
  const currentIndex = steps.indexOf(order.status)

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {steps.map((step, index) => {
        const isDone = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                  isDone && "border-primary-600 bg-primary-600 text-white",
                  isCurrent && "border-primary-600 bg-primary-50 text-primary-700",
                  !isDone && !isCurrent && "border-gray-300 bg-white text-gray-400"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "max-w-[5.5rem] text-center text-[11px] leading-tight",
                  isCurrent ? "font-medium text-primary-700" : "text-gray-500"
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn("mx-1.5 h-0.5 w-6 shrink-0 sm:w-10", isDone ? "bg-primary-600" : "bg-gray-200")} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { OrderStatusTimeline }
