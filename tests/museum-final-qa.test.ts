import test from 'node:test'
import assert from 'node:assert/strict'
import {BoxGeometry,Box3,Group,Mesh,MeshBasicMaterial,Vector3} from 'three'
import {moveMuseumPosition,constrainMuseumPosition,CPU_CLEARANCE_RADIUS,excludeCPUPlatform} from '../src/features/museum/museumCollision.ts'
import {useMuseumNavigation} from '../src/features/museum/navigationState.ts'
import {fitMuseumModel,PEDESTAL_MODEL_BOUNDS,EXHIBIT_BASE_Y} from '../src/experience/modelGeometry.ts'
import {belongsToCPUHall} from '../src/features/museum/exhibitPresentation.ts'

test('pedestal excludes invalid positions and swept motion cannot tunnel through it',()=>{
 const corrected=constrainMuseumPosition(0,-27)
 assert.ok(Math.hypot(corrected.x,corrected.z+27)>=CPU_CLEARANCE_RADIUS-1e-9)
 for(const start of [[0,-21.5],[5,-23],[-5,-23],[0,-22.75]])for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,p=moveMuseumPosition(start[0],start[1],Math.cos(angle)*100,Math.sin(angle)*100)
  assert.ok(Math.hypot(p.x,p.z+27)>=CPU_CLEARANCE_RADIUS-1e-8);assert.ok(p.z>=-23&&p.z<=18)
 }
 const portal=moveMuseumPosition(5,3.01,0,-20);assert.ok(portal.z>=3)
 assert.ok(moveMuseumPosition(-5,-23,20,0).x<-1.4)
 assert.ok(moveMuseumPosition(5,-23,-20,0).x>1.4)
 assert.deepEqual(excludeCPUPlatform(0,-27),{x:0,z:-27+CPU_CLEARANCE_RADIUS})
})
test('overlay owner suspends movement, navigation and inspection without losing mode',()=>{
 const n=useMuseumNavigation;n.getState().reset();n.getState().report(1,'cpu');n.getState().explore();n.getState().setMove(1);n.getState().openOverlay('ai')
 const id=n.getState().request.id;n.getState().tour();n.getState().visit('entrance');n.getState().step(-1);n.getState().enterInspect();n.getState().setMove(1);n.getState().openOverlay('gallery')
 assert.equal(n.getState().mode,'explore');assert.equal(n.getState().overlay,'ai');assert.equal(n.getState().move,0);assert.equal(n.getState().request.id,id)
 n.getState().closeOverlay();n.getState().enterInspect();n.getState().openOverlay('ai');assert.equal(n.getState().overlay,null);n.getState().reset()
})
for(const [name,sizes] of [['wide',[1000,2,30]],['tall',[2,1000,2]],['irregular',[8,3,40]]] as const)test(`pedestal fitting bounds ${name} assets without editing shared geometry`,()=>{
 const group=new Group(),geometry=new BoxGeometry(...sizes),mesh=new Mesh(geometry,new MeshBasicMaterial());mesh.position.set(12,-3,200);group.add(mesh)
 const original=geometry.attributes.position.array.slice(),fit=fitMuseumModel(group,PEDESTAL_MODEL_BOUNDS),display=new Group();display.scale.setScalar(fit.scale);display.position.fromArray(fit.position);display.position.y+=EXHIBIT_BASE_Y+fit.height/2;display.add(group.clone())
 const box=new Box3().setFromObject(display),size=box.getSize(new Vector3())
 assert.ok(size.x<=2.8+1e-8&&size.y<=2.3+1e-8&&size.z<=2.4+1e-8);assert.ok(Math.abs(box.min.y-EXHIBIT_BASE_Y)<1e-8);assert.ok(box.min.y-.915>.4);assert.deepEqual(geometry.attributes.position.array,original)
})
test('CPU association uses category identity independently of curatorial sections',()=>{
 assert.equal(belongsToCPUHall({category:'cpu',museumSection:'cpu'}),true)
 assert.equal(belongsToCPUHall({category:'cpu',museumSection:''}),true)
 assert.equal(belongsToCPUHall({category:'storage',museumSection:'cpu'}),false)
 assert.equal(belongsToCPUHall({category:'cpu',museumSection:'storage'}),true)
 assert.equal(belongsToCPUHall({category:'storage',museumSection:'storage'}),false)
 assert.equal(belongsToCPUHall({category:'',museumSection:''}),false)
})
