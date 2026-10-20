import test from 'node:test'
import assert from 'node:assert/strict'
import {BoxGeometry,Mesh,MeshStandardMaterial,Box3,Vector3,DoubleSide,FrontSide} from 'three'
import {prepareExhibitModel,visibleModelBounds,exhibitMaterials} from '../src/experience/modelGeometry.ts'
import {SHOWCASE_BOUNDS,corridorExhibits,publishedExhibits} from '../src/features/museum/exhibition.ts'
import {readCmsDraft,writeCmsDraft,removeCmsDraft,clearCmsDrafts} from '../src/features/cms/draftStorage.ts'
import {createAuthState} from '../src/features/auth/sessionState.ts'
import {VISIT_ARCHITECTURE,validateVisit} from '../src/features/museum/visitPersistence.ts'
import {useMuseumNavigation} from '../src/features/museum/navigationState.ts'
import type {MuseumCatalog} from '../src/types/museum.ts'

test('flat board presentation exposes the broad face and keeps every axis inside the case',()=>{
 const geometry=new BoxGeometry(3,.02,2),before=Array.from(geometry.getAttribute('position').array)
 const fit=prepareExhibitModel(new Mesh(geometry),SHOWCASE_BOUNDS)
 fit.object.scale.setScalar(fit.scale);fit.object.position.fromArray(fit.position)
 const size=new Box3().setFromObject(fit.object).getSize(new Vector3())
 assert.ok(size.x>1.6&&size.y>1&&size.z<.02)
 assert.deepEqual(Array.from(geometry.getAttribute('position').array),before)
 geometry.dispose()
})
test('hidden, fully transparent and empty surfaces cannot report a ready model',()=>{
 const mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial())
 mesh.visible=false;assert.throws(()=>visibleModelBounds(mesh))
 mesh.visible=true;mesh.material.transparent=true;mesh.material.opacity=0;assert.throws(()=>visibleModelBounds(mesh))
 mesh.material.opacity=1;mesh.geometry.setDrawRange(0,0);assert.throws(()=>visibleModelBounds(mesh))
 mesh.geometry.dispose();mesh.material.dispose()
})
test('one category policy ignores placement metadata and excludes unpublished records',()=>{
 const catalog={categories:[],sections:[],items:[{id:'a',categoryId:'board',sectionId:'cpu',status:'published',galleryImages:[]},{id:'b',categoryId:'board',sectionId:'future',status:'published',galleryImages:[]},{id:'c',categoryId:'board',status:'draft'}]} as unknown as MuseumCatalog
 assert.deepEqual(publishedExhibits(catalog,'board').map(i=>i.id),['a','b'])
 assert.deepEqual(corridorExhibits(catalog,'a','cpu','board').map(i=>i.id),['a','b'])
})
test('generic destination requests animate and remain pausable and interruptible',()=>{
 const nav=useMuseumNavigation;nav.getState().reset();nav.getState().visitShowcase(3)
 assert.equal(nav.getState().mode,'guided');assert.equal(nav.getState().playing,true);assert.equal(nav.getState().request.instant,false)
 nav.getState().pause();assert.equal(nav.getState().playing,false)
 nav.getState().tour();assert.equal(nav.getState().showcase?.bay,3)
 nav.getState().visit('cpu');assert.equal(nav.getState().showcase,null)
 nav.getState().reset()
})
test('CMS drafts isolate accounts, keep Files out of persisted payloads and clear on confirmation',()=>{
 const storage=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k),key:(i:number)=>[...storage.keys()][i],get length(){return storage.size}}})
 writeCmsDraft('owner','items:new',{title:'draft',files:['memory only']},{title:'draft',hasFiles:true})
 assert.equal(readCmsDraft('other','items:new'),null)
 assert.equal(readCmsDraft('owner','items:new')?.live,true)
 assert.ok(![...storage.values()][0].includes('memory only'))
 removeCmsDraft('owner','items:new');assert.equal(readCmsDraft('owner','items:new'),null)
 writeCmsDraft('owner','taxonomy:categories',{slug:'new'});clearCmsDrafts('owner');assert.equal(storage.size,0)
})
test('same-account profile revalidation retains mounted identity while denying writes, then fails closed',async()=>{
 const profile={id:'owner',role:'admin',preferred_locale:'en',email:'a',full_name:'A'} as const
 let fail=false
 const gateway={getSession:async()=>{if(fail)throw new Error('Profile unavailable');return {session:{user:{id:'owner'}} as never,profile:profile as never,user:null}},signIn:async()=>{},register:async()=>{},signOut:async()=>{},updateProfile:async()=>profile as never}
 const auth=createAuthState(gateway);await auth.getState().initialize()
 const pending=auth.getState().revalidate();assert.equal(auth.getState().isLoading,true);assert.equal(auth.getState().user?.id,'owner');await pending
 fail=true;await auth.getState().revalidate();assert.equal(auth.getState().isAuthenticated,false);assert.equal(auth.getState().user,null)
})

test('optional category and showcase references extend old visits without accepting untrusted state',()=>{
 const owner='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222'
 const original={version:1,architecture:VISIT_ARCHITECTURE,owner,savedAt:Date.now(),mode:'explore',location:'corridor',checkpoint:'corridor',pose:{position:[0,1.72,-4.4],quaternion:[0,0,0,1]},progress:.5,target:.5,selectedId:id,sectionId:id,inspect:null}
 assert.ok(validateVisit(original,owner))
 const saved=validateVisit({...original,categoryId:id,showcaseBay:3,secret:'discard'},owner)!
 assert.equal(saved.categoryId,id);assert.equal(saved.showcaseBay,3);assert.equal('secret' in saved,false)
 assert.equal(validateVisit({...original,categoryId:'invalid',showcaseBay:20},owner)?.categoryId,undefined)
})

test('display materials reveal reverse faces without changing cached geometry, maps or source materials',()=>{
 const source=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),instance=source.clone()
 const materials=exhibitMaterials(instance)
 assert.equal(source.material.side,FrontSide);assert.equal(instance.material.side,DoubleSide)
 assert.equal(source.geometry,instance.geometry);assert.notEqual(source.material,instance.material)
 let disposed=0;materials[0].addEventListener('dispose',()=>{disposed++});materials.forEach(m=>m.dispose());assert.equal(disposed,1)
 source.geometry.dispose();source.material.dispose()
})
