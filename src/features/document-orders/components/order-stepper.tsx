import { Check } from "lucide-react"
import { cn } from "@/utils/cn"

interface Step {
  label: string
}

interface OrderStepperProps {
  steps: Step[]
  current: number
}

function OrderStepper({ steps, current }: OrderStepperProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Étapes de la commande">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "upcoming"
        return (
          <li key={step.label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  state === "done" && "bg-primary-600 text-white",
                  state === "current" && "border-2 border-primary-600 text-primary-700",
                  state === "upcoming" && "border-2 border-gray-200 text-gray-500"
                )}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  state === "upcoming" ? "text-gray-500" : "text-gray-900"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                className={cn("h-px flex-1", state === "done" ? "bg-primary-600" : "bg-gray-200")}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { OrderStepper }
