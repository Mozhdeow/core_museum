import type {SupabaseClient} from '@supabase/supabase-js'
import type {Database, Json, Row} from '@/types/database.types'
import type {MuseumItem,LocalizedText} from '@/types/museum'
import {normalizeExhibit,ExhibitValidationError} from './exhibitValidation.ts'

type Bucket = 'museum-images' | 'museum-models'
export type AssetReference = {bucket: Bucket; path: string}
export type CleanupResult = {cleanupFailed: boolean; retainedAssets: AssetReference[]}
export type SaveResult = CleanupResult & {id: string}
export type ExhibitFiles = {thumbnail?: File; model?: File; gallery?: File[]}
export type SaveStage = 'validating' | 'preparing' | 'uploading' | 'committing' | 'cleanup'
export type SaveOptions = {mode?: 'create' | 'update'; files?: ExhibitFiles; galleryCaptions?:LocalizedText[]; onStage?: (stage: SaveStage) => void}
export type MediaPatch = {
    thumbnail_path?: string | null; model_path?: string | null
    model_original_filename?: string | null; model_file_size?: number | null
    galleries?: Array<string | {path: string; caption_en?: string; caption_fa?: string}>
}
type StorageOperations = {
    validateImage(file: File): void | Promise<unknown>
    validateGlb(file: File): Promise<unknown>
    imagePath(id: string, kind: 'thumbnail' | 'gallery', file: File): string
    modelPath(id: string): string
    upload(bucket: Bucket, path: string, file: File): Promise<string>
    remove(bucket: Bucket, paths: string[]): Promise<void>
}
type Snapshot = {item: Row<'museum_items'>; specs: Row<'museum_item_specs'>[]; gallery: Row<'gallery_images'>[]}
const clean = (): CleanupResult => ({cleanupFailed: false, retainedAssets: []})
const codeOf = (error: unknown) => (error as {code?: string} | null)?.code
const failure = (message: string, code: string) => Object.assign(new Error(message), {code})

export class ExhibitSaveError extends Error {
    code?: string
    createdDraft?: Row<'museum_items'>
    cleanup: CleanupResult
    commitUncertain: boolean
    constructor(error: unknown, cleanup: CleanupResult, draft?: Row<'museum_items'>, uncertain = false) {
        super((error as {message?: string} | null)?.message ?? 'Unable to save exhibit', {cause: error})
        this.code = codeOf(error)
        this.createdDraft = draft
        this.cleanup = cleanup
        this.commitUncertain = uncertain
    }
}

function references(snapshot: Snapshot): AssetReference[] {
    return [
        ...(snapshot.item.thumbnail_path ? [{bucket: 'museum-images' as const, path: snapshot.item.thumbnail_path}] : []),
        ...(snapshot.item.model_path ? [{bucket: 'museum-models' as const, path: snapshot.item.model_path}] : []),
        ...snapshot.gallery.map(g => ({bucket: 'museum-images' as const, path: g.storage_path})),
    ]
}

// Dependency injection keeps regression tests isolated from Auth and live Supabase.
export function createItemIntegrityService(getClient: () => SupabaseClient<Database>, storage: StorageOperations) {
    async function snapshot(id: string): Promise<Snapshot> {
        const client = getClient()
        const [item, specs, gallery] = await Promise.all([
            client.from('museum_items').select('*').eq('id', id).single(),
            client.from('museum_item_specs').select('*').eq('item_id', id).order('sort_order'),
            client.from('gallery_images').select('*').eq('item_id', id).order('sort_order'),
        ])
        for (const result of [item, specs, gallery]) if (result.error) throw result.error
        if (!item.data) throw failure('Item not found', 'P0002')
        return {item: item.data, specs: specs.data ?? [], gallery: gallery.data ?? []}
    }

    async function cleanupAssets(candidates: AssetReference[]): Promise<CleanupResult> {
        const unique = [...new Map(candidates.map(asset => [`${asset.bucket}:${asset.path}`, asset])).values()]
        const result = clean()
        if (!unique.length) return result
        try {
            // A visitor could see zero draft references through RLS. Never treat that as absence.
            const admin = await getClient().rpc('is_admin')
            if (admin.error || admin.data !== true) throw admin.error ?? failure('Admin required for cleanup', '42501')
        } catch {
            return {cleanupFailed: true, retainedAssets: unique}
        }
        for (const asset of unique) {
            try {
                const client = getClient()
                const checks = asset.bucket === 'museum-images' ? [
                    client.from('museum_items').select('id', {count: 'exact', head: true}).eq('thumbnail_path', asset.path),
                    client.from('gallery_images').select('id', {count: 'exact', head: true}).eq('storage_path', asset.path),
                ] : [client.from('museum_items').select('id', {count: 'exact', head: true}).eq('model_path', asset.path)]
                const counts = await Promise.all(checks)
                if (counts.some(check => check.error || !Number.isInteger(check.count))) throw new Error('Cannot verify asset references')
                if (counts.some(check => (check.count ?? 0) > 0)) result.retainedAssets.push(asset)
                else await storage.remove(asset.bucket, [asset.path])
            } catch {
                result.cleanupFailed = true
                result.retainedAssets.push(asset)
            }
        }
        return result
    }

    async function saveItem(payload: Record<string, unknown>, specs: unknown[], gallery: unknown[], expectedUpdatedAt: string | null = null) {
        if (!payload.id || !expectedUpdatedAt) throw failure('Reload the item before saving; its version is required', '40001')
        const {data, error} = await getClient().rpc('save_museum_item', {
            item: payload as Json, specs: specs as Json, gallery: gallery as Json,
            expected_updated_at: expectedUpdatedAt,
        })
        if (error) throw error
        if (data !== payload.id) throw new Error('Save response did not confirm the requested item')
        return data
    }

    async function saveExhibit(item: MuseumItem, options: SaveOptions = {}): Promise<SaveResult> {
        const mode = options.mode ?? (item.id ? 'update' : 'create')
        const files = options.files ?? {}
        const id = item.id || crypto.randomUUID()
        let draft: Row<'museum_items'> | undefined
        let insertAttempted = false
        let commitAttempted = false
        const attempted: AssetReference[] = []
        // Reporting must never change transaction or cleanup behavior.
        const stage = (value: SaveStage) => {try {options.onStage?.(value)} catch { /* UI observer only */ }}
        try {
            // Validate every file before creating a draft or uploading anything.
            stage('validating')
            const existingGalleryCount=item.galleryImages.length
            const normalized=normalizeExhibit({...item,galleryImages:[...item.galleryImages,...(files.gallery??[]).map((_,index)=>({id:'',url:'',caption:options.galleryCaptions?.[index]??{en:'',fa:''}}))]})
            const pendingCaptions=normalized.galleryImages.slice(existingGalleryCount).map(image=>image.caption)
            item={...normalized,galleryImages:normalized.galleryImages.slice(0,existingGalleryCount)}
            if (files.thumbnail) await storage.validateImage(files.thumbnail)
            for (const file of files.gallery ?? []) await storage.validateImage(file)
            if (files.model) await storage.validateGlb(files.model)
            stage('preparing')
            const before = mode === 'update' ? await snapshot(id) : undefined
            if (before && (!item.updatedAt || item.updatedAt !== before.item.updated_at)) {
                throw failure('Item changed; reload before saving', '40001')
            }
            const client = getClient()
            const resolveTaxonomy=async(table:'categories'|'museum_sections',selectedId:string|undefined,slug:string,previousId:string|null|undefined)=>{
                if(selectedId==='' || (selectedId===undefined && !slug)){
                    if(item.status==='published')throw new ExhibitValidationError([{field:table==='categories'?'categoryId':'sectionId',key:'taxonomyMissing'}])
                    return null
                }
                const request=client.from(table).select('id,active').eq(selectedId===undefined?'slug':'id',selectedId ?? slug)
                const {data,error}=await request.single()
                if(error){if(error.code==='PGRST116')throw new ExhibitValidationError([{field:table==='categories'?'categoryId':'sectionId',key:'taxonomyMissing'}]);throw error}
                if(!data)throw new ExhibitValidationError([{field:table==='categories'?'categoryId':'sectionId',key:'taxonomyMissing'}])
                if(!data.active && (item.status==='published'||data.id!==previousId))throw new ExhibitValidationError([{field:table==='categories'?'categoryId':'sectionId',key:'taxonomyInactive'}])
                return data.id
            }
            const [categoryId,sectionId]=await Promise.all([
                resolveTaxonomy('categories',item.categoryId,item.category,before?.item.category_id),
                resolveTaxonomy('museum_sections',item.sectionId,item.museumSection,before?.item.section_id),
            ])
            const payload = {
                id, slug: item.slug, title_en: item.title.en, title_fa: item.title.fa,
                brand: item.brand, release_year: item.releaseYear,
                short_description_en: item.shortDescription.en, short_description_fa: item.shortDescription.fa,
                description_en: item.description.en, description_fa: item.description.fa,
                category_id: categoryId, section_id: sectionId,
                sort_order: item.sortOrder, status: item.status, featured: item.featured,
                enable_gallery: item.enableGallery ?? before?.item.enable_gallery ?? true,
                enable_ai_curator: item.enableAiCurator ?? before?.item.enable_ai_curator ?? true,
                enable_exploded_view: item.enableExplodedView ?? before?.item.enable_exploded_view ?? false,
                thumbnail_path: item.thumbnailPath === undefined ? before?.item.thumbnail_path ?? null : item.thumbnailPath,
                model_path: item.modelPath === undefined ? before?.item.model_path ?? null : item.modelPath,
                model_original_filename: item.modelOriginalFilename === undefined ? before?.item.model_original_filename ?? null : item.modelOriginalFilename,
                model_file_size: item.modelFileSize === undefined ? before?.item.model_file_size ?? null : item.modelFileSize,
                source_platform: item.sourcePlatform ?? null, source_url: item.sourceUrl ?? null,
                creator: item.creator ?? null, license: item.license ?? null,
                attribution_required: item.attributionRequired ?? false, attribution_text: item.attributionText ?? null,
            }
            const specs = item.specifications.map(s => ({label_en: s.label.en, label_fa: s.label.fa, value: s.value}))
            const gallery = item.galleryImages.map(g => {
                if (!g.storagePath) throw new Error('Gallery entries must retain their Storage path')
                return {id: g.id, storage_path: g.storagePath, caption_en: g.caption.en, caption_fa: g.caption.fa}
            })
            if (mode === 'create') {
                // The existing RPC cannot create. Insert a recoverable, unpublished draft first.
                // INSERT (never upsert) preserves the unique-slug constraint.
                insertAttempted = true
                const created = await client.from('museum_items').insert({...payload, status: 'draft',
                    thumbnail_path: null, model_path: null, model_original_filename: null, model_file_size: null}).select('*').single()
                if (created.error) throw created.error
                if (!created.data) throw new Error('Draft creation was not confirmed; inspect the item list before retrying')
                draft = created.data
            }
            async function upload(bucket: Bucket, path: string, file: File) {
                stage('uploading')
                // Include an attempted upload: a lost response can follow a successful Storage write.
                attempted.push({bucket, path})
                await storage.upload(bucket, path, file)
                return path
            }
            if (files.thumbnail) payload.thumbnail_path = await upload('museum-images', storage.imagePath(id, 'thumbnail', files.thumbnail), files.thumbnail)
            for (const [index,file] of (files.gallery ?? []).entries()) gallery.push({id: crypto.randomUUID(),
                storage_path: await upload('museum-images', storage.imagePath(id, 'gallery', file), file), caption_en: pendingCaptions[index].en, caption_fa: pendingCaptions[index].fa})
            if (files.model) {
                payload.model_path = await upload('museum-models', storage.modelPath(id), files.model)
                payload.model_original_filename = files.model.name
                payload.model_file_size = files.model.size
            }
            commitAttempted = true
            stage('committing')
            await saveItem(payload, specs, gallery, before?.item.updated_at ?? draft!.updated_at)
            const afterReferences = [
                ...(payload.thumbnail_path ? [{bucket: 'museum-images' as const, path: payload.thumbnail_path}] : []),
                ...(payload.model_path ? [{bucket: 'museum-models' as const, path: payload.model_path}] : []),
                ...gallery.map(g => ({bucket: 'museum-images' as const, path: g.storage_path})),
            ]
            const superseded = (before ? references(before) : []).filter(old => !afterReferences.some(next => next.bucket === old.bucket && next.path === old.path))
            stage('cleanup')
            return {id, ...await cleanupAssets(superseded)}
        } catch (error) {
            // SQL errors explicitly reject the transaction. Network/unknown failures may have committed.
            // Never delete uploads while the server could still commit references to them.
            const uncertain = (commitAttempted || (insertAttempted && !draft)) && !/^[0-9A-Z]{5}$/.test(codeOf(error) ?? '')
            const cleanup = uncertain ? {cleanupFailed: attempted.length > 0, retainedAssets: attempted}
                : await cleanupAssets(attempted)
            throw new ExhibitSaveError(error, cleanup, draft, uncertain)
        }
    }

    async function commitSnapshot(before: Snapshot, patch: Record<string, unknown>, gallery = before.gallery): Promise<CleanupResult> {
        await saveItem({...before.item, ...patch}, before.specs, gallery, before.item.updated_at)
        const after = {...before, item: {...before.item, ...patch} as Row<'museum_items'>, gallery}
        const kept = references(after)
        return cleanupAssets(references(before).filter(old => !kept.some(next => next.bucket === old.bucket && next.path === old.path)))
    }

    return {
        saveExhibit, saveItem,
        async saveDomainItem(item: MuseumItem, options?: SaveOptions) { return (await saveExhibit(item, options)).id },
        async updateMedia(id: string, media: MediaPatch) {
            const before = await snapshot(id)
            const {galleries, ...fields} = media
            const patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
            const gallery = [...before.gallery, ...(galleries ?? []).map((g, index) => ({
                id: crypto.randomUUID(), item_id: id, storage_path: typeof g === 'string' ? g : g.path,
                caption_en: typeof g === 'string' ? null : g.caption_en ?? null,
                caption_fa: typeof g === 'string' ? null : g.caption_fa ?? null,
                sort_order: before.gallery.length + index, created_at: '', updated_at: '',
            }))]
            return commitSnapshot(before, patch, gallery)
        },
        async setItemStatus(id: string, status: 'draft' | 'published') { return commitSnapshot(await snapshot(id), {status}) },
        async updateGalleryImage(id: string, patch: {caption_en?: string; caption_fa?: string; sort_order?: number}) {
            const row = await getClient().from('gallery_images').select('*').eq('id', id).single()
            if (row.error) throw row.error
            if (!row.data) throw new Error('Gallery image not found')
            const before = await snapshot(row.data.item_id)
            const gallery = before.gallery.map(g => g.id === id ? {...g, ...patch} : g).sort((a, b) => a.sort_order - b.sort_order)
            return commitSnapshot(before, {}, gallery)
        },
        async deleteGalleryImage(id: string, _storagePath?: string) {
            // Read the authoritative path. A caller-supplied path must not authorize deletion.
            void _storagePath
            const row = await getClient().from('gallery_images').select('*').eq('id', id).single()
            if (row.error) throw row.error
            if (!row.data) throw new Error('Gallery image not found')
            const before = await snapshot(row.data.item_id)
            return commitSnapshot(before, {}, before.gallery.filter(g => g.id !== id))
        },
        async removeItem(id: string): Promise<CleanupResult> {
            const before = await snapshot(id)
            // Version guard avoids silently deleting a concurrently changed item.
            const deleted = await getClient().from('museum_items').delete().eq('id', id)
                .eq('updated_at', before.item.updated_at).select('id').single()
            if (deleted.error) throw deleted.error
            if (!deleted.data) throw failure('Item changed or was removed; reload before deleting', '40001')
            // Only a confirmed database deletion permits any Storage removal.
            return cleanupAssets(references(before))
        },
    }
}
