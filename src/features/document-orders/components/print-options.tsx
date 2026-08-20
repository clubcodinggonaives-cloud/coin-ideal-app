import { Input, Select } from "@/components/ui"
import { FINISHING_OPTIONS, type DocumentOrderState } from "@/features/document-orders/types"
import type { Service } from "@/types"

interface PrintOptionsProps {
  order: DocumentOrderState
  services: Service[]
  onChange: (patch: Partial<DocumentOrderState>) => void
}

function PrintOptions({ order, services, onChange }: PrintOptionsProps) {
  const serviceOptions = services.map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.price} HTG${s.price_unit ? ` / ${s.price_unit}` : ""}`,
  }))

  const toggleFinishing = (id: string) => {
    const next = order.finishingIds.includes(id)
      ? order.finishingIds.filter((f) => f !== id)
      : [...order.finishingIds, id]
    onChange({ finishingIds: next })
  }

  return (
    <div className="space-y-6">
      <Select
        label="Service"
        placeholder="Choisissez un service"
        options={serviceOptions}
        value={order.serviceId}
        onChange={(e) => onChange({ serviceId: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          min={1}
          label="Nombre de pages"
          value={order.pages}
          onChange={(e) => onChange({ pages: Math.max(1, Number(e.target.value) || 1) })}
        />
        <Input
          type="number"
          min={1}
          label="Nombre de copies"
          value={order.copies}
          onChange={(e) => onChange({ copies: Math.max(1, Number(e.target.value) || 1) })}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Couleur</span>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "bw", label: "Noir & blanc" },
              { value: "color", label: "Couleur" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                order.color === opt.value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="color"
                value={opt.value}
                checked={order.color === opt.value}
                onChange={() => onChange({ color: opt.value })}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Impression</span>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "simplex", label: "Simple face" },
              { value: "duplex", label: "Recto-verso" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                order.sided === opt.value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="sided"
                value={opt.value}
                checked={order.sided === opt.value}
                onChange={() => onChange({ sided: opt.value })}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Finitions (optionnel)</span>
        <div className="space-y-2">
          {FINISHING_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={order.finishingIds.includes(option.id)}
                  onChange={() => toggleFinishing(option.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {option.label}
              </span>
              <span className="text-gray-500">+{option.cost} HTG</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

export { PrintOptions }
