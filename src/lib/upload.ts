import { supabase } from './supabase'
import { fileExt } from './utils'

// Uploads into "<bucket>/<user id>/<random>.<ext>" (the folder is what the storage policy checks) and returns the public URL.
export async function uploadImage(bucket: 'avatars' | 'media', uid: string, file: File) {
  const path = `${uid}/${crypto.randomUUID()}.${fileExt(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
