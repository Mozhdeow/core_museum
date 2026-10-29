import {useEffect,useMemo} from 'react'
import {useThree} from '@react-three/fiber'
import {PMREMGenerator,Scene,Mesh,BoxGeometry,MeshBasicMaterial} from 'three'
import {createLaboratory} from './laboratoryResources'

export function AssemblyStudio(){
 const get=useThree(s=>s.get),studio=useMemo(()=>createLaboratory(),[])
 useEffect(()=>{
  const {gl,scene}=get(),room=new Scene(),box=new BoxGeometry(),materials=[new MeshBasicMaterial({color:'#e5e5e5'}),new MeshBasicMaterial({color:'#d7dce0'}),new MeshBasicMaterial({color:'#bdbdb9'})]
  for(const [i,at,size] of [[0,[-6,8,3],[5,7,.1]],[1,[5,7,-3],[3,6,.1]],[2,[0,11,0],[14,.1,14]]] as [number,number[],number[]][]){const light=new Mesh(box,materials[i]);light.position.set(...at as [number,number,number]);light.scale.set(...size as [number,number,number]);light.lookAt(0,3,0);room.add(light)}
  const pmrem=new PMREMGenerator(gl),environment=pmrem.fromScene(room,.08,.1,50),previous=scene.environment,previousIntensity=scene.environmentIntensity;scene.environment=environment.texture;scene.environmentIntensity=.55;box.dispose();materials.forEach(m=>m.dispose());pmrem.dispose()
  return()=>{scene.environment=previous;scene.environmentIntensity=previousIntensity;environment.dispose()}
 },[get])
 useEffect(()=>{let live=true;void document.fonts.ready.then(()=>{if(live){studio.refresh();get().invalidate()}});return()=>{live=false;studio.dispose()}},[studio,get])
 return <group name="assembly-laboratory">{studio.batches.map(({key,geometry,material})=><mesh key={key} geometry={geometry} material={material} dispose={null} raycast={()=>null}/>)}</group>
}
