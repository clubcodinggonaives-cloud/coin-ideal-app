import { supabase } from "@/services/supabase/client"
import { STORAGE_BUCKETS } from "@/lib/constants"

class UploadsService {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split(".").pop()
    const filePath = `${userId}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .getPublicUrl(filePath)

    await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId)

    return data.publicUrl
  }

  async uploadServiceImage(serviceId: string, file: File): Promise<string> {
    const fileExt = file.name.split(".").pop()
    const timestamp = Date.now()
    const filePath = `${serviceId}/${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.SERVICE_IMAGES)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.SERVICE_IMAGES)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  /**
   * Téléverse le document d'une commande d'impression/copie dans le bucket
   * privé dédié. Le chemin est préfixé par l'utilisateur pour que les
   * policies Supabase Storage (voir 00023_create_storage_buckets.sql)
   * puissent restreindre l'accès au propriétaire et au personnel COIN-IDEAL.
   *
   * Ce bucket est privé (cahier des charges : "stockage privé", "accès
   * privé aux documents clients") — on ne récupère donc jamais d'URL
   * publique ici. N'utiliser que le `path` retourné, et générer une URL
   * signée à la demande via `getOrderDocumentUrl`.
   */
  async uploadOrderDocument(userId: string, file: File): Promise<{ path: string }> {
    const timestamp = Date.now()
    const filePath = `${userId}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.ORDER_DOCUMENTS)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    return { path: filePath }
  }

  /**
   * URL signée et temporaire pour consulter un document de commande.
   * `expiresInSeconds` reste court par défaut : cette URL est destinée à un
   * affichage ponctuel (ex. panneau de traitement de commande), pas à être
   * stockée ou partagée.
   */
  async getOrderDocumentUrl(path: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.ORDER_DOCUMENTS)
      .createSignedUrl(path, expiresInSeconds)

    if (error) throw error
    return data.signedUrl
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) throw error
  }
}

export const uploadsService = new UploadsService()
