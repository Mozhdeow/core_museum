import {requireSupabase} from '@/lib/supabase/client'
import {storageService} from './SupabaseStorageService'
import {createItemIntegrityService} from './itemIntegrity'
import {createAdminUsersClient} from './adminUsersClient'
import {parseContentAccess} from '@/features/auth/permissions'

const itemIntegrityService = createItemIntegrityService(requireSupabase, storageService)
const userManagement = createAdminUsersClient(requireSupabase)

export const supabaseAdminService = {
    async contentAccess() {
        const {data,error}=await requireSupabase().rpc('core_content_access')
        if(error)throw error
        return parseContentAccess(data)
    },
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
    users: userManagement.list,
    userCapabilities: userManagement.capabilities,
    manageUser: userManagement.mutate,
    reconcileUserOperation: userManagement.reconcile,
    async taxonomy(kind: 'categories' | 'sections') { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {data,error} = await requireSupabase().from(table).select('*').order('sort_order'); if (error) throw error; return data ?? [] },
    async saveTaxonomy(kind: 'categories' | 'sections', value: Record<string, unknown>) { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {data,error} = await requireSupabase().from(table).upsert(value as never,{onConflict:'slug'}).select().single(); if (error) throw error; return data },
    async deleteTaxonomy(kind: 'categories' | 'sections', id: string) { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {error} = await requireSupabase().from(table).delete().eq('id',id); if (error) throw error },
    ...itemIntegrityService,
    storage: storageService,
}
