import {test} from 'node:test'
import assert from 'node:assert/strict'
import {BoxGeometry, Group, Mesh, MeshBasicMaterial, Box3, Sphere} from 'three'
import {createMuseumState, museumJourney, selectedMuseumItem} from '../src/features/museum/museumState.ts'
import {fitMuseumModel, supportedModelUrl} from '../src/experience/modelGeometry.ts'
import type {MuseumCatalog, MuseumItem} from '../src/types/museum.ts'

const item = (id: string, patch: Partial<MuseumItem> = {}): MuseumItem => ({id, slug: id, title: {en:id,fa:id}, brand: '', releaseYear:0,
    category:'category', categoryId:'cat', museumSection:'section', sectionId:'section', status:'published', sortOrder:0, featured:false,
    shortDescription:{en:'',fa:''}, description:{en:'',fa:''}, specifications:[], thumbnail:'', galleryImages:[], model3DUrl:`https://example.test/${id}.glb`, ...patch})
const catalog = (): MuseumCatalog => ({items:[item('a'),item('b',{sortOrder:2}),item('draft',{status:'draft'})],
    categories:[{id:'cat',slug:'category',name:{en:'Category',fa:'دسته'},sortOrder:0,active:true}],
    sections:[{id:'empty',title:{en:'Empty',fa:'خالی'},sortOrder:2,available:true}, {id:'section',title:{en:'Section',fa:'بخش'},sortOrder:1,available:true}]})
const deferred = <T>() => {let resolve!: (value:T)=>void; let reject!: (reason:unknown)=>void; const promise = new Promise<T>((yes,no)=>{resolve=yes;reject=no}); return {promise,resolve,reject}}

test('journey uses ordered published items, database IDs, active taxonomy and empty sections', () => {
    const data = catalog()
    data.categories.push({id:'inactive',slug:'inactive',name:{en:'',fa:''},sortOrder:1,active:false})
    data.items.push(item('hidden',{categoryId:'inactive'}),item('missing',{sectionId:'missing'}),item('unassigned',{sectionId:''}))
    const result = museumJourney(data)
    assert.deepEqual(result.stops, [{sectionId:'section',itemId:'a'},{sectionId:'section',itemId:'b'},{sectionId:'empty',itemId:null},{sectionId:null,itemId:'unassigned'}])
    assert.deepEqual(result.items.map(i=>i.id), ['a','unassigned','b'])
})
test('selection synchronizes the exact exhibit/model and clears selection in an empty section', async () => {
    const store = createMuseumState(async()=>catalog())
    await store.getState().load('visitor')
    assert.equal(selectedMuseumItem(store.getState())?.model3DUrl,'https://example.test/a.glb')
    store.getState().setJourney(.5)
    assert.equal(selectedMuseumItem(store.getState())?.id,'b')
    store.getState().setJourney(1)
    assert.equal(selectedMuseumItem(store.getState()),undefined)
    assert.equal(store.getState().section,'empty')
})
test('duplicate consumers and StrictMode mounts share one pending request and session cache', async () => {
    let calls=0
    const response=deferred<MuseumCatalog>()
    const store=createMuseumState(()=>{calls++;return response.promise})
    const first=store.getState().load('visitor')
    const second=store.getState().load('visitor')
    assert.equal(first,second)
    response.resolve(catalog()); await first
    await store.getState().load('visitor')
    assert.equal(calls,1)
})
test('older responses cannot overwrite a newer owner or retry request', async () => {
    const old=deferred<MuseumCatalog>(), newer=deferred<MuseumCatalog>()
    let calls=0
    const store=createMuseumState(()=>++calls===1 ? old.promise : newer.promise)
    const first=store.getState().load('old'); await Promise.resolve()
    const second=store.getState().load('new'); await Promise.resolve()
    newer.resolve({...catalog(),items:[item('new')]}); await second
    old.resolve(catalog()); await first
    assert.equal(store.getState().owner,'new')
    assert.equal(selectedMuseumItem(store.getState())?.id,'new')
})
test('pending refresh uses latest navigation and ignores stale model callbacks', async () => {
    const response=deferred<MuseumCatalog>()
    let calls=0
    const store=createMuseumState(()=>++calls===1 ? Promise.resolve(catalog()) : response.promise)
    await store.getState().load('visitor')
    const request=store.getState().load('visitor',true)
    store.getState().setJourney(.5)
    response.resolve(catalog()); await request
    assert.equal(selectedMuseumItem(store.getState())?.id,'b')
    store.getState().setModelStatus('a','https://example.test/a.glb','ready')
    assert.equal(store.getState().modelStatus,'loading')
})
test('fetch errors are distinct from an empty collection and retry succeeds without mocks', async () => {
    let attempts=0
    const store=createMuseumState(async()=>{if(++attempts===1)throw new Error('Unauthorized');return {...catalog(),items:[]}})
    await store.getState().load('visitor')
    assert.equal(store.getState().status,'error'); assert.equal(store.getState().items.length,0)
    await store.getState().load('visitor',true)
    assert.equal(store.getState().status,'ready'); assert.equal(store.getState().items.length,0)
})
test('reset invalidates an in-flight response', async () => {
    const response=deferred<MuseumCatalog>()
    const store=createMuseumState(()=>response.promise)
    const request=store.getState().load('visitor'); store.getState().reset()
    response.resolve(catalog()); await request
    assert.equal(store.getState().owner,null); assert.equal(store.getState().status,'idle')
})
for (const dimension of [1e-12,1,1e12]) test(`fitting a ${dimension} model normalizes framing without changing shared geometry`,()=>{
    const group=new Group(), geometry=new BoxGeometry(dimension,dimension*.5,dimension*2), material=new MeshBasicMaterial()
    const mesh=new Mesh(geometry,material); mesh.position.set(12,0,-8); group.add(mesh)
    const fit=fitMuseumModel(group)
    const fitted=new Group(); fitted.scale.setScalar(fit.scale); fitted.position.fromArray(fit.position); fitted.add(group.clone())
    const sphere=new Box3().setFromObject(fitted,true).getBoundingSphere(new Sphere())
    assert.ok(Math.abs(sphere.radius-1.65)<.01)
    assert.ok(sphere.center.length()<.01)
    assert.equal(group.scale.x,1); assert.equal(mesh.geometry,geometry)
    geometry.dispose(); material.dispose()
})
test('empty or invalid model bounds fail safely and URLs reject non-HTTP protocols',()=>{
    assert.throws(()=>fitMuseumModel(new Group()))
    assert.equal(supportedModelUrl('javascript:alert(1)'),false)
    assert.equal(supportedModelUrl('broken url'),false)
    assert.equal(supportedModelUrl('https://example.test/file.glb'),true)
})
