import test from 'node:test'
import assert from 'node:assert/strict'
import {useMuseumNavigation} from '../src/features/museum/navigationState.ts'
import {useCPUExperience} from '../src/features/museum/cpuExperienceState.ts'
import {cpuHotspots,cpuLayerHeight,lessonHotspot} from '../src/features/museum/cpuEducation.ts'

test('inspection owns input and preserves guided/explore return state',()=>{
 const n=useMuseumNavigation;n.getState().reset();n.getState().enterInspect();assert.equal(n.getState().mode,'inspect');n.getState().exitInspect();n.getState().restoreNavigation()
 n.getState().report(.95,'cpu');n.getState().tour();n.getState().enterInspect()
 assert.deepEqual(n.getState().returnTo,{mode:'guided',playing:true})
 const request=n.getState().request;n.getState().visit('entrance');n.getState().explore();n.getState().step(-1)
 assert.equal(n.getState().mode,'inspect');assert.deepEqual(n.getState().request,request)
 n.getState().exitInspect();n.getState().restoreNavigation();assert.equal(n.getState().playing,true)
 n.getState().explore();n.getState().enterInspect();n.getState().exitInspect();n.getState().restoreNavigation();assert.equal(n.getState().mode,'explore')
 n.getState().reset()
})
test('schematic lessons have reversible, isolated playback and no exhibit identity',()=>{
 const e=useCPUExperience;e.getState().open('published-id',true);assert.equal(e.getState().view,'model')
 e.getState().start('inside');assert.equal(e.getState().view,'schematic');assert.equal(e.getState().sourceId,'published-id')
 e.getState().pause();assert.equal(e.getState().status,'paused');e.getState().resume();assert.equal(e.getState().status,'playing')
 const run=e.getState().run;e.getState().start('heat');assert.ok(e.getState().run>run)
 e.getState().complete();assert.equal(e.getState().status,'complete');e.getState().reset();assert.equal(e.getState().exploded,false)
 e.getState().open(null,false);assert.equal(e.getState().sourceId,null);assert.equal(e.getState().view,'schematic')
})
test('local bilingual hotspots are unique and layer separation never reverses physical order',()=>{
 assert.equal(new Set(cpuHotspots.map(h=>h.id)).size,cpuHotspots.length)
 for(const h of cpuHotspots){assert.ok(h.title.en&&h.title.fa&&h.explanation.en&&h.explanation.fa)}
 for(let i=0;i<=10;i++){
  const e=i/10
  assert.ok(cpuLayerHeight('spreader',e)-.095>cpuLayerHeight('interface',e)+.015)
  assert.ok(cpuLayerHeight('interface',e)-.015>cpuLayerHeight('die',e)+.06)
  assert.ok(cpuLayerHeight('die',e)-.06>cpuLayerHeight('substrate',e)+.1)
  assert.ok(cpuLayerHeight('substrate',e)-.1>=cpuLayerHeight('contacts',e)+.04-1e-9)
 }
 assert.equal(lessonHotspot('heat',5),'heat');assert.equal(lessonHotspot('inside',5),'die')
})
