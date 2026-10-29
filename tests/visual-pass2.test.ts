import {test} from 'node:test'
import assert from 'node:assert/strict'
import {doorEase,doorShouldOpen} from '../src/experience/visualDoorState.ts'
test('visual door hysteresis retains the target in its deadband and always clears the far side',()=>{assert.equal(doorShouldOpen(false,16,2.7),false);assert.equal(doorShouldOpen(false,10,2.7),true);assert.equal(doorShouldOpen(true,13,2.7),true);assert.equal(doorShouldOpen(false,13,2.7),false);assert.equal(doorShouldOpen(true,16,2.7),false);assert.equal(doorShouldOpen(false,-25,-19.35),true);assert.equal(doorShouldOpen(false,15,2.7,true),true)})
test('door easing is bounded monotonic and end-eased for reversible three-second movement',()=>{let previous=0;for(let i=0;i<=100;i++){const y=doorEase(i/100);assert.ok(y>=previous-1e-6&&y>=0&&y<=1);previous=y}assert.ok(doorEase(0)<.001&&doorEase(1)>.999);assert.ok(doorEase(.1)<.1&&doorEase(.9)>.9)})
