import {requireSupabase} from '@/lib/supabase/client'
import {storageService} from './SupabaseStorageService'

export const supabaseAdminService = {
    async counts() {
        const c = requireSupabase();
        const [items, categories, profiles, published] = await Promise.all([c.from('museum_items').select('id', {
            count: 'exact',
            head: true
        }), c.from('categories').select('id', {
            count: 'exact',
            head: true
        }), c.from('profiles').select('id', {
            count: 'exact',
            head: true
        }), c.from('museum_items').select('id', {count: 'exact', head: true}).eq('status', 'published')]);
        for (const result of [items, categories, profiles, published]) if (result.error) throw result.error;
        return {
            items: items.count ?? 0,
            categories: categories.count ?? 0,
            users: profiles.count ?? 0,
            published: published.count ?? 0
        }
    },
    async users() {
        const {
            data,
            error
        } = await requireSupabase().from('profiles').select('id,email,full_name,role,created_at').order('created_at', {ascending: false});
        if (error) throw error;
        return data ?? []
    },
    async taxonomy(kind: 'categories' | 'sections') { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {data,error} = await requireSupabase().from(table).select('*').order('sort_order'); if (error) throw error; return data ?? [] },
    async saveTaxonomy(kind: 'categories' | 'sections', value: Record<string, unknown>) { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {data,error} = await requireSupabase().from(table).upsert(value as never,{onConflict:'slug'}).select().single(); if (error) throw error; return data },
    async deleteTaxonomy(kind: 'categories' | 'sections', id: string) { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {error} = await requireSupabase().from(table).delete().eq('id',id); if (error) throw error },
    async removeItem(id: string): Promise<{cleanupFailed: boolean}> { const client=requireSupabase(); let cleanupFailed=false; const {data:item}=await client.from('museum_items').select('thumbnail_path,model_path').eq('id',id).single(); const {data:gallery}=await client.from('gallery_images').select('storage_path').eq('item_id',id); try { await storageService.remove('museum-images',[item?.thumbnail_path,...(gallery ?? []).map(g=>g.storage_path)].filter((p):p is string=>Boolean(p))); await storageService.remove('museum-models',[item?.model_path].filter((p):p is string=>Boolean(p))) } catch { cleanupFailed=true } const {error}=await client.from('museum_items').delete().eq('id',id); if(error) throw error; return {cleanupFailed} },
    async setItemStatus(id: string, status: 'draft' | 'published') { const {error} = await requireSupabase().from('museum_items').update({status}).eq('id',id); if (error) throw error },
    storage: storageService,
    async updateMedia(id: string, media: {
        thumbnail_path?: string | null;
        model_path?: string | null;
        model_original_filename?: string | null;
        model_file_size?: number | null;
        galleries?: Array<string | {path:string; caption_en?:string; caption_fa?:string}>
    }) {
        const client = requireSupabase();
        const {data: old} = await client.from('museum_items').select('thumbnail_path,model_path').eq('id',id).single();
        const patch: Record<string, unknown> = {}; if (media.thumbnail_path !== undefined) patch.thumbnail_path=media.thumbnail_path; if (media.model_path !== undefined) patch.model_path=media.model_path; if (media.model_original_filename !== undefined) patch.model_original_filename=media.model_original_filename; if (media.model_file_size !== undefined) patch.model_file_size=media.model_file_size;
        const {error} = await client.from('museum_items').update(patch as never).eq('id', id);
        if (error) throw error;
        if (media.galleries?.length) {
            const {error: e} = await client.from('gallery_images').insert(media.galleries.map((entry, index) => { const path=typeof entry === 'string' ? entry : entry.path; return {item_id:id,storage_path:path,caption_en:typeof entry === 'string' ? null : entry.caption_en ?? null,caption_fa:typeof entry === 'string' ? null : entry.caption_fa ?? null,sort_order:index} }));
            if (e) throw e
        }
        const oldPaths = [old?.thumbnail_path, old?.model_path].filter((path): path is string => Boolean(path)); if (media.thumbnail_path || media.model_path) await storageService.remove('museum-images', oldPaths.filter(path => path.includes('/thumbnail/'))).catch(() => undefined); await storageService.remove('museum-models', oldPaths.filter(path => path.includes('/model'))).catch(() => undefined);
    },
    async updateGalleryImage(id: string, patch: {caption_en?: string; caption_fa?: string; sort_order?: number}) { const {error}=await requireSupabase().from('gallery_images').update(patch).eq('id',id); if(error) throw error },
    async deleteGalleryImage(id: string, storagePath?: string) { if(storagePath) await storageService.remove('museum-images',[storagePath]); const {error}=await requireSupabase().from('gallery_images').delete().eq('id',id); if(error) throw error },
    async saveDomainItem(item: import('@/types/museum').MuseumItem) {
        const client = requireSupabase();
        const [{data: category, error: categoryError}, {
            data: section,
            error: sectionError
        }] = await Promise.all([client.from('categories').select('id').eq('slug', item.category).single(), client.from('museum_sections').select('id').eq('slug', item.museumSection).single()]);
        if (categoryError) throw categoryError;
        if (sectionError) throw sectionError;
        const payload = {
            slug: item.slug,
            title_en: item.title.en,
            title_fa: item.title.fa,
            brand: item.brand,
            release_year: item.releaseYear,
            short_description_en: item.shortDescription.en,
            short_description_fa: item.shortDescription.fa,
            description_en: item.description.en,
            description_fa: item.description.fa,
            category_id: category.id,
            section_id: section.id,
            sort_order: item.sortOrder,
            status: item.status,
            featured: item.featured,
            enable_gallery: true,
            enable_ai_curator: true,
            enable_exploded_view: false,
            source_platform: item.sourcePlatform ?? null, source_url: item.sourceUrl ?? null, creator: item.creator ?? null, license: item.license ?? null, attribution_required: item.attributionRequired ?? false, attribution_text: item.attributionText ?? null,
        };
        const {
            data: saved,
            error
        } = await client.from('museum_items').upsert(payload as never, {onConflict: 'slug'}).select('id').single();
        if (error) throw error;
        await client.from('museum_item_specs').delete().eq('item_id', saved.id);
        if (item.specifications.length) {
            const {error: specError} = await client.from('museum_item_specs').insert(item.specifications.map((s, index) => ({
                item_id: saved.id,
                label_en: s.label.en,
                label_fa: s.label.fa,
                value: s.value,
                sort_order: index
            })));
            if (specError) throw specError
        }
        return saved.id as string;
    },
    async saveItem(payload: Record<string, unknown>, specs: unknown[], gallery: unknown[], expectedUpdatedAt: string | null = null) {
        const {data, error} = await requireSupabase().rpc('save_museum_item', {
            item: payload as never,
            specs: specs as never,
            gallery: gallery as never,
            expected_updated_at: expectedUpdatedAt
        });
        if (error) throw error;
        return data as string
    },
}
