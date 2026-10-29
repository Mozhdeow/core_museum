import {useEffect,useMemo} from 'react'
import {PlaneGeometry,PerspectiveCamera,type ShaderMaterial} from 'three'
import {Reflector} from 'three/addons/objects/Reflector.js'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {useMuseumQuality} from './useMuseumQuality'
/** One static-architecture capture per tier/context; never another scene render while walking. */
function ArchitecturalReflection(){
 const tier=useMuseumQuality(s=>s.tier),revision=useMuseumQuality(s=>s.contextRevision)
 const reflection=useMemo(()=>{
  const geometry=new PlaneGeometry(14,42),mirror=new Reflector(geometry,{textureWidth:tier==='high'?512:256,textureHeight:tier==='high'?512:256,multisample:0,color:'#393b3c'}),material=mirror.material as ShaderMaterial
  material.transparent=true;material.depthWrite=false;material.uniforms.opacity={value:.11}
  material.fragmentShader=material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec2 uv=vUv.xy/vUv.w;vec2 stepUV=vec2(1.5/${tier==='high'?'512.':'256.'});vec4 base=texture2D(tDiffuse,uv)*.4+(texture2D(tDiffuse,uv+stepUV)+texture2D(tDiffuse,uv-stepUV)+texture2D(tDiffuse,uv+vec2(stepUV.x,-stepUV.y))+texture2D(tDiffuse,uv+vec2(-stepUV.x,stepUV.y)))*.15;`).replace('uniform vec3 color;','uniform vec3 color;uniform float opacity;').replace('blendOverlay( base.rgb, color ), 1.0','blendOverlay( base.rgb, color ), opacity')
  const render=mirror.onBeforeRender,camera=new PerspectiveCamera(60,16/9,.1,90);camera.position.set(0,1.72,15.5);camera.lookAt(0,1.6,0);camera.updateMatrixWorld()
  let captured=false,frames=0
  mirror.userData.contextRevision=revision;mirror.userData.reflection='baked';mirror.userData.captures=0
  mirror.onBeforeRender=(gl,scene,_camera,geometry,material,group)=>{
   if(captured||++frames<4)return
   // Only emissive strips/static finishes; never dynamic leaves, studies, glass or uploaded assets.
   scene.traverse(node=>{if(['entrance-bronze','entrance-graphite','entrance-light-trim','passage-fixture-faces','static-architecture-finish'].includes(node.name)||'isLight'in node)node.layers.enable(1)})
   camera.layers.set(1);mirror.getReflectionCamera(camera).layers.set(1)
   render.call(mirror,gl,scene,camera,geometry,material,group);captured=true;mirror.userData.captures=1
  };return {mirror,geometry}
 // Revision recreates a lost render target even when the selected tier is unchanged.
 },[tier,revision])
 useEffect(()=>()=>{reflection.mirror.dispose();reflection.geometry.dispose()},[reflection])
 return <primitive name="museum-architectural-reflection" object={reflection.mirror} position={[0,-.023,-1]} rotation={[-Math.PI/2,0,0]} raycast={()=>null}/>
}
export function EntranceStoneFloor(){
 const resources=useMuseumVisualResources(),tier=useMuseumQuality(s=>s.tier)
 return <><mesh name="entrance-floor:stone" position={[0,-.025,10.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[14,19]}/><meshStandardMaterial map={resources.textures.stone} roughnessMap={resources.textures.roughness} color="#77797c" roughness={.6} metalness={.14} envMapIntensity={.6}/></mesh>{tier!=='low'&&<ArchitecturalReflection/>}</>
}
