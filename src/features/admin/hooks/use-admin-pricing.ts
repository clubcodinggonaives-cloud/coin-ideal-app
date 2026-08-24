import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pricingService } from "@/services/pricing.service"

export function useAdminFinishingOptions() {
  return useQuery({
    queryKey: ["admin", "finishing-options"],
    queryFn: () => pricingService.getAllFinishingOptions(),
  })
}

export function useAdminDeliveryZones() {
  return useQuery({
    queryKey: ["admin", "delivery-zones"],
    queryFn: () => pricingService.getAllDeliveryZones(),
  })
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => pricingService.getAllSettingsRows(),
  })
}

function useInvalidatePricing() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "finishing-options"] })
    queryClient.invalidateQueries({ queryKey: ["admin", "delivery-zones"] })
    queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    // Le formulaire de commande public utilise ces mêmes données live —
    // invalider aussi son cache pour refléter immédiatement le changement.
    queryClient.invalidateQueries({ queryKey: ["pricing-config"] })
  }
}

export function useCreateFinishingOption() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: pricingService.createFinishingOption,
    onSuccess: invalidate,
  })
}

export function useUpdateFinishingOption() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; label: string; cost: number }) =>
      pricingService.updateFinishingOption(id, input),
    onSuccess: invalidate,
  })
}

export function useSetFinishingOptionActive() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      pricingService.setFinishingOptionActive(id, isActive),
    onSuccess: invalidate,
  })
}

export function useCreateDeliveryZone() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: pricingService.createDeliveryZone,
    onSuccess: invalidate,
  })
}

export function useUpdateDeliveryZone() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name: string; fee: number }) =>
      pricingService.updateDeliveryZone(id, input),
    onSuccess: invalidate,
  })
}

export function useSetDeliveryZoneActive() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      pricingService.setDeliveryZoneActive(id, isActive),
    onSuccess: invalidate,
  })
}

export function useUpdateSetting() {
  const invalidate = useInvalidatePricing()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => pricingService.updateSetting(key, value),
    onSuccess: invalidate,
  })
}
