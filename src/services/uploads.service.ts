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

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) throw error
  }
}

export const uploadsService = new UploadsService()
