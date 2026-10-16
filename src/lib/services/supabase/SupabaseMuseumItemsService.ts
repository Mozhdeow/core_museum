import {requireSupabase} from '@/lib/supabase/client'
import type {MuseumItemsService} from '@/types/services'
import type {MuseumItem, MuseumSectionData} from '@/types/museum'
import type {Row} from '@/types/database.types'
import {storageService} from './SupabaseStorageService'
import {supabaseAdminService} from './SupabaseAdminService'
import {createContentQueries} from './contentQueries'

type Taxonomy = {categories: Row<'categories'>[]; sections: Row<'museum_sections'>[]}
const queries=createContentQueries(requireSupabase)
const mapSection = (s: Row<'museum_sections'>): MuseumSectionData => ({id: s.id, slug: s.slug,
  title: {en: s.title_en, fa: s.title_fa}, description: {en: s.description_en ?? '', fa: s.description_fa ?? ''}, sortOrder: s.sort_order, available: s.active})

export async function loadItems(options: {admin?: boolean; id?: string; status?: 'draft' | 'published'} = {}, taxonomy?: Promise<Taxonomy>): Promise<MuseumItem[]> {
  const client = requireSupabase()
  let query = client.from('museum_items').select('*').order('sort_order')
  if (!options.admin) query = query.eq('status', 'published')
  else if(options.status) query=query.eq('status',options.status)
  if (options.id) query = query.eq('id', options.id)
  const {data: rows, error} = await query
  if (error) throw error
  if (!rows?.length) return []
  return hydrateItems(rows,taxonomy)
}
async function hydrateItems(rows:Row<'museum_items'>[],taxonomy?:Promise<Taxonomy>,paged=false):Promise<MuseumItem[]>{
  if(!rows.length)return []
  const client=requireSupabase()
  const ids = rows.map(row => row.id)
  const [tax, specs, gallery] = await Promise.all([
    taxonomy ?? Promise.all([queries.taxonomy('categories'),queries.taxonomy('museum_sections')]).then(([categories,sections])=>{
      return {categories,sections}
    }),
    paged?queries.children('museum_item_specs',ids).then(data=>({data,error:null})):client.from('museum_item_specs').select('*').in('item_id', ids).order('sort_order'),
    paged?queries.children('gallery_images',ids).then(data=>({data,error:null})):client.from('gallery_images').select('*').in('item_id', ids).order('sort_order'),
  ])
  for (const result of [specs, gallery]) if (result.error) throw result.error
  return rows.map(row => mapItem(row, tax.categories, tax.sections, specs.data ?? [], gallery.data ?? []))
    .sort((a, b) => (tax.sections.find(s => s.id === a.sectionId)?.sort_order ?? 0) - (tax.sections.find(s => s.id === b.sectionId)?.sort_order ?? 0) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}
function mapItem(row: Row<'museum_items'>, categories: Row<'categories'>[], sections: Row<'museum_sections'>[], specs: Row<'museum_item_specs'>[], gallery: Row<'gallery_images'>[]): MuseumItem {
  const category = categories.find(c => c.id === row.category_id)
  const section = sections.find(s => s.id === row.section_id)
  return {
    id: row.id, slug: row.slug, title: {en: row.title_en, fa: row.title_fa}, brand: row.brand ?? '', releaseYear: row.release_year ?? 0,
    category: category?.slug ?? '', categoryId: row.category_id ?? '', categoryName: {en: category?.name_en ?? '', fa: category?.name_fa ?? ''},
    museumSection: section?.slug ?? '', sectionId: row.section_id ?? '', sectionTitle: {en: section?.title_en ?? '', fa: section?.title_fa ?? ''},
    shortDescription: {en: row.short_description_en ?? '', fa: row.short_description_fa ?? ''}, description: {en: row.description_en ?? '', fa: row.description_fa ?? ''},
    specifications: specs.filter(s => s.item_id === row.id).map(s => ({label: {en: s.label_en, fa: s.label_fa}, value: s.value})),
    thumbnail: row.thumbnail_path ? storageService.publicUrl('museum-images', row.thumbnail_path) : '', thumbnailPath: row.thumbnail_path,
    galleryImages: gallery.filter(g => g.item_id === row.id).map(g => ({id: g.id, url: storageService.publicUrl('museum-images', g.storage_path), storagePath: g.storage_path, caption: {en: g.caption_en ?? '', fa: g.caption_fa ?? ''}})),
    model3DUrl: row.model_path ? storageService.publicUrl('museum-models', row.model_path) : null, modelPath: row.model_path, modelOriginalFilename: row.model_original_filename, modelFileSize: row.model_file_size,
    sortOrder: row.sort_order, status: row.status, featured: row.featured, updatedAt: row.updated_at,
    enableGallery: row.enable_gallery, enableAiCurator: row.enable_ai_curator, enableExplodedView: row.enable_exploded_view,
    sourcePlatform: row.source_platform ?? '', sourceUrl: row.source_url ?? '', creator: row.creator ?? '', license: row.license ?? '', attributionRequired: row.attribution_required, attributionText: row.attribution_text ?? '',
  }
}
export const supabaseMuseumItemsService: MuseumItemsService = {
  async page(query){
    const {rows,...page}=await queries.page(query)
    const items=await hydrateItems(rows,undefined,true)
    return {...page,items:rows.map(row=>items.find(item=>item.id===row.id)!)}
  },
  async taxonomy(){
    const [categories,sections]=await Promise.all([queries.taxonomy('categories'),queries.taxonomy('museum_sections')])
    return {categories:categories.map(c=>({id:c.id,slug:c.slug,name:{en:c.name_en,fa:c.name_fa},sortOrder:c.sort_order,active:c.active})),sections:sections.map(mapSection)}
  },
  async catalog() {
    const client = requireSupabase()
    const taxonomy = Promise.all([
      client.from('categories').select('*').eq('active', true).order('sort_order'),
      client.from('museum_sections').select('*').eq('active', true).order('sort_order'),
    ]).then(([categories, sections]) => {
      if (categories.error) throw categories.error
      if (sections.error) throw sections.error
      return {categories: categories.data ?? [], sections: sections.data ?? []}
    })
    const [items, tax] = await Promise.all([loadItems({admin: false}, taxonomy), taxonomy])
    return {items, categories: tax.categories.map(c => ({id: c.id, slug: c.slug, name: {en: c.name_en, fa: c.name_fa}, sortOrder: c.sort_order, active: c.active})), sections: tax.sections.map(mapSection)}
  },
  list: loadItems,
  async get(id) { return (await loadItems({id, admin: true}))[0] },
  async save(item, options) { const id=await supabaseAdminService.saveDomainItem(item, options); return (await loadItems({id,admin:true}))[0] },
  async remove(id) { return supabaseAdminService.removeItem(id) },
  async sections(): Promise<MuseumSectionData[]> { const {data, error} = await requireSupabase().from('museum_sections').select('*').eq('active', true).order('sort_order'); if (error) throw error; return (data ?? []).map(mapSection) },
}
