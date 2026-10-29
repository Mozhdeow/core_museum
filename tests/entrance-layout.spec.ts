import {test,expect,type Page} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import type {RootState} from '@react-three/fiber'
import type {Mesh,Object3D} from 'three'
import {visitFixture,cameraState} from './museum-visit-fixture'
import {pose} from './visual-pass2.helpers'

async function ready(page:Page){
    await visitFixture(page)
    await expect.poll(async()=>(await cameraState(page)).phase,{timeout:25000}).toBe('ready')
}

test('actual Entrance frame, column, trim and case bounds form four clear mirrored bays',async({page})=>{
    await ready(page)
    const result=await page.evaluate(async()=>{
        const f='/node_modules/.vite/deps/@react-three_fiber.js',t='/node_modules/.vite/deps/three.js'
        const root=(await import(f))._roots.values().next().value.store.getState() as RootState
        const {Box3,Vector3}=await import(t)
        root.scene.updateMatrixWorld(true)
        const gallery=root.scene.getObjectByName('museum-entrance-gallery')!
        const bounds=(object:Object3D)=>new Box3().setFromObject(object,true)
        const frames: {topic:string;side:number;box:import('three').Box3}[]=[]
        gallery.traverse(o=>{if(o.userData.topic)frames.push({topic:o.userData.topic,side:Math.sign(o.position.x),box:bounds(o.getObjectByName('gallery-frame')!)})})
        // Each merged EntranceBatch piece retains BoxGeometry's 24 vertices.
        // Measure the generated vertex buffer, rather than recomputing authored boxes.
        const pieces=(name:string)=>{
            const mesh=gallery.getObjectByName(name) as Mesh,positions=mesh.geometry.getAttribute('position')
            const boxes:import('three').Box3[]=[]
            for(let start=0;start<positions.count;start+=24){
                const box=new Box3()
                for(let i=start;i<start+24;i++)box.expandByPoint(new Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld))
                boxes.push(box)
            }
            return boxes
        }
        const trim=pieces('entrance-bronze'),lights=pieces('entrance-light-trim')
        const columns=trim.filter(b=>b.max.y-b.min.y>6&&Math.abs((b.min.x+b.max.x)/2)>6.5)
        const layout=gallery.userData.wallLayout,epsilon=.00001
        const check=(value:boolean,message:string)=>{if(!value)throw new Error(message)}
        const near=(a:number,b:number)=>Math.abs(a-b)<epsilon
        check(frames.length===8,'Expected exactly eight side-wall frames')
        check(columns.length===10,'Expected five actual columns per wall including fixed edges')
        const sides=[-1,1].map(side=>frames.filter(p=>p.side===side).sort((a,b)=>a.box.min.z-b.box.min.z))
        for(const wall of sides){
            check(wall.length===4,'Expected four frames on each wall')
            check(near(wall[0].box.min.z-layout.start,layout.end-wall[3].box.max.z),'Asymmetric outer margins')
            check(near(wall[0].box.min.z-layout.start,layout.margin),'Incorrect outer clearance')
            wall.forEach((p,i)=>{
                check(near(p.box.max.z-p.box.min.z,2.858),'Frame width changed')
                check(near(p.box.min.y,wall[0].box.min.y)&&near(p.box.max.y,wall[0].box.max.y),'Unequal mounting heights')
                check(p.box.min.z>=layout.start+.15&&p.box.max.z<=layout.end-.15,'Frame outside wall bay')
                if(i>0)check(near(p.box.min.z-wall[i-1].box.max.z,2*layout.gap+.16),'Inconsistent poster spacing')
                for(const b of [...trim,...lights])check(!p.box.intersectsBox(b),'Frame intersects architectural trim or lighting')
                for(const c of columns.filter(b=>Math.sign(b.min.x)===p.side)){
                    const gap=Math.max(p.box.min.z-c.max.z,c.min.z-p.box.max.z)
                    check(gap>=.15-epsilon,'Column intrudes into poster clearance')
                }
            })
            const separators=columns.filter(c=>Math.sign(c.min.x)===wall[0].side).sort((a,b)=>a.min.z-b.min.z).slice(1,-1)
            separators.forEach((c,i)=>check(near((c.min.z+c.max.z)/2,(wall[i].box.max.z+wall[i+1].box.min.z)/2),'Separator not centered in actual frame gap'))
        }
        sides[0].forEach((p,i)=>{
            const r=sides[1][i].box
            check(near(p.box.min.z,r.min.z)&&near(p.box.max.z,r.max.z)&&near(p.box.min.x,-r.max.x),'Walls not mirrored')
        })
        const stories:Record<string,string>={terminal:'terminal',cpu:'cycle',gpu:'gpu',motherboard:'motherboard',memory:'memory',hdd:'storageTimeline'}
        const cases=gallery.children.filter(o=>o.name.startsWith('entrance-vitrine:'))
        check(cases.length===6,'Existing cases missing')
        for(const c of cases){
            const box=bounds(c),kind=c.name.split(':')[1],side=Math.sign(c.position.x)
            const frame=frames.find(p=>p.side===side&&p.topic===stories[kind])!.box
            check(near(c.position.z,(frame.min.z+frame.max.z)/2),'Case not aligned with its poster')
            check(side<0?box.max.x<-5.5:box.min.x>5.5,'Case blocks existing walking envelope')
            check(!box.intersectsBox(frame),'Case intersects poster')
            for(const column of columns)check(!box.intersectsBox(column),'Case intersects column')
        }
        return {posters:frames.length,columns:columns.length,cases:cases.length,gap:layout.gap,margin:layout.margin}
    })
    expect(result).toMatchObject({posters:8,columns:10,cases:6})
})

test('focused visual acceptance: arrival and both Entrance exhibition walls',async({page})=>{
    const errors:string[]=[]
    page.on('pageerror',e=>errors.push(e.message))
    await ready(page)
    const folder='docs/phase08/entrance-layout'
    await mkdir(folder,{recursive:true})
    await page.evaluate(()=>document.fonts.ready)
    await expect(page.locator('canvas[data-museum-prepared]')).toHaveAttribute('data-museum-prepared','ready',{timeout:60000})
    await expect(page.locator('.museum-context-status')).toHaveCount(0)
    await page.screenshot({path:`${folder}/center.png`})
    await pose(page,[4.4,1.72,11.3],[-6.775,3.075,11.3])
    await page.waitForTimeout(1200)
    await page.screenshot({path:`${folder}/left.png`})
    await pose(page,[-4.4,1.72,11.3],[6.775,3.075,11.3])
    await page.waitForTimeout(1200)
    await page.screenshot({path:`${folder}/right.png`})
    expect(errors).toEqual([])
})
