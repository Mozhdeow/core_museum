import {useEffect,useMemo} from 'react'
import {BufferGeometry,CanvasTexture,SRGBColorSpace,PlaneGeometry,Matrix4,Vector3,Quaternion,Euler,MeshBasicMaterial,AdditiveBlending} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {EntranceBatch,type EntrancePart} from './EntranceArtifacts'
import {useMuseumQuality} from './useMuseumQuality'

/** Baked-style washes share two draws, not one light or mesh per niche. */
export function PassageLighting(){
 const tier=useMuseumQuality(s=>s.tier)
 const resources=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d')!,g=c.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.35,'#ffffff88');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,128,128);const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace
  const wall=new MeshBasicMaterial({map,color:'#d6cbb3',transparent:true,opacity:.28,depthWrite:false,blending:AdditiveBlending,toneMapped:false}),floor=wall.clone();floor.color.set('#ffb547');floor.opacity=.045
  const wallParts:BufferGeometry[]=[],floorParts:BufferGeometry[]=[],positions=tier==='low'?[-3,-13]:tier==='medium'?[-1,-9,-17]:[-1,-5,-9,-13,-17]
  const plane=(list:BufferGeometry[],at:[number,number,number],size:[number,number],angle:[number,number,number])=>list.push(new PlaneGeometry(...size).applyMatrix4(new Matrix4().compose(new Vector3(...at),new Quaternion().setFromEuler(new Euler(...angle)),new Vector3(1,1,1))))
  for(const z of positions){plane(floorParts,[0,.008,z],[5.8,5],[-Math.PI/2,0,0]);for(const side of [-1,1])plane(wallParts,[side*3.39,2.3,z],[4.5,4.4],[0,-side*Math.PI/2,0])}
  const walls=mergeGeometries(wallParts)!,floors=mergeGeometries(floorParts)!;[...wallParts,...floorParts].forEach(p=>p.dispose());return {map,wall,floor,walls,floors}
 },[tier])
 const parts=useMemo(()=>{const housings:EntrancePart[]=[],faces:EntrancePart[]=[];for(const z of [-1,-5,-9,-13,-17]){housings.push({at:[0,4.55,z],size:[2.35,.08,.46]});faces.push({at:[0,4.503,z],size:[2.08,.012,.32]})}return {housings,faces}},[])
 useEffect(()=>()=>{resources.map.dispose();resources.wall.dispose();resources.floor.dispose();resources.walls.dispose();resources.floors.dispose()},[resources])
 return <group name="passage-rhythmic-lighting"><EntranceBatch name="passage-fixture-housings" parts={parts.housings} color="#424641"/><EntranceBatch name="passage-fixture-faces" parts={parts.faces} color="#d7bf8e" luminous/>
  <mesh name="passage-wall-washes" geometry={resources.walls} material={resources.wall} raycast={()=>null} dispose={null}/><mesh name="passage-floor-pools" geometry={resources.floors} material={resources.floor} raycast={()=>null} dispose={null}/></group>
}
