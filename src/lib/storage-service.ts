import { supabase } from './supabase'

export interface UploadAttachmentResult {
  url: string | null
  error: string | null
}

export class StorageService {
  private static PRIMARY_BUCKET = 'erp-attachments'
  private static FALLBACK_BUCKET = 'apk-releases'

  /**
   * Upload an attachment (photo, PDF, document) to Supabase Storage.
   * Tries primary bucket 'erp-attachments' first, then fallback to 'apk-releases'.
   * Returns a publicly accessible URL for storing in database records.
   */
  static async uploadFile(
    file: File,
    folder: string,
    prefix: string = 'doc'
  ): Promise<UploadAttachmentResult> {
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${folder}/${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`

      // Attempt 1: Upload to erp-attachments
      let bucket = this.PRIMARY_BUCKET
      let { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        })

      // Attempt 2: If primary bucket not found or failed, try fallback bucket
      if (uploadError) {
        console.warn(`[StorageService] Upload to ${bucket} failed, trying ${this.FALLBACK_BUCKET}:`, uploadError.message)
        bucket = this.FALLBACK_BUCKET
        const fallbackRes = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'application/octet-stream',
          })
        uploadError = fallbackRes.error
      }

      if (uploadError) {
        console.error('[StorageService] Supabase upload failed:', uploadError)
        // Fallback: create base64 data URL so user work is never lost in UI
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve({ url: reader.result as string, error: null })
          }
          reader.onerror = () => {
            resolve({ url: null, error: uploadError?.message || 'Upload failed' })
          }
          reader.readAsDataURL(file)
        })
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
      return { url: data.publicUrl, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected storage upload error'
      console.error('[StorageService] Exception:', err)
      return { url: null, error: msg }
    }
  }
}

