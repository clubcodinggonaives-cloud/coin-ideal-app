import { useState } from "react"
import { Tag, Truck, Sliders, Plus, Save, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Skeleton, ErrorState } from "@/components/ui"
import {
  useAdminFinishingOptions,
  useAdminDeliveryZones,
  useAdminSettings,
  useCreateFinishingOption,
  useUpdateFinishingOption,
  useSetFinishingOptionActive,
  useCreateDeliveryZone,
  useUpdateDeliveryZone,
  useSetDeliveryZoneActive,
  useUpdateSetting,
} from "@/features/admin/hooks/use-admin-pricing"
import { formatCurrency } from "@/utils/format"
import type { DeliveryZone, FinishingOption, Setting } from "@/types"

/**
 * Gère finishing_options / delivery_zones / settings — les tables
 * admin-configurables introduites par 00028/00029 pour que les tarifs
 * n'aient plus besoin d'un déploiement frontend pour changer (cahier des
 * charges §4.3). Écritures directes : ces trois tables ont des policies
 * `*_admin_all` (voir docs/database/RLS_MATRIX.md), pas de RPC nécessaire —
 * contrairement à orders/payments, aucune valeur ici n'est recalculée.
 */

function FinishingOptionRow({ option }: { option: FinishingOption }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(option.label)
  const [cost, setCost] = useState(String(option.cost))
  const update = useUpdateFinishingOption()
  const setActive = useSetFinishingOptionActive()

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full sm:w-auto sm:max-w-[12rem]" />
        <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} className="w-full sm:w-auto sm:max-w-[8rem]" />
        <Button
          size="sm"
          isLoading={update.isPending}
          onClick={() =>
            update.mutate({ id: option.id, label, cost: Number(cost) }, { onSuccess: () => setEditing(false) })
          }
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900">{option.label}</p>
        <p className="truncate text-xs text-gray-500">{option.id}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-primary-700">{formatCurrency(option.cost)}</span>
        <Badge variant={option.is_active ? "success" : "secondary"}>
          {option.is_active ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={setActive.isPending}
          onClick={() => setActive.mutate({ id: option.id, isActive: !option.is_active })}
        >
          {option.is_active ? "Désactiver" : "Activer"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Modifier
        </Button>
      </div>
    </div>
  )
}

function NewFinishingOptionForm({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState("")
  const [label, setLabel] = useState("")
  const [cost, setCost] = useState("0")
  const create = useCreateFinishingOption()

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 px-4 py-3">
      <Input
        label="Identifiant"
        placeholder="ex: hole-punch"
        value={id}
        onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
        className="w-full sm:w-auto sm:max-w-[10rem]"
      />
      <Input label="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full sm:w-auto sm:max-w-[12rem]" />
      <Input
        label="Coût (HTG)"
        type="number"
        min={0}
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        className="w-full sm:w-auto sm:max-w-[8rem]"
      />
      <Button
        size="sm"
        disabled={!id || !label}
        isLoading={create.isPending}
        onClick={() => create.mutate({ id, label, cost: Number(cost) }, { onSuccess: onDone })}
      >
        <Plus className="h-4 w-4" />
        Ajouter
      </Button>
    </div>
  )
}

function DeliveryZoneRow({ zone }: { zone: DeliveryZone }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(zone.name)
  const [fee, setFee] = useState(String(zone.fee))
  const update = useUpdateDeliveryZone()
  const setActive = useSetDeliveryZoneActive()

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-auto sm:max-w-[12rem]" />
        <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="w-full sm:w-auto sm:max-w-[8rem]" />
        <Button
          size="sm"
          isLoading={update.isPending}
          onClick={() => update.mutate({ id: zone.id, name, fee: Number(fee) }, { onSuccess: () => setEditing(false) })}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="truncate font-medium text-gray-900">{zone.name}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-primary-700">{formatCurrency(zone.fee)}</span>
        <Badge variant={zone.is_active ? "success" : "secondary"}>{zone.is_active ? "Active" : "Inactive"}</Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={setActive.isPending}
          onClick={() => setActive.mutate({ id: zone.id, isActive: !zone.is_active })}
        >
          {zone.is_active ? "Désactiver" : "Activer"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Modifier
        </Button>
      </div>
    </div>
  )
}

function NewDeliveryZoneForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [fee, setFee] = useState("0")
  const create = useCreateDeliveryZone()

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 px-4 py-3">
      <Input label="Nom de la zone" placeholder="ex: Centre-ville" value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-auto sm:max-w-[12rem]" />
      <Input label="Frais (HTG)" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="w-full sm:w-auto sm:max-w-[8rem]" />
      <Button
        size="sm"
        disabled={!name}
        isLoading={create.isPending}
        onClick={() => create.mutate({ name, fee: Number(fee) }, { onSuccess: onDone })}
      >
        <Plus className="h-4 w-4" />
        Ajouter
      </Button>
    </div>
  )
}

const SETTING_LABELS: Record<string, string> = {
  color_surcharge_ratio: "Majoration couleur (multiplicateur)",
  flat_delivery_fee: "Frais de livraison forfaitaire (HTG)",
  order_document_retention_days: "Rétention des documents (jours)",
}

function SettingRow({ setting }: { setting: Setting }) {
  const [value, setValue] = useState(String(setting.value))
  const update = useUpdateSetting()
  const dirty = value !== String(setting.value)

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{SETTING_LABELS[setting.key] ?? setting.key}</p>
        {setting.description && <p className="max-w-md text-xs text-gray-500">{setting.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} className="w-full sm:w-auto sm:max-w-[8rem]" />
        <Button
          size="sm"
          disabled={!dirty}
          isLoading={update.isPending}
          onClick={() => update.mutate({ key: setting.key, value: Number(value) })}
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function AdminPricingPage() {
  const [showNewFinishing, setShowNewFinishing] = useState(false)
  const [showNewZone, setShowNewZone] = useState(false)

  const { data: finishingOptions, isLoading: loadingFinishing, error: finishingError, refetch: refetchFinishing } =
    useAdminFinishingOptions()
  const { data: deliveryZones, isLoading: loadingZones, error: zonesError, refetch: refetchZones } =
    useAdminDeliveryZones()
  const { data: settings, isLoading: loadingSettings, error: settingsError, refetch: refetchSettings } =
    useAdminSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tarifs</h1>
        <p className="text-gray-500">
          Options de finition, zones de livraison et réglages métier — modifiables sans déploiement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary-600" />
              Options de finition
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowNewFinishing((s) => !s)}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingFinishing ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : finishingError ? (
            <div className="p-4"><ErrorState onRetry={refetchFinishing} /></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(finishingOptions ?? []).map((option) => (
                <FinishingOptionRow key={option.id} option={option} />
              ))}
              {showNewFinishing && <NewFinishingOptionForm onDone={() => setShowNewFinishing(false)} />}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-600" />
              Zones de livraison
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowNewZone((s) => !s)}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingZones ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /></div>
          ) : zonesError ? (
            <div className="p-4"><ErrorState onRetry={refetchZones} /></div>
          ) : (deliveryZones ?? []).length === 0 && !showNewZone ? (
            <p className="p-4 text-sm text-gray-500">
              Aucune zone définie — le frais de livraison forfaitaire ci-dessous s'applique par défaut.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(deliveryZones ?? []).map((zone) => (
                <DeliveryZoneRow key={zone.id} zone={zone} />
              ))}
              {showNewZone && <NewDeliveryZoneForm onDone={() => setShowNewZone(false)} />}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary-600" />
            Réglages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSettings ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : settingsError ? (
            <div className="p-4"><ErrorState onRetry={refetchSettings} /></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(settings ?? []).map((setting) => (
                <SettingRow key={setting.key} setting={setting} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPricingPage
