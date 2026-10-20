import test from 'node:test'
import assert from 'node:assert/strict'
import {Quaternion,Euler} from 'three'
import {VISIT_ARCHITECTURE,VISIT_TTL,validateVisit,validWalkingPose,readVisit,writeVisit,visitKey,type VisitSnapshot} from '../src/features/museum/visitPersistence.ts'
import {createMuseumState} from '../src/features/museum/museumState.ts'
import {museumPresentation} from '../src/features/museum/exhibitPresentation.ts'
import {curatorDemo} from '../src/features/museum/curatorDemo.ts'
import {captureVisit,flushVisit,useVisitRuntime,releaseVisit,discardVisit} from '../src/features/museum/visitRuntime.ts'
import type {MuseumCatalog,MuseumItem} from '../src/types/museum.ts'
const owner='11111111-1111-4111-8111-111111111111',a='22222222-2222-4222-8222-222222222222',b='33333333-3333-4333-8333-333333333333',section='44444444-4444-4444-8444-444444444444',category='55555555-5555-4555-8555-555555555555'
const snapshot=():VisitSnapshot=>({version:1,architecture:VISIT_ARCHITECTURE,owner,savedAt:1000,mode:'explore',location:'cpu',checkpoint:'cpu',pose:{position:[0,1.72,-21.5],quaternion:[0,0,0,1]},progress:1,target:1,selectedId:a,sectionId:section,inspect:null})
const item=(id:string,sortOrder=0):MuseumItem=>({id,slug:id,title:{en:`Exhibit ${id}`,fa:'اثر'},brand:'Known brand',releaseYear:1971,category:'untrusted-copy',categoryId:category,museumSection:'untrusted-copy',sectionId:section,status:'published',sortOrder,featured:false,shortDescription:{en:'Recorded description',fa:'شرح ثبت‌شده'},description:{en:'Recorded technical description',fa:'شرح فنی ثبت‌شده'},specifications:[],thumbnail:'',galleryImages:[],model3DUrl:null})
const catalog=():MuseumCatalog=>({items:[item(a),item(b,1)],categories:[{id:category,slug:'cpu',name:{en:'CPU',fa:'پردازنده'},sortOrder:0,active:true}],sections:[{id:section,slug:'cpu',title:{en:'CPU',fa:'پردازنده'},sortOrder:0,available:true}]})
test('versioned visits validate owner, expiry, revision, enums and UUIDs',()=>{
 assert.ok(validateVisit(snapshot(),owner,1000))
 for(const patch of [{owner:'other'},{version:2},{architecture:'old'},{savedAt:1000-VISIT_TTL-1},{savedAt:62000},{mode:'inspect'},{checkpoint:'gpu'},{progress:NaN},{target:2},{selectedId:'slug'}])assert.equal(validateVisit({...snapshot(),...patch},owner,1000),null)
 assert.ok(validateVisit(snapshot(),owner,1500,600));assert.equal(validateVisit(snapshot(),owner,1700,600),null)
})
test('unsafe, nonfinite or rolled walking poses recover a checkpoint without retaining Inspect',()=>{
 const invalid=[null,{position:[0,0,-21.5],quaternion:[0,0,0,1]},{position:[0,1.72,-27],quaternion:[0,0,0,1]},
  {position:[999,1.72,15],quaternion:[0,0,0,1]},{position:[NaN,1.72,0],quaternion:[0,0,0,1]},
  {position:[0,1.72,-21],quaternion:[0,0,0,0]},{position:[0,1.72,-21],quaternion:new Quaternion().setFromEuler(new Euler(0,0,.5)).toArray()}]
 for(const pose of invalid){assert.equal(validWalkingPose(pose),false);const restored=validateVisit({...snapshot(),pose},owner,1000)!;assert.deepEqual(restored.pose.position,[0,1.72,-21.5]);assert.equal(restored.inspect,null)}
 const inconsistent={...snapshot(),mode:'guided',progress:0}
 assert.deepEqual(validateVisit(inconsistent,owner,1000)?.pose.position,[0,1.72,-21.5])
})
test('Inspect is bounded, source-scoped and requires a safe CPU return pose',()=>{
 const s=snapshot();s.inspect={view:'model',sourceId:a,modelPath:`items/${a}/model.glb`,orbit:{yaw:.2,pitch:.3,distance:7}}
 assert.equal(validateVisit(s,owner,1000)?.inspect?.sourceId,a)
 assert.equal(validateVisit({...s,inspect:{...s.inspect,orbit:{yaw:99,pitch:.3,distance:7}}},owner,1000)?.inspect,null)
 assert.equal(validateVisit({...s,selectedId:b},owner,1000)?.inspect,null)
})
test('storage access and corrupt JSON fail safely; only minimal DTOs are restored',()=>{
 const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)},removeItem:(k:string)=>{memory.delete(k)}}
 assert.equal(writeVisit(storage,snapshot()),true);assert.equal(readVisit(storage,owner,1000)?.owner,owner)
 memory.set(visitKey(owner),'{broken');assert.equal(readVisit(storage,owner),null)
 const denied={...storage,getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('quota')}}
 assert.equal(readVisit(denied,owner),null);assert.equal(writeVisit(denied,snapshot()),false)
 assert.equal('token' in validateVisit({...snapshot(),token:'must disappear'},owner,1000)!,false)
})
test('catalog reorder preserves UUID and unavailable selections never choose another exhibit',async()=>{
 let data=catalog();const store=createMuseumState(async()=>data);await store.getState().load(owner);store.getState().setJourney(.75)
 data={...data,items:[item(a,2),item(b,0)]};await store.getState().load(owner,true);assert.equal(store.getState().focusedItemId,b);assert.equal(store.getState().stopIndex,0)
 data={...data,items:[item(a)]};await store.getState().load(owner,true);assert.equal(store.getState().focusedItemId,null);assert.equal(store.getState().selectionUnavailable,true)
 await store.getState().load(owner,true);assert.equal(store.getState().focusedItemId,null)
})
test('null and empty-section selection remain explicit across refresh, and inactive items are rejected',async()=>{
 let data=catalog();data.sections.push({id:b,slug:'future',title:{en:'Empty',fa:'خالی'},available:true,sortOrder:2})
 const store=createMuseumState(async()=>data);await store.getState().load(owner);store.getState().restoreSelection(null,b);await store.getState().load(owner,true);assert.equal(store.getState().section,b);assert.equal(store.getState().focusedItemId,null)
 store.getState().restoreSelection(null,null);await store.getState().load(owner,true);assert.equal(store.getState().stopIndex,-1)
 data={...data,categories:[]};await store.getState().load(owner,true);store.getState().restoreSelection(a,section);assert.equal(store.getState().focusedItemId,null)
})
test('presentation uses active taxonomy UUIDs and never places future-hall records in CPU Hall',()=>{
 const c=catalog();const current={...c,focusedItemId:a,modelStatus:'ready'}
 assert.equal(museumPresentation(current,'cpu').cpuCompatible,true)
 assert.equal(museumPresentation({...current,items:[{...item(a),model3DUrl:'https://example.test/model.glb'}]},'entrance').canInspectModel,true)
 assert.equal(museumPresentation({...current,categories:[{...c.categories[0],slug:'storage'}]},'cpu').cpuCompatible,false)
 assert.equal(museumPresentation({...current,items:[{...item(a),categoryId:b,category:'cpu'}]},'cpu').cpuCompatible,false)
})
test('curator returns only the current published metadata and discloses limitations in both locales',()=>{
 const i=item(a);assert.match(curatorDemo(a,'en','simple','Explain',i),/Recorded description/)
 assert.match(curatorDemo(a,'fa','technical','شرح',i),/شرح فنی ثبت‌شده/)
 assert.doesNotMatch(curatorDemo(b,'en','simple','Explain',i),/Recorded description/)
 assert.match(curatorDemo(a,'en','compare','Compare',i),/cannot answer/i)
 assert.doesNotMatch(curatorDemo(a,'en','simple','Explain',{...i,status:'draft'}),/Recorded description/)
})
test('camera sampling throttles storage writes and sign-out prevents a late lifecycle flush',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),clock=Date.now,memory=new Map<string,string>();let writes=0,time=10000
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{writes++;memory.set(k,v)},removeItem:(k:string)=>memory.delete(k)}})
 Date.now=()=>time
 try{
  releaseVisit();useVisitRuntime.getState().begin(owner,0);useVisitRuntime.getState().ready()
  for(let i=0;i<250;i++){captureVisit({...snapshot(),progress:i/250});flushVisit();time+=20}
  assert.equal(writes,5);flushVisit(true);assert.equal(writes,6)
  discardVisit(owner);flushVisit(true);assert.equal(memory.has(visitKey(owner)),false);assert.equal(writes,6)
 }finally{Date.now=clock;releaseVisit();if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage')}
})
