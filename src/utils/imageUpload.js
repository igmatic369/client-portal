import { supabase } from '../lib/supabase'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Upload an image file to Supabase Storage.
 * @param {string} siteSlug  - e.g. "ld-nails-and-spa"
 * @param {File}   file      - the file from an <input type="file">
 * @returns {Promise<string>} the public URL of the uploaded image
 */
export async function uploadImage(siteSlug, file) {
  if (file.size > MAX_SIZE) {
    throw new Error('Image must be under 5MB')
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed')
  }

  const ext = file.name.split('.').pop().toLowerCase()
  const filename = `${siteSlug}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('site-images')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('site-images')
    .getPublicUrl(filename)

  return publicUrl
}

/**
 * Delete an image from Supabase Storage.
 * Silently skips URLs that are not Supabase Storage URLs
 * (e.g. Unsplash links, local filename hashes).
 * @param {string} url - the public URL of the image to delete
 */
export async function deleteImage(url) {
  if (!url || !url.includes('.supabase.co/storage/')) return

  const match = url.match(/site-images\/(.+)$/)
  if (!match) return

  const path = match[1]
  await supabase.storage.from('site-images').remove([path])
}
