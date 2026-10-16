import {test} from 'node:test'
import assert from 'node:assert/strict'
import type {SupabaseClient} from '@supabase/supabase-js'
import type {Database} from '../src/types/database.types.ts'
import type {MuseumItem} from '../src/types/museum.ts'
import {createItemIntegrityService, ExhibitSaveError} from '../src/lib/services/supabase/itemIntegrity.ts'

type RecordData = Record<string, unknown>
type Result = {data: unknown; error: {message: string; code?: string} | null; count: number | null}
const ID = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-10-13T00:00:00.000001+00:00'
const thumbnail = `items/${ID}/thumbnail/old.png`
const model = `items/${ID}/model-old.glb`
const galleryPath = `items/${ID}/gallery/old.png`
const sqlError = (code: string, message = code) => ({code, message})

// This fake exercises the real orchestration without credentials, browser or live writes.
// It models the inspected existing RPC's row lock/version check and atomic replacement.
class FakeDatabase {
    tables: Record<string, RecordData[]> = {
        museum_items: [{id: ID, slug: 'original', title_en: 'CPU', title_fa: 'پردازنده',
            status: 'published', category_id: 'category', section_id: 'section', sort_order: 1,
            thumbnail_path: thumbnail, model_path: model, model_original_filename: 'old.glb', model_file_size: 12,
            enable_gallery: false, enable_ai_curator: false, enable_exploded_view: true, updated_at: VERSION}],
        museum_item_specs: [{id: 'spec', item_id: ID, label_en: 'Memory', label_fa: 'حافظه', value: 'old', sort_order: 0}],
        gallery_images: [{id: 'gallery', item_id: ID, storage_path: galleryPath, caption_en: 'old', caption_fa: 'قدیمی', sort_order: 0}],
        categories: [{id: 'category', slug: 'cpu', active: true}], museum_sections: [{id: 'section', slug: 'cpu', active: true}],
    }
    events: string[] = []
    admin = true
    rejectRpc: {message: string; code?: string} | null = null
    rejectQuery: {table: string; action: string; head?: boolean} | null = null
    beforeRpc?: () => void
    beforeDelete?: () => void
    loseRpcResponse = false
    loseInsertResponse = false
    version = 1
    from(table: string) { return new FakeQuery(this, table) }
    async rpc(name: string, args?: RecordData): Promise<Result> {
        this.events.push(`rpc:${name}`)
        if (name === 'is_admin') return {data: this.admin, error: null, count: null}
        this.beforeRpc?.()
        this.beforeRpc = undefined
        if (!this.admin) return {data: null, error: sqlError('42501'), count: null}
        if (this.rejectRpc) return {data: null, error: this.rejectRpc, count: null}
        const payload = args!.item as RecordData
        const current = this.tables.museum_items.find(row => row.id === payload.id)
        if (!current) return {data: null, error: sqlError('P0002'), count: null}
        if (args!.expected_updated_at !== current.updated_at) return {data: null, error: sqlError('40001'), count: null}
        if (this.tables.museum_items.some(row => row.id !== payload.id && row.slug === payload.slug)) {
            return {data: null, error: sqlError('23505'), count: null}
        }
        const specs = args!.specs as RecordData[]
        const gallery = args!.gallery as RecordData[]
        // Simulate a child constraint failure before committing any part of the RPC.
        if (specs.some(spec => spec.value === 'INVALID')) return {data: null, error: sqlError('23514'), count: null}
        Object.assign(current, payload, {updated_at: `2026-10-13T00:00:00.00000${++this.version}+00:00`})
        this.tables.museum_item_specs = [...this.tables.museum_item_specs.filter(row => row.item_id !== payload.id),
            ...specs.map((spec, index) => ({...spec, item_id: payload.id, sort_order: index}))]
        this.tables.gallery_images = [...this.tables.gallery_images.filter(row => row.item_id !== payload.id),
            ...gallery.map((image, index) => ({...image, item_id: payload.id, sort_order: index}))]
        this.events.push('commit')
        if (this.loseRpcResponse) return {data: null, error: {message: 'Network response lost'}, count: null}
        return {data: payload.id, error: null, count: null}
    }
}

class FakeQuery implements PromiseLike<Result> {
    db: FakeDatabase
    table: string
    action = 'select'
    filters: Array<[string, unknown]> = []
    payload?: RecordData
    head = false
    one = false
    constructor(db: FakeDatabase, table: string) {this.db = db; this.table = table}
    select(_columns?: string, options?: {head?: boolean}) {this.head = options?.head ?? false; return this}
    eq(column: string, value: unknown) {this.filters.push([column, value]); return this}
    order() {return this}
    single() {this.one = true; return this}
    insert(payload: RecordData) {this.action = 'insert'; this.payload = payload; return this}
    delete() {this.action = 'delete'; return this}
    then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve().then(() => this.execute()).then(onfulfilled, onrejected)
    }
    execute(): Result {
        const db = this.db
        db.events.push(`${this.action}:${this.table}${this.head ? ':references' : ''}`)
        const rejection = db.rejectQuery
        if (rejection?.table === this.table && rejection.action === this.action && (rejection.head === undefined || rejection.head === this.head)) {
            return {data: null, error: sqlError('42501'), count: null}
        }
        if (this.action === 'delete') { db.beforeDelete?.(); db.beforeDelete = undefined }
        let rows = db.tables[this.table].filter(row => this.filters.every(([key, value]) => row[key] === value))
        if (this.action === 'insert') {
            if (db.tables[this.table].some(row => row.id === this.payload!.id || row.slug === this.payload!.slug)) {
                return {data: null, error: sqlError('23505'), count: null}
            }
            rows = [{...this.payload, updated_at: VERSION}]
            db.tables[this.table].push(...rows)
            if (db.loseInsertResponse) return {data: null, error: {message: 'Network response lost'}, count: null}
        }
        if (this.action === 'delete') {
            db.tables[this.table] = db.tables[this.table].filter(row => !rows.includes(row))
            if (this.table === 'museum_items') for (const child of ['museum_item_specs', 'gallery_images']) {
                db.tables[child] = db.tables[child].filter(row => !rows.some(item => item.id === row.item_id))
            }
        }
        if (this.one && rows.length !== 1) return {data: null, error: sqlError('PGRST116'), count: null}
        return {data: this.head ? null : structuredClone(this.one ? rows[0] : rows), error: null, count: rows.length}
    }
}

function fixture() {
    const db = new FakeDatabase()
    const stored = new Set([`museum-images:${thumbnail}`, `museum-models:${model}`, `museum-images:${galleryPath}`])
    let serial = 0
    let uploads = 0
    const controls = {failUpload: 0, failRemove: false, invalidFile: false}
    const storage = {
        async validateImage() {if (controls.invalidFile) throw new Error('Invalid image')},
        async validateGlb() {if (controls.invalidFile) throw new Error('Invalid model')},
        imagePath(id: string, kind: string) {return `items/${id}/${kind}/new-${++serial}.png`},
        modelPath(id: string) {return `items/${id}/model-new-${++serial}.glb`},
        async upload(bucket: string, path: string) {
            db.events.push(`upload:${bucket}:${path}`)
            stored.add(`${bucket}:${path}`)
            if (++uploads === controls.failUpload) throw new Error('Upload response failed')
            return path
        },
        async remove(bucket: string, paths: string[]) {
            for (const path of paths) {
                db.events.push(`remove:${bucket}:${path}`)
                if (controls.failRemove) throw new Error('Storage unavailable')
                stored.delete(`${bucket}:${path}`)
            }
        },
    }
    const service = createItemIntegrityService(() => db as unknown as SupabaseClient<Database>, storage)
    const item: MuseumItem = {id: ID, slug: 'original', title: {en: 'CPU', fa: 'پردازنده'}, brand: 'CORE',
        releaseYear: 2026, category: 'cpu', museumSection: 'cpu', status: 'published', sortOrder: 1, featured: false,
        shortDescription: {en: '', fa: ''}, description: {en: '', fa: ''},
        specifications: [{label: {en: 'Memory', fa: 'حافظه'}, value: 'new'}],
        thumbnail: '', model3DUrl: null, thumbnailPath: thumbnail, modelPath: model,
        galleryImages: [{id: 'gallery', url: '', storagePath: galleryPath, caption: {en: 'old', fa: 'قدیمی'}}], updatedAt: VERSION}
    return {db, service, stored, controls, item, storage}
}
const image = () => new File(['image'], 'replacement.png', {type: 'image/png'})
const glb = () => new File(['glb'], 'replacement.glb', {type: 'model/gltf-binary'})
const noRemovals = (db: FakeDatabase) => assert.equal(db.events.some(event => event.startsWith('remove:')), false)

test('CMS category and section UUIDs survive renamed slugs without remapping to reused slugs',async()=>{
    const {db,service,item}=fixture()
    db.tables.categories[0].slug='new-category';db.tables.museum_sections[0].slug='new-section'
    db.tables.categories.push({id:'unrelated-category',slug:'cpu',active:true})
    db.tables.museum_sections.push({id:'unrelated-section',slug:'cpu',active:true})
    await service.saveExhibit({...item,categoryId:'category',sectionId:'section'})
    assert.equal(db.tables.museum_items[0].category_id,'category');assert.equal(db.tables.museum_items[0].section_id,'section')
})
test('CMS deleted UUID never falls back to an old slug or uploads files',async()=>{
    const {db,service,item}=fixture()
    await assert.rejects(service.saveExhibit({...item,categoryId:'deleted',sectionId:'section'},{files:{thumbnail:image()}}),{code:'CMS_VALIDATION'})
    assert.equal(db.events.some(event=>event.startsWith('upload:')||event==='rpc:save_museum_item'),false)
})
test('CMS inactive current placements can be retained in drafts but cannot be published',async()=>{
    const {db,service,item}=fixture()
    db.tables.categories[0].active=false;db.tables.museum_sections[0].active=false
    await service.saveExhibit({...item,status:'draft',categoryId:'category',sectionId:'section'})
    const version=db.tables.museum_items[0].updated_at as string
    await assert.rejects(service.saveExhibit({...item,updatedAt:version,categoryId:'category',sectionId:'section'}),{code:'CMS_VALIDATION'})
    assert.equal(db.tables.museum_items[0].status,'draft')
})
test('CMS drafts cannot newly select inactive taxonomy',async()=>{
    const {db,service,item}=fixture()
    db.tables.categories.push({id:'inactive',slug:'inactive',active:false})
    await assert.rejects(service.saveExhibit({...item,status:'draft',categoryId:'inactive',sectionId:'section'}),{code:'CMS_VALIDATION'})
    assert.equal(db.tables.museum_items[0].category_id,'category')
})
test('CMS explicit unassignment keeps a draft even with legacy slugs; publishing requires placement',async()=>{
    const {db,service,item}=fixture()
    await service.saveExhibit({...item,status:'draft',categoryId:'',sectionId:''})
    assert.equal(db.tables.museum_items[0].category_id,null);assert.equal(db.tables.museum_items[0].section_id,null)
    await assert.rejects(service.saveExhibit({...item,updatedAt:db.tables.museum_items[0].updated_at as string,categoryId:'',sectionId:''}),{code:'CMS_VALIDATION'})
    assert.equal(db.tables.museum_items[0].status,'draft')
})
test('CMS required metadata and queued gallery limits fail before database reads, drafts or uploads',async()=>{
    const {db,service,item}=fixture()
    await assert.rejects(service.saveExhibit({...item,title:{en:' ',fa:''}},{files:{thumbnail:image()}}),{code:'CMS_VALIDATION'})
    await assert.rejects(service.saveExhibit(item,{files:{gallery:Array.from({length:100},image)}}),{code:'CMS_VALIDATION'})
    assert.deepEqual(db.events,[])
})
test('CMS publish and unpublish preserve ID and use one atomic versioned RPC per save',async()=>{
    const {db,service,item}=fixture()
    await service.saveExhibit({...item,status:'draft'})
    await service.saveExhibit({...item,updatedAt:db.tables.museum_items[0].updated_at as string,status:'published'})
    assert.equal(db.tables.museum_items.length,1);assert.equal(db.tables.museum_items[0].id,ID)
    assert.equal(db.events.filter(event=>event==='rpc:save_museum_item').length,2)
    assert.equal(db.tables.museum_items[0].status,'published')
})
test('CMS specification and gallery order, bilingual captions and cleared source metadata reach the RPC',async()=>{
    const {db,service,item}=fixture()
    await service.saveExhibit({...item,sourceUrl:'',specifications:[{label:{en:' Clock ',fa:' فرکانس '},value:' 1 MHz '},...item.specifications],galleryImages:[{...item.galleryImages[0],caption:{en:' New ',fa:' جدید '}}]})
    assert.deepEqual(db.tables.museum_item_specs.map(s=>[s.label_en,s.label_fa,s.value,s.sort_order]),[['Clock','فرکانس','1 MHz',0],['Memory','حافظه','new',1]])
    assert.equal(db.tables.gallery_images[0].caption_fa,'جدید');assert.equal(db.tables.museum_items[0].source_url,'')
})
test('CMS queued gallery captions are normalized and committed in upload order, with preflight limits',async()=>{
    const {db,service,item}=fixture()
    await service.saveExhibit(item,{files:{gallery:[image(),image()]},galleryCaptions:[{en:' Second ',fa:' دوم '},{en:' First ',fa:' اول '}]})
    assert.deepEqual(db.tables.gallery_images.map(image=>[image.caption_en,image.caption_fa]),[['old','قدیمی'],['Second','دوم'],['First','اول']])
    const another=fixture()
    await assert.rejects(another.service.saveExhibit(another.item,{files:{gallery:[image()]},galleryCaptions:[{en:'a'.repeat(1001),fa:''}]}),{code:'CMS_VALIDATION'})
    assert.deepEqual(another.db.events,[])
})

test('renaming an existing exhibit preserves ID, children, assets and feature flags', async () => {
    const {db, service, item, stored} = fixture()
    const result = await service.saveExhibit({...item, slug: 'renamed'})
    assert.equal(result.id, ID)
    assert.equal(db.tables.museum_items.length, 1)
    assert.equal(db.tables.museum_items[0].slug, 'renamed')
    assert.equal(db.tables.museum_items[0].enable_gallery, false)
    assert.equal(db.tables.museum_items[0].enable_exploded_view, true)
    assert.equal(db.tables.gallery_images[0].storage_path, galleryPath)
    assert.equal(stored.size, 3)
    assert.equal(db.events.includes('insert:museum_items'), false)
})

test('unique slug conflict never overwrites another item or changes the original', async () => {
    const {db, service, item} = fixture()
    db.tables.museum_items.push({id: 'another', slug: 'taken'})
    const before = structuredClone(db.tables)
    await assert.rejects(service.saveExhibit({...item, slug: 'taken'}), {code: '23505'})
    assert.deepEqual(db.tables, before)
    noRemovals(db)
})

test('failed child save rolls back metadata, status, specs and gallery together', async () => {
    const {db, service, item} = fixture()
    const before = structuredClone(db.tables)
    await assert.rejects(service.saveExhibit({...item, slug: 'changed', status: 'draft',
        galleryImages: [], specifications: [{label: {en: 'Memory', fa: 'حافظه'}, value: 'INVALID'}]}), {code: '23514'})
    assert.deepEqual(db.tables, before)
    noRemovals(db)
})

test('missing existing ID cannot fall back to inserting a duplicate', async () => {
    const {db, service, item} = fixture()
    await assert.rejects(service.saveDomainItem({...item, id: 'missing'}))
    assert.equal(db.tables.museum_items.length, 1)
    assert.equal(db.events.includes('insert:museum_items'), false)
})

test('an existing-item save requires the loaded optimistic concurrency version', async () => {
    const {db, service, item} = fixture()
    await assert.rejects(service.saveExhibit({...item, updatedAt: undefined}), {code: '40001'})
    assert.equal(db.events.includes('rpc:save_museum_item'), false)
})

test('a concurrent edit after the snapshot is rejected by RPC, preserving the winner', async () => {
    const {db, service, item, stored} = fixture()
    db.beforeRpc = () => Object.assign(db.tables.museum_items[0], {slug: 'winner', updated_at: 'newer-version'})
    await assert.rejects(service.saveExhibit({...item, slug: 'loser'}, {files: {thumbnail: image()}}), {code: '40001'})
    assert.equal(db.tables.museum_items[0].slug, 'winner')
    assert.equal(db.tables.museum_items[0].thumbnail_path, thumbnail)
    assert.equal(stored.size, 3)
})

test('thumbnail replacement commits first and never removes the model or gallery', async () => {
    const {db, service, item, stored} = fixture()
    await service.saveExhibit(item, {files: {thumbnail: image()}})
    assert.equal(stored.has(`museum-images:${thumbnail}`), false)
    assert.equal(stored.has(`museum-models:${model}`), true)
    assert.equal(stored.has(`museum-images:${galleryPath}`), true)
    assert.ok(db.events.indexOf('commit') < db.events.findIndex(event => event.startsWith('remove:')))
})

test('model replacement never removes thumbnails or gallery assets', async () => {
    const {service, item, stored} = fixture()
    await service.saveExhibit(item, {files: {model: glb()}})
    assert.equal(stored.has(`museum-models:${model}`), false)
    assert.equal(stored.has(`museum-images:${thumbnail}`), true)
    assert.equal(stored.has(`museum-images:${galleryPath}`), true)
})

test('gallery-only media helper retains the unchanged model and thumbnail', async () => {
    const {service, stored} = fixture()
    await service.updateMedia(ID, {galleries: [`items/${ID}/gallery/additional.png`]})
    assert.equal(stored.has(`museum-models:${model}`), true)
    assert.equal(stored.has(`museum-images:${thumbnail}`), true)
})

test('explicit media removal and undefined media fields have different meanings', async () => {
    const {db, service, stored} = fixture()
    await service.updateMedia(ID, {thumbnail_path: null, model_path: undefined})
    assert.equal(db.tables.museum_items[0].thumbnail_path, null)
    assert.equal(db.tables.museum_items[0].model_path, model)
    assert.equal(stored.has(`museum-models:${model}`), true)
})

test('failed second upload cleans only attempted new files and leaves published data intact', async () => {
    const {db, service, item, controls, stored} = fixture()
    controls.failUpload = 2
    const before = structuredClone(db.tables)
    await assert.rejects(service.saveExhibit(item, {files: {thumbnail: image(), gallery: [image()]}}))
    assert.deepEqual(db.tables, before)
    assert.equal(stored.size, 3)
    assert.equal(db.events.includes('rpc:save_museum_item'), false)
})

test('all file validation precedes draft creation and upload', async () => {
    const {db, service, item, controls} = fixture()
    controls.invalidFile = true
    await assert.rejects(service.saveExhibit({...item, id: '', galleryImages: []}, {mode: 'create', files: {model: glb()}}))
    assert.equal(db.events.length, 0)
})

test('RPC failure after uploading cleans new files without deleting current assets', async () => {
    const {db, service, item, stored} = fixture()
    db.rejectRpc = sqlError('23514')
    await assert.rejects(service.saveExhibit(item, {files: {thumbnail: image(), model: glb()}}))
    assert.equal(stored.size, 3)
    assert.equal(db.tables.museum_items[0].thumbnail_path, thumbnail)
})

test('lost RPC success response retains uploaded assets and reports uncertainty', async () => {
    const {db, service, item, stored} = fixture()
    db.loseRpcResponse = true
    await assert.rejects(service.saveExhibit(item, {files: {thumbnail: image()}}), error => {
        assert.ok(error instanceof ExhibitSaveError)
        assert.equal(error.commitUncertain, true)
        assert.equal(error.cleanup.retainedAssets.length, 1)
        return true
    })
    assert.equal(stored.has(`museum-images:${db.tables.museum_items[0].thumbnail_path}`), true)
    noRemovals(db)
})

test('create inserts a new draft by ID then publishes through the existing-item RPC', async () => {
    const {db, service, item} = fixture()
    const created = {...item, id: '', slug: 'new-item', thumbnailPath: null, modelPath: null, galleryImages: []}
    const result = await service.saveExhibit(created, {mode: 'create', files: {thumbnail: image()}})
    assert.notEqual(result.id, ID)
    const row = db.tables.museum_items.find(row => row.id === result.id)!
    assert.equal(row.status, 'published')
    assert.equal(db.events.filter(event => event === 'insert:museum_items').length, 1)
    assert.ok(db.events.indexOf('insert:museum_items') < db.events.indexOf('rpc:save_museum_item'))
    assert.equal(db.tables.museum_item_specs.find(row => row.item_id === result.id)?.value, 'new')
})

test('duplicate slug on create does not upload or modify the existing item', async () => {
    const {db, service, item} = fixture()
    const before = structuredClone(db.tables)
    await assert.rejects(service.saveExhibit({...item, id: '', galleryImages: []}, {mode: 'create', files: {thumbnail: image()}}), {code: '23505'})
    assert.deepEqual(db.tables, before)
    assert.equal(db.events.some(event => event.startsWith('upload:')), false)
})

test('failed new-item save retains one recoverable draft and supports retry by its ID', async () => {
    const {db, service, item, controls} = fixture()
    controls.failUpload = 1
    const newItem = {...item, id: '', slug: 'new-item', thumbnailPath: null, modelPath: null, galleryImages: []}
    let savedError: ExhibitSaveError | undefined
    await assert.rejects(service.saveExhibit(newItem, {mode: 'create', files: {thumbnail: image()}}), error => {
        assert.ok(error instanceof ExhibitSaveError)
        savedError = error
        return true
    })
    const draft = savedError!.createdDraft!
    assert.equal(draft.status, 'draft')
    const result = await service.saveExhibit({...newItem, id: draft.id, updatedAt: draft.updated_at}, {mode: 'update', files: {thumbnail: image()}})
    assert.equal(result.id, draft.id)
    assert.equal(db.tables.museum_items.length, 2)
    assert.equal(db.tables.museum_items.find(row => row.id === draft.id)?.status, 'published')
})

test('lost draft insert response is uncertain and never triggers a fallback insert', async () => {
    const {db, service, item} = fixture()
    db.loseInsertResponse = true
    await assert.rejects(service.saveExhibit({...item, id: '', slug: 'new-item', galleryImages: []}, {mode: 'create'}), error => {
        assert.ok(error instanceof ExhibitSaveError)
        assert.equal(error.commitUncertain, true)
        return true
    })
    assert.equal(db.tables.museum_items.length, 2)
    assert.equal(db.events.includes('rpc:save_museum_item'), false)
})

test('failed database item deletion preserves every Storage file', async () => {
    const {db, service, stored} = fixture()
    db.rejectQuery = {table: 'museum_items', action: 'delete'}
    await assert.rejects(service.removeItem(ID))
    assert.equal(db.tables.museum_items.length, 1)
    assert.equal(stored.size, 3)
    noRemovals(db)
})

test('successful item deletion precedes asset cleanup and cascades children', async () => {
    const {db, service, stored} = fixture()
    assert.equal((await service.removeItem(ID)).cleanupFailed, false)
    assert.equal(db.tables.museum_items.length, 0)
    assert.equal(db.tables.gallery_images.length, 0)
    assert.equal(db.tables.museum_item_specs.length, 0)
    assert.equal(stored.size, 0)
    assert.ok(db.events.indexOf('delete:museum_items') < db.events.findIndex(event => event.startsWith('remove:')))
})

test('concurrent modification before deletion prevents both row and file removal', async () => {
    const {db, service, stored} = fixture()
    db.beforeDelete = () => {db.tables.museum_items[0].updated_at = 'newer-version'}
    await assert.rejects(service.removeItem(ID))
    assert.equal(db.tables.museum_items.length, 1)
    assert.equal(stored.size, 3)
    noRemovals(db)
})

test('failed deletion snapshot never authorizes any Storage removal', async () => {
    const {db, service, stored} = fixture()
    db.rejectQuery = {table: 'gallery_images', action: 'select'}
    await assert.rejects(service.removeItem(ID))
    assert.equal(db.events.includes('delete:museum_items'), false)
    assert.equal(stored.size, 3)
    noRemovals(db)
})

test('failed Storage cleanup does not restore deleted rows or misreport database failure', async () => {
    const {db, service, controls, stored} = fixture()
    controls.failRemove = true
    const result = await service.removeItem(ID)
    assert.equal(db.tables.museum_items.length, 0)
    assert.equal(result.cleanupFailed, true)
    assert.equal(result.retainedAssets.length, 3)
    assert.equal(stored.size, 3)
})

test('failed gallery deletion leaves its row and file untouched', async () => {
    const {db, service, stored} = fixture()
    db.rejectRpc = sqlError('40001')
    await assert.rejects(service.deleteGalleryImage('gallery', 'untrusted/path'))
    assert.equal(db.tables.gallery_images.length, 1)
    assert.equal(stored.has(`museum-images:${galleryPath}`), true)
    noRemovals(db)
})

test('gallery deletion uses the authoritative path and retains shared references', async () => {
    const {db, service, stored} = fixture()
    db.tables.gallery_images.push({...db.tables.gallery_images[0], id: 'shared', sort_order: 1})
    const result = await service.deleteGalleryImage('gallery', 'untrusted/path')
    assert.equal(db.tables.gallery_images.length, 1)
    assert.equal(stored.has(`museum-images:${galleryPath}`), true)
    assert.equal(result.cleanupFailed, false)
    noRemovals(db)
})

test('cleanup retains superseded media still referenced elsewhere', async () => {
    const {db, service, item, stored} = fixture()
    db.tables.museum_items.push({id: 'shared', slug: 'shared', thumbnail_path: thumbnail})
    const result = await service.saveExhibit(item, {files: {thumbnail: image()}})
    assert.equal(stored.has(`museum-images:${thumbnail}`), true)
    assert.equal(result.retainedAssets.length, 1)
    assert.equal(result.cleanupFailed, false)
})

test('failed reference checks retain files rather than treating RLS/errors as no references', async () => {
    const {db, service, item, stored} = fixture()
    db.rejectQuery = {table: 'gallery_images', action: 'select', head: true}
    const result = await service.saveExhibit(item, {files: {thumbnail: image()}})
    assert.equal(result.cleanupFailed, true)
    assert.equal(stored.has(`museum-images:${thumbnail}`), true)
})

test('lost admin visibility prevents Storage cleanup after a confirmed delete', async () => {
    const {db, service, stored} = fixture()
    db.admin = false
    const result = await service.removeItem(ID)
    assert.equal(result.cleanupFailed, true)
    assert.equal(stored.size, 3)
    noRemovals(db)
})

test('metadata commit remains successful when superseded-file cleanup fails', async () => {
    const {db, service, item, controls, stored} = fixture()
    controls.failRemove = true
    const result = await service.saveExhibit({...item, slug: 'saved'}, {files: {thumbnail: image()}})
    assert.equal(result.cleanupFailed, true)
    assert.equal(db.tables.museum_items[0].slug, 'saved')
    assert.equal(stored.has(`museum-images:${thumbnail}`), true)
})

test('asynchronous image validation finishes before any draft, upload or database read', async () => {
    const {db, service, item, storage} = fixture()
    storage.validateImage = async () => {await Promise.resolve(); throw new Error('Image decoding failed')}
    await assert.rejects(service.saveExhibit({...item, id: '', galleryImages: []}, {mode: 'create', files: {thumbnail: image()}}))
    assert.deepEqual(db.events, [])
})

test('save stages follow real operations and observer failures cannot break integrity', async () => {
    const {db, service, item} = fixture()
    const stages: string[] = []
    await service.saveExhibit(item, {files: {thumbnail: image()}, onStage(stage) {
        stages.push(stage)
        if (stage === 'cleanup') assert.ok(db.events.includes('commit'))
        if (stage === 'committing') throw new Error('Observer failed')
    }})
    assert.deepEqual(stages, ['validating', 'preparing', 'uploading', 'committing', 'cleanup'])
    assert.notEqual(db.tables.museum_items[0].thumbnail_path, thumbnail)
})

test('gallery replacement commits its new reference and removes only its superseded image', async () => {
    const {db, service, item, stored} = fixture()
    await service.saveExhibit({...item, galleryImages: []}, {files: {gallery: [image()]}})
    assert.equal(stored.has(`museum-images:${galleryPath}`), false)
    assert.equal(stored.has(`museum-images:${thumbnail}`), true)
    assert.equal(stored.has(`museum-models:${model}`), true)
    assert.ok(stored.has(`museum-images:${db.tables.gallery_images[0].storage_path}`))
})
