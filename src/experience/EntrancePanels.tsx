import {useEffect,useMemo,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {CanvasTexture,SRGBColorSpace,MeshStandardMaterial,Vector3,type Group,type Mesh,type BufferGeometry} from 'three'
import {useMuseumQuality} from './useMuseumQuality'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {useReducedMotion} from '@/hooks/usePreferences'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {drawMuseumOrientation,orientationRows} from './museumOrientation'
import {drawMuseumStory,type MuseumStory} from './museumStoryDrawing'
export type EntrancePanelContent={eyebrow:string;title:string;lines:string[];footer:string;portrait?:string;story?:MuseumStory;diagram?:'intro'|'cpu'|'gpu'|'memory'|'motherboard'|'storage'}
/** One opaque, physically backed print: text never competes in the glass alpha queue. */
export function EntrancePanel({content,at,width,height,rotation=0,rtl=false}:{content:EntrancePanelContent;at:[number,number,number];width:number;height:number;rotation?:number;rtl?:boolean}){
 const tier=useMuseumQuality(s=>s.tier),reduced=useReducedMotion(),shared=useMuseumVisualResources(),root=useRef<Group>(null),printMesh=useRef<Mesh<BufferGeometry,MeshStandardMaterial>>(null),world=useMemo(()=>new Vector3(),[]),marker=useRef<Mesh>(null),progress=useRef(0),invalidate=useThree(s=>s.invalidate),key=JSON.stringify(content)
 const resources=useMemo(()=>{
  const canvas=document.createElement('canvas'),scale=2;canvas.width=Math.round(768*scale);canvas.height=Math.round(1280*scale)
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=Math.min(shared.textures.brushed.anisotropy,8)
  const reveal={value:0},print=new MeshStandardMaterial({map:texture,roughness:.62,metalness:.06,envMapIntensity:.32,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.23})
  print.onBeforeCompile=shader=>{shader.uniforms.plateReveal=reveal;shader.vertexShader='varying vec2 vPanel;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvPanel=uv;');shader.fragmentShader='varying vec2 vPanel;uniform float plateReveal;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat imageBand=step(.50,vPanel.y)*step(vPanel.y,.76);diffuseColor.rgb*=mix(1.,.82+.18*plateReveal,imageBand);')};print.customProgramCacheKey=()=> 'museum-opaque-plate-2'
  const frame=shared.frameGeometry(width,height)
  print.userData.reveal=reveal;return {canvas,texture,print,frame,scale}
 },[width,height,shared])
 useFrame(({camera},dt)=>{if(marker.current){const hall=useMuseumNavigation.getState().location;marker.current.position.y=height*(.5-orientationRows[hall]/1280);marker.current.userData.hall=hall}const ink=printMesh.current?.material.userData.reveal;if(!ink)return;if(reduced){ink.value=1;progress.current=1;return}if(progress.current>=1){ink.value=1;return}if(document.hidden||useMuseumNavigation.getState().atmospherePaused)return;root.current?.getWorldPosition(world);world.project(camera);if(Math.abs(world.x)>1.3||Math.abs(world.y)>1.4||Math.abs(world.z)>1)return;progress.current=Math.min(1,progress.current+Math.min(dt,.05)/1.1);ink.value=1-Math.pow(1-progress.current,3)})
 useEffect(()=>{
  let active=true;const data=JSON.parse(key) as EntrancePanelContent,image=data.portrait?new Image():null
  const draw=()=>{if(!active)return;const c=resources.canvas.getContext('2d')!;c.setTransform(resources.scale,0,0,resources.scale,0,0);c.fillStyle='#141817';c.fillRect(0,0,768,1280);const glow=c.createLinearGradient(0,0,0,1280);glow.addColorStop(0,'#ddbf8320');glow.addColorStop(.6,'#ffffff00');glow.addColorStop(1,'#00000030');c.fillStyle=glow;c.fillRect(0,0,768,1280);c.strokeStyle='#7c6038';c.lineWidth=2;c.strokeRect(20,20,728,1240)
   const x=rtl?698:70;c.textAlign=rtl?'right':'left';c.direction=rtl?'rtl':'ltr'
   const text=(value:string,y:number,size:number,color='#ebe8dd')=>{c.fillStyle=color;c.font=`500 ${size}px "Space Grotesk","Vazirmatn",sans-serif`;c.fillText(value,x,y,628)}
   text(data.eyebrow,data.portrait||data.diagram==='intro'?110:75,25,'#eab769');let titleSize=data.portrait?64:58;c.font=`500 ${titleSize}px "Space Grotesk","Vazirmatn",sans-serif`;while(c.measureText(data.title).width>628&&titleSize>38)c.font=`500 ${--titleSize}px "Space Grotesk","Vazirmatn",sans-serif`;text(data.title,data.portrait||data.diagram==='intro'?223:164,titleSize)
   if(image?.complete&&image.naturalWidth>0){const crop=Math.min(image.naturalWidth/600,image.naturalHeight/600),sw=600*crop,sh=600*crop;c.save();c.filter='grayscale(1) sepia(.55) saturate(.7) contrast(1.05)';c.drawImage(image,(image.naturalWidth-sw)/2,Math.max(0,(image.naturalHeight-sh)*.18),sw,sh,84,360,600,600);c.restore();data.lines.slice(0,2).forEach((line,i)=>text(line,1035+i*55,35,'#c8c3b9'));text(data.footer,1220,21,'#eab769')}
   else if(!data.portrait){
    if(data.diagram==='intro'){drawMuseumOrientation(c,rtl);data.lines.slice(0,3).forEach((line,i)=>text(line,945+i*55,35,'#c8c3b9'));text(data.footer,1220,21,'#eab769')}
    else{if(data.story)drawMuseumStory(c,data.story,84,210,600,290,rtl);c.textAlign=rtl?'right':'left';c.direction=rtl?'rtl':'ltr';data.lines.slice(0,2).forEach((line,i)=>text(line,550+i*49,31,'#d1d3ca'));text(data.footer,660,23,'#c5ac7a');c.fillStyle='#ffb547';c.fillRect(rtl?608:70,710,90,2)}
   }
   const map=printMesh.current?.material.map;if(map)map.needsUpdate=true;invalidate()
  };draw();void document.fonts.ready.then(draw);if(image){image.onload=draw;image.onerror=draw;image.src=data.portrait!}return()=>{active=false;if(image){image.onload=null;image.onerror=null}}
 },[key,resources,rtl,invalidate])
 useEffect(()=>()=>{resources.texture.dispose();resources.print.dispose()},[resources])
 return <group ref={root} name={`entrance-panel:${content.eyebrow}`} position={at} rotation={[0,rotation,0]} userData={{topic:content.story?.kind,physicalPlate:true,educationalIllustration:!content.portrait&&content.diagram!=='intro'}}>
  {content.diagram==='intro'&&<mesh ref={marker} name="orientation-you-are-here" position={[-width*.102,0,.012]}><circleGeometry args={[width*.014,16]}/><meshBasicMaterial color="#ffb547" toneMapped={false}/></mesh>}
  <mesh position={[0,0,-.014]} scale={[width+.055,height+.055,.022]} geometry={shared.box} material={shared.backing} dispose={null} raycast={()=>null}/>
  <mesh ref={printMesh} name="gallery-print" scale={[width,height,1]} geometry={shared.plane} material={resources.print} dispose={null} raycast={()=>null}/>
  <mesh name="gallery-frame" position={[0,0,-.012]} geometry={resources.frame} material={shared.frame} dispose={null} raycast={()=>null}/>
  {content.portrait&&tier!=='low'&&<mesh position={[0,0,.015]} scale={[width,height,1]} geometry={shared.plane} material={shared.glass} dispose={null} renderOrder={20} raycast={()=>null}/>}
  <mesh position={[0,0,-.024]} scale={[width+.18,height+.18,1]} geometry={shared.plane} material={shared.ao} dispose={null} raycast={()=>null}/>
 </group>
}
