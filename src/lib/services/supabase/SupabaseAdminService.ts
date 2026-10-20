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
    async saveTaxonomy(kind: 'categories' | 'sections', value: Record<string, unknown>, expected?:Record<string,unknown>|null) {
        const table = kind === 'categories' ? 'categories' : 'museum_sections',client=requireSupabase()
        // Optional optimistic concurrency preserves existing callers and the database contract.
        let query=expected?client.from(table).update(value as never).eq('id',String(expected.id))
            :expected===null?client.from(table).insert(value as never):client.from(table).upsert(value as never,{onConflict:'slug'})
        if(expected?.updated_at)query=query.eq('updated_at',String(expected.updated_at))
        if(expected&&!expected.updated_at){
            for(const key of ['slug','sort_order','active',...(kind==='categories'?['name_en','name_fa']:['title_en','title_fa','description_en','description_fa'])]){
                query=expected[key]==null?query.is(key,null):query.eq(key,expected[key] as never)
            }
        }
        const {data,error}=await query.select().single()
        if(expected&&error?.code==='PGRST116')throw Object.assign(new Error('The taxonomy record changed; reload before saving'),{code:'40001'})
        if(error)throw error
        return data
    },
    async deleteTaxonomy(kind: 'categories' | 'sections', id: string) { const table = kind === 'categories' ? 'categories' : 'museum_sections'; const {error} = await requireSupabase().from(table).delete().eq('id',id); if (error) throw error },
    ...itemIntegrityService,
    storage: storageService,
}
