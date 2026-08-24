import { useMutation, useQueryClient } from "@tanstack/react-query"
import { paymentsService } from "@/services/payments.service"
import type { PaymentMethod, PaymentStatus } from "@/types"

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      orderId: string
      amount: number
      method: PaymentMethod
      reference?: string | null
      status?: PaymentStatus
    }) => paymentsService.recordPayment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
