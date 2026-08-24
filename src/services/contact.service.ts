import { supabase } from "@/services/supabase/client"
import type { ContactFormData } from "@/lib/validators"
import type { ContactMessage, ContactMessageStatus } from "@/types"

class ContactService {
  /**
   * Insertion publique — aucune session requise (cahier des charges §7 :
   * la page contact fait partie du site public). RLS
   * (`contact_messages_insert_public`, 00034) autorise l'INSERT et fixe
   * `status = 'new'` ; rien d'autre n'est accessible sans être admin/staff.
   */
  // IMPORTANT : ne jamais chaîner .select() sur cet insert. Postgres exige
  // que la ligne renvoyée par `INSERT ... RETURNING` reste visible sous les
  // policies RLS de SELECT — mais l'utilisateur anonyme n'a justement AUCUN
  // accès SELECT ici (voir 00034/00035). `.insert()` seul envoie
  // `Prefer: return=minimal`, ce que Postgres accepte ; `.insert().select()`
  // demanderait `return=representation` et l'écriture serait rejetée par
  // RLS malgré une policy INSERT valide — trouvé en testant en direct
  // pendant la Phase 5B (docs/phase-5/PHASE_5B_CONTACT_REPORT.md).
  async submitMessage(data: ContactFormData): Promise<void> {
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    })

    if (error) throw error
  }

  async getMessages(): Promise<ContactMessage[]> {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as ContactMessage[]
  }

  async updateStatus(id: string, status: ContactMessageStatus): Promise<void> {
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id)
    if (error) throw error
  }
}

export const contactService = new ContactService()
