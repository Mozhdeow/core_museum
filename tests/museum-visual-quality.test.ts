import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chooseMuseumQuality, lowerMuseumQuality, museumFrameWatchdog, museumQuality} from '../src/experience/museumQuality.ts'
import {hardwarePreviewGeometry} from '../src/experience/hardwarePreviewGeometry.ts'
import {Box3, Group, Mesh, MeshBasicMaterial} from 'three'

test('quality uses conservative defaults and caps mobile/reduced motion', () => {
    assert.equal(chooseMuseumQuality({cores:16,memory:8,dpr:1}), 'high')
    assert.equal(chooseMuseumQuality({cores:8,memory:4,dpr:3}), 'medium')
    assert.equal(chooseMuseumQuality({}), 'low')
    for(const flags of [{coarse:true},{reduced:true},{memory:2},{cores:4}]) assert.equal(chooseMuseumQuality({cores:16,memory:8,...flags}), 'low')
    assert.equal(museumQuality.low.dust,0);assert.equal(museumQuality.low.reflection,0);assert.equal(museumQuality.low.bloom,false)
})
test('quality degradation is monotonic and frame watchdog ignores isolated stalls/hidden time', () => {
    assert.deepEqual(['high','medium','low'].map(t=>lowerMuseumQuality(t as 'high'|'medium'|'low')),['medium','low','low'])
    const quick=museumFrameWatchdog();let changes=0
    for(let i=0;i<800;i++)if(quick.sample(i===400?.12:1/60))changes++
    assert.equal(changes,0)
    const slow=museumFrameWatchdog();let detected=false
    for(let i=0;i<500;i++)detected=slow.sample(.03)||detected
    assert.equal(detected,true)
    const hidden=museumFrameWatchdog()
    for(let i=0;i<800;i++)assert.equal(hidden.sample(.03,false),false)
})
for(const kind of ['gpu','memory','motherboard','hdd','ssd'] as const)test(`${kind} detailed prototype batches retain compatible visible geometry`,()=>{
    const geometries=hardwarePreviewGeometry(kind,true),group=new Group(),material=new MeshBasicMaterial()
    for(const geometry of geometries){if(!geometry)continue;assert.ok(geometry.getAttribute('position').count>=3);assert.ok(!geometry.index);group.add(new Mesh(geometry,material))}
    const size=new Box3().setFromObject(group).getSize(group.position.clone())
    assert.ok(size.x>.5&&size.x<1.7);assert.ok(size.y>.4&&size.y<1.7);assert.ok(size.z>0&&size.z<.5)
    geometries.forEach(g=>g?.dispose());material.dispose()
})
