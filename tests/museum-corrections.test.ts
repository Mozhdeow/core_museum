import test from 'node:test'
import assert from 'node:assert/strict'
import {BoxGeometry,Mesh,Box3,Vector3} from 'three'
import {createMuseumState} from '../src/features/museum/museumState.ts'
import {corridorExhibits,categoryShowcases,showcasePosition,SHOWCASE_BOUNDS,SHOWCASE_X,SHOWCASE_PLATFORM_DEPTH,isCPUExhibit} from '../src/features/museum/exhibition.ts'
import {fitMuseumModel} from '../src/experience/modelGeometry.ts'
import {validWalkingPose} from '../src/features/museum/visitPersistence.ts'
import type {MuseumCatalog,MuseumItem} from '../src/types/museum.ts'
const item=(id:string,section='new-section'):MuseumItem=>({id,slug:id,status:'published',categoryId:'new-category',sectionId:section,category:'motherboard',museumSection:'new',title:{en:id,fa:'اثر'},description:{en:'',fa:''},shortDescription:{en:'',fa:''},brand:'',releaseYear:0,sortOrder:0,featured:false,thumbnail:'',galleryImages:[],specifications:[],model3DUrl:`https://fixture.invalid/${id}.glb`})
const catalog=():MuseumCatalog=>({categories:[{id:'new-category',slug:'arbitrary-category',name:{en:'New category',fa:'دسته جدید'},active:true,sortOrder:4}],sections:[{id:'new-section',slug:'arbitrary-section',title:{en:'New section',fa:'بخش جدید'},available:true,sortOrder:3}],items:Array.from({length:9},(_,i)=>item(`item-${i}`))})
test('arbitrary active taxonomy refreshes in order and preserves selected UUID without CPU substitution',async()=>{
 const data=catalog(),store=createMuseumState(async()=>data)
 await store.getState().load('owner');store.getState().restoreSelection('item-6','new-section')
 data.categories.push({id:'empty-category',slug:'not-hardcoded',name:{en:'Empty',fa:'خالی'},active:true,sortOrder:-1})
 data.sections.push({id:'empty-section',slug:'not-hardcoded',title:{en:'Empty',fa:'خالی'},available:true,sortOrder:-1})
 data.items.push({...item('draft'),status:'draft'})
 await store.getState().load('owner',true)
 assert.equal(store.getState().categories[0].id,'empty-category');assert.equal(store.getState().sections[0].id,'empty-section')
 assert.equal(store.getState().focusedItemId,'item-6');assert.equal(store.getState().items.length,9)
 assert.equal(isCPUExhibit(store.getState(),store.getState().items[0]),false)
 store.getState().restoreSelection(null,'empty-section');await store.getState().load('owner',true)
 assert.equal(store.getState().section,'empty-section');assert.equal(store.getState().focusedItemId,null)
})
test('category carousel retains all published records independently of selected item and section',()=>{
 const c=catalog(),batch=corridorExhibits(c,'item-6','new-section')
 assert.deepEqual(batch.map(i=>i.id),Array.from({length:9},(_,i)=>`item-${i}`))
 assert.ok(batch.every(i=>i.sectionId==='new-section'&&i.categoryId==='new-category'))
 assert.deepEqual(corridorExhibits(c,null,'empty-section').map(i=>i.id),Array.from({length:9},(_,i)=>`item-${i}`)) // Sections are metadata, not a second visitor filter.
 assert.deepEqual(corridorExhibits(c,null,null,'empty-category'),[])
})
test('wall showcase fitting stays outside walking clearance, and focus poses satisfy persistence validation',()=>{
 const mesh=new Mesh(new BoxGeometry(100,.2,55)),fit=fitMuseumModel(mesh,SHOWCASE_BOUNDS)
 mesh.scale.setScalar(fit.scale);mesh.position.fromArray(fit.position)
 const size=new Box3().setFromObject(mesh).getSize(new Vector3())
 assert.ok(size.x<=1.65&&size.y<=1.5&&size.z<=.42)
 for(const depth of [SHOWCASE_BOUNDS.depth,SHOWCASE_PLATFORM_DEPTH]){
  assert.ok(SHOWCASE_X-depth/2>2.45);assert.ok(SHOWCASE_X+depth/2<3.185)
 }
 assert.ok(Math.abs(showcasePosition(2).z)-1.85/2>11.9)
 for(const bay of categoryShowcases(catalog()))assert.ok(validWalkingPose({position:[0,1.72,bay.z+1.1],quaternion:[0,0,0,1]}))
 mesh.geometry.dispose()
})
