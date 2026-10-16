import type {SupabaseClient} from '@supabase/supabase-js'
import type {Database,Row} from '../../../types/database.types.ts'
import type {ExhibitQuery} from '../../../types/services.ts'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const defaultExhibitQuery:ExhibitQuery={page:1,perPage:25,search:'',status:'all',categoryId:'all',sectionId:'all'}
export function validateExhibitQuery(query:ExhibitQuery):ExhibitQuery{
    if(!Number.isSafeInteger(query.page)||query.page<1||query.page>100000||![10,25,50].includes(query.perPage)
        ||typeof query.search!=='string'||query.search.length>200||[...query.search].some(c=>c.charCodeAt(0)<32)
        ||!['all','draft','published'].includes(query.status)
        ||![query.categoryId,query.sectionId].every(id=>id==='all'||id==='none'||uuid.test(id)))throw new Error('Invalid exhibit query')
    return {...query,search:query.search.trim()}
}
export function exhibitSearchFilter(search:string){
    // Literal, unanchored case-insensitive regex; quote the PostgREST value separately.
    const literal=search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    return ['title_en','title_fa','slug','brand'].map(column=>`${column}.imatch.${JSON.stringify(literal)}`).join(',')
}
export function createContentQueries(getClient:()=>SupabaseClient<Database>){
    async function readAll<T>(request:(from:number,to:number)=>PromiseLike<{data:unknown[]|null;error:unknown;count:number|null}>):Promise<T[]>{
        const result:T[]=[]
        for(let offset=0;;){
            const {data,error,count}=await request(offset,offset+499)
            if(error)throw error
            if(count===null||!Number.isSafeInteger(count)||count<0)throw new Error('Content count unavailable')
            // Callers select complete rows from the named table below.
            const rows=(data??[]) as T[]
            result.push(...rows);offset+=rows.length
            if(offset>=count)return result
            if(!rows.length)throw new Error('Incomplete content response')
        }
    }
    return {
        async page(input:ExhibitQuery){
            const query=validateExhibitQuery(input)
            let request=getClient().from('museum_items').select('*',{count:'exact'}).order('sort_order').order('id')
            if(query.status!=='all')request=request.eq('status',query.status)
            if(query.categoryId!=='all')request=query.categoryId==='none'?request.is('category_id',null):request.eq('category_id',query.categoryId)
            if(query.sectionId!=='all')request=query.sectionId==='none'?request.is('section_id',null):request.eq('section_id',query.sectionId)
            if(query.search)request=request.or(exhibitSearchFilter(query.search))
            const from=(query.page-1)*query.perPage
            const {data,error,count}=await request.range(from,from+query.perPage-1)
            if(error)throw error
            if(!Number.isSafeInteger(count)||count===null||count<0)throw new Error('Exhibit count unavailable')
            const rows=data??[]
            if(rows.length<Math.min(query.perPage,Math.max(0,count-from)))throw new Error('Incomplete exhibit page')
            return {rows,total:count,page:query.page,perPage:query.perPage}
        },
        taxonomy:<T extends 'categories'|'museum_sections'>(table:T)=>readAll<Row<T>>((from,to)=>getClient().from(table).select('*',{count:'exact'}).order('sort_order').order('id').range(from,to)),
        children:<T extends 'museum_item_specs'|'gallery_images'>(table:T,ids:string[])=>readAll<Row<T>>((from,to)=>getClient().from(table as 'museum_item_specs'|'gallery_images').select('*',{count:'exact'}).in('item_id',ids).order('sort_order').order('id').range(from,to)),
    }
}
