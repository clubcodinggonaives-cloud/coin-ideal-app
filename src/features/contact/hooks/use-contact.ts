import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { contactService } from "@/services/contact.service"
import type { ContactFormData } from "@/lib/validators"
import type { ContactMessageStatus } from "@/types"

/**
 * `mutationFn` distinct de `contactService.submitMessage` (au lieu d'une
 * référence directe comme ailleurs dans ce projet) uniquement pour garder
 * ce hook autonome si la validation appelante change de forme plus tard —
 * pas de raison fonctionnelle aujourd'hui.
 */
export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (data: ContactFormData) => contactService.submitMessage(data),
  })
}

export function useContactMessages() {
  return useQuery({
    queryKey: ["admin", "contact-messages"],
    queryFn: () => contactService.getMessages(),
  })
}

export function useUpdateContactMessageStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessageStatus }) =>
      contactService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contact-messages"] })
    },
  })
}

export function useReplyToContactMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => contactService.reply(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contact-messages"] })
    },
  })
}
