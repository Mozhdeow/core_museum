import test from 'node:test'
import assert from 'node:assert/strict'
import {Mesh,BoxGeometry,Vector3} from 'three'
import {prepareExhibitModel,visibleModelBounds} from '../src/experience/modelGeometry.ts'
import {SHOWCASE_BOUNDS,categoryShowcases,exhibitionEnd} from '../src/features/museum/exhibition.ts'
import {configureExhibitionEnd,constrainMuseumPosition} from '../src/features/museum/museumCollision.ts'
import {createMuseumState} from '../src/features/museum/museumState.ts'
import type {MuseumCatalog} from '../src/types/museum.ts'
test('tall flat hardware faces the visitor; calibration stays inside the safe envelope',()=>{
 for(const dimensions of [[.8,.04,3],[.04,3,.8],[.8,3,.04]]){
  const mesh=new Mesh(new BoxGeometry(...dimensions as [number,number,number]))
  const fitted=prepareExhibitModel(mesh,SHOWCASE_BOUNDS)
  const size=visibleModelBounds(fitted.object).getSize(new Vector3()).multiplyScalar(fitted.scale)
  assert.ok(size.x>size.y&&size.y>size.z*10,JSON.stringify(size))
  assert.ok(size.x<=1.651&&size.y<=1.501&&size.z<=.421)
  const calibrated=prepareExhibitModel(mesh.clone(),SHOWCASE_BOUNDS,{autoOrient:false,rotation:[Math.PI/2,0,0],scale:.7})
  assert.ok(calibrated.radius<=SHOWCASE_BOUNDS.radius*.7+.001)
  mesh.geometry.dispose()
 }
})
const catalog=()=>({categories:Array.from({length:12},(_,i)=>({id:`c${i}`,slug:`c${i}`,active:true})),sections:[],items:[{id:'one',categoryId:'c0',status:'published',model3DUrl:'https://fixture/one.glb'},{id:'two',categoryId:'c0',status:'published',model3DUrl:'https://fixture/two.glb'}]} as unknown as MuseumCatalog)
test('category placements scale beyond four, keep clearance and ignore item/filter selection',()=>{
 const data=catalog(),cases=categoryShowcases(data)
 assert.equal(cases.length,12);assert.equal(new Set(cases.map(c=>`${c.side}:${c.z}`)).size,12)
 configureExhibitionEnd(exhibitionEnd(cases.length))
 for(const c of cases){const safe=constrainMuseumPosition(c.side*2.7,c.z);assert.equal(safe.x,c.side*2.45);assert.equal(safe.z,c.z)}
 assert.deepEqual(categoryShowcases({...data,items:[]}),cases)
 configureExhibitionEnd(18)
})
test('selected UUID readiness survives same/cached selection and URL changes invalidate it',async()=>{
 const data=catalog(),state=createMuseumState(async()=>data)
 await state.getState().load('owner');state.getState().restoreSelection('one',null)
 state.getState().setModelStatus('one','https://fixture/one.glb','ready')
 state.getState().restoreSelection('one',null);assert.equal(state.getState().modelStatus,'ready')
 state.getState().restoreSelection('two',null);assert.equal(state.getState().modelStatus,'loading')
 state.getState().restoreSelection('one',null);assert.equal(state.getState().modelStatus,'ready')
 data.items[0].model3DUrl='https://fixture/new.glb';await state.getState().load('owner',true)
 assert.equal(state.getState().modelStatus,'loading');state.getState().reset()
})
