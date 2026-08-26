import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addressesService } from "@/services/addresses.service"
import type { Address } from "@/types"

interface CreateAddressInput {
  userId: string
  label?: string
  street: string
  city: string
  country?: string
  phone?: string
  isDefault?: boolean
}

export function useUserAddresses(userId: string) {
  return useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => addressesService.getUserAddresses(userId),
    enabled: !!userId,
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()
  return useMutation<Address, Error, CreateAddressInput>({
    mutationFn: (input) => addressesService.createAddress(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", variables.userId] })
    },
  })
}
