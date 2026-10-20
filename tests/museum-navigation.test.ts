import test from 'node:test'
import assert from 'node:assert/strict'
import {constrainMuseumPosition, destinationAt, destinations, useMuseumNavigation} from '../src/features/museum/navigationState.ts'

test('physical movement remains within entrance, corridor and CPU arrival bounds',()=>{
 assert.deepEqual(constrainMuseumPosition(999,-100),{x:6,z:-23})
 assert.deepEqual(constrainMuseumPosition(-999,100),{x:-5.5,z:18})
 assert.deepEqual(constrainMuseumPosition(9,-8),{x:2.45,z:-8})
 assert.deepEqual(constrainMuseumPosition(NaN,Infinity),{x:0,z:15.5})
 assert.equal(destinationAt(10),'entrance');assert.equal(destinationAt(-4),'corridor');assert.equal(destinationAt(-21),'cpu')
})
test('guided/explore transitions are interruptible and clear assisted movement',()=>{
 const s=useMuseumNavigation; s.getState().reset();s.getState().tour()
 assert.equal(s.getState().playing,true)
 s.getState().pause();assert.equal(s.getState().playing,false)
 s.getState().explore();s.getState().setMove(1);assert.equal(s.getState().mode,'explore')
 s.getState().visit('cpu',true);assert.equal(s.getState().mode,'guided');assert.equal(s.getState().move,0)
 assert.equal(s.getState().request.target,1);assert.equal(s.getState().request.instant,true)
})
test('destinations and route reset remain independent of database selection',()=>{
 const s=useMuseumNavigation,request=s.getState().request.id
 s.getState().visit('corridor');assert.equal(s.getState().request.target,destinations.corridor)
 s.getState().report(.5,'corridor');s.getState().reset()
 assert.equal(s.getState().location,'entrance');assert.equal(s.getState().progress,0)
 assert.ok(s.getState().request.id>request)
})

test('Back/Forward steps share destination actions and handle reversal during transitions',()=>{
 const store=useMuseumNavigation
 store.getState().reset();store.getState().step(-1);assert.equal(store.getState().request.target,0)
 store.getState().step(1);assert.equal(store.getState().request.target,.5)
 store.getState().step(-1);assert.equal(store.getState().request.target,0)
 store.getState().report(.5,'corridor');store.getState().finish();store.getState().explore();store.getState().step(1)
 assert.equal(store.getState().mode,'guided');assert.equal(store.getState().request.target,1)
 store.getState().report(1,'cpu');store.getState().finish();const id=store.getState().request.id
 store.getState().step(1);assert.equal(store.getState().request.id,id)
 store.getState().toggleAtmosphere();assert.equal(store.getState().atmospherePaused,true)
 store.getState().reset();assert.equal(store.getState().atmospherePaused,false)
})
