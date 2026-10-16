import {requireSupabase} from '@/lib/supabase/client'
import {assetOwner, assertUploadPath, imageAssetPath, modelAssetPath, inspectImage, inspectGlb, type AssetReport} from './assetValidation'
export type Bucket = 'museum-images' | 'museum-models'
// Files are immutable; reuse successful inspection without retaining file bytes or decoded images.
const images = new WeakMap<File, Promise<AssetReport>>()
const models = new WeakMap<File, Promise<AssetReport>>()
function inspectCached(file: File, cache: WeakMap<File, Promise<AssetReport>>, inspect: (file: File) => Promise<AssetReport>) {
  const previous = cache.get(file)
  if (previous) return previous
  const result = inspect(file).catch(error => {cache.delete(file); throw error})
  cache.set(file, result)
  return result
}
export const validateImage = (file: File) => inspectCached(file, images, inspectImage)
export const validateGlb = (file: File) => inspectCached(file, models, inspectGlb)
export const storageService = {
  validateImage,
  validateGlb,
  publicUrl(bucket: Bucket, path: string) { return requireSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl },
  imagePath: imageAssetPath,
  modelPath: modelAssetPath,
  async upload(bucket: Bucket, path: string, file: File) {
    assertUploadPath(bucket, path, file)
    if (bucket === 'museum-images') await validateImage(file); else await validateGlb(file)
    const {error} = await requireSupabase().storage.from(bucket).upload(path, file, {upsert: false, contentType: bucket === 'museum-models' ? 'model/gltf-binary' : file.type, cacheControl: '3600'})
    if (error) throw error
    return path
  },
  async remove(bucket: Bucket, paths: string[]) { if (!paths.length) return; const {error} = await requireSupabase().storage.from(bucket).remove([...new Set(paths)]); if (error) throw error },
  async listItem(bucket: Bucket, id: string): Promise<string[]> {
    id = assetOwner(id)
    const result: string[] = []
    const walk = async (prefix: string) => { for (let offset = 0; ; offset += 100) { const {data, error} = await requireSupabase().storage.from(bucket).list(prefix, {limit: 100, offset}); if (error) throw error; for (const entry of data) { const path = `${prefix}/${entry.name}`; if (!entry.id) await walk(path); else result.push(path) } if (data.length < 100) break } }
    await walk(`items/${id}`); return result
  },
}
