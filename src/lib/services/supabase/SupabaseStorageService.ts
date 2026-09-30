import {requireSupabase} from '@/lib/supabase/client'
import {AppError} from '@/lib/services/errors'
export type Bucket = 'museum-images' | 'museum-models'
const imageTypes = new Map([['image/jpeg','jpg'], ['image/png','png'], ['image/webp','webp'], ['image/avif','avif'], ['image/gif','gif']])
export function validateImage(file: File) { if (!imageTypes.has(file.type) || !file.size || file.size > 10 * 1024 * 1024) throw new AppError('imageInvalid') }
export async function validateGlb(file: File) {
  if (!file.name.toLowerCase().endsWith('.glb') || !file.size || file.size > 100 * 1024 * 1024 || !['', 'model/gltf-binary', 'application/octet-stream'].includes(file.type)) throw new AppError('modelInvalid')
  const header = new DataView(await file.slice(0, 12).arrayBuffer())
  if (header.byteLength < 12 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== file.size) throw new AppError('modelInvalid')
}
export const storageService = {
  publicUrl(bucket: Bucket, path: string) { return requireSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl },
  imagePath(id: string, kind: 'thumbnail' | 'gallery', file: File) { validateImage(file); return `items/${id}/${kind}/${crypto.randomUUID()}.${imageTypes.get(file.type)}` },
  modelPath(id: string) { return `items/${id}/model-${crypto.randomUUID()}.glb` },
  async upload(bucket: Bucket, path: string, file: File) {
    if (bucket === 'museum-images') validateImage(file); else await validateGlb(file)
    const {error} = await requireSupabase().storage.from(bucket).upload(path, file, {upsert: false, contentType: bucket === 'museum-models' ? 'model/gltf-binary' : file.type, cacheControl: '3600'})
    if (error) throw error
    return path
  },
  async remove(bucket: Bucket, paths: string[]) { if (!paths.length) return; const {error} = await requireSupabase().storage.from(bucket).remove([...new Set(paths)]); if (error) throw error },
  async listItem(bucket: Bucket, id: string): Promise<string[]> {
    const result: string[] = []
    const walk = async (prefix: string) => { for (let offset = 0; ; offset += 100) { const {data, error} = await requireSupabase().storage.from(bucket).list(prefix, {limit: 100, offset}); if (error) throw error; for (const entry of data) { const path = `${prefix}/${entry.name}`; if (!entry.id) await walk(path); else result.push(path) } if (data.length < 100) break } }
    await walk(`items/${id}`); return result
  },
}
