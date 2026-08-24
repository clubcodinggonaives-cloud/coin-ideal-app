import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersService } from "@/services/orders.service"
import type { OrderStatus } from "@/types"

export function useMyOrders(clientId: string) {
  return useQuery({
    queryKey: ["orders", "mine", clientId],
    queryFn: () => ordersService.getMyOrders(clientId),
    enabled: !!clientId,
  })
}

/** Toutes les commandes — réservé au personnel (RLS `orders_select_staff`). */
export function useAllOrders() {
  return useQuery({
    queryKey: ["orders", "all"],
    queryFn: () => ordersService.getAllOrders(),
  })
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => ordersService.getOrder(orderId),
    enabled: !!orderId,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status, note }: { orderId: string; status: OrderStatus; note?: string }) =>
      ordersService.updateOrderStatus(orderId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
