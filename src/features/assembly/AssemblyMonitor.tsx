import {useEffect,useMemo,useRef} from 'react'
import {useThree} from '@react-three/fiber'
import {CanvasTexture,SRGBColorSpace,type Mesh,type BufferGeometry,type MeshBasicMaterial} from 'three'
import {useTranslation} from 'react-i18next'
import {useAssembly} from './assemblyStore'
import {scenarios} from './troubleshooting'
import {drawDesktop,windowMark} from './monitorDesktop'

export function MonitorScreen(){
 const stage=useAssembly(s=>s.displayStage),trial=useAssembly(s=>s.troubleshooting),devices=useAssembly(s=>s.peripherals),typed=useAssembly(s=>s.typedText),cursor=useAssembly(s=>s.cursor),typing=useAssembly(s=>s.monitorFocused),{t,i18n}=useTranslation('assembly'),{invalidate,gl}=useThree(),mesh=useRef<Mesh<BufferGeometry,MeshBasicMaterial>>(null)
 const resource=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=600;const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return {canvas,map,wallpaper:new Image()}},[])
 useEffect(()=>{let live=true;const draw=()=>{if(!live)return;const c=resource.canvas.getContext('2d')!,fa=i18n.language==='fa'
  if(stage==='desktop')drawDesktop(c,{label:t('desktop.label'),files:t('desktop.files'),browser:t('desktop.browser'),notes:t('desktop.notes'),search:t('desktop.search'),notice:t('desktop.notice'),typeHint:t('desktop.typeHint')},typed,cursor,Boolean(devices.mouse),Boolean(devices.keyboard),fa,resource.wallpaper,typing)
  else{
   const background=c.createLinearGradient(0,0,1024,600);background.addColorStop(0,'#0a0d12');background.addColorStop(1,'#211d18');c.fillStyle=background;c.fillRect(0,0,1024,600);c.textAlign='center';c.direction=fa?'rtl':'ltr';c.fillStyle='#e5b86c';c.font='500 28px "Space Grotesk",sans-serif';c.fillText('C O R E',512,115)
   const symptom=stage==='diagnostic'&&trial?scenarios[trial.id]:null
   if(stage==='osBoot')windowMark(c,486,168,52)
   c.fillStyle='#eee9df';c.font='500 48px "Vazirmatn","Space Grotesk",sans-serif'
   c.fillText(t(stage==='welcome'?'welcome':stage==='post'?'starting':stage==='osBoot'?'desktop.boot':symptom&&symptom.screen!=='noSignal'?'trouble.screens.'+symptom.screen:'noSignal'),512,300,910)
   c.font='400 24px "Vazirmatn",sans-serif';c.fillStyle='#adafa9';c.fillText(t(stage==='welcome'?'success':stage==='diagnostic'?'trouble.faultSignal':stage==='noSignal'?'displayHint':'simulation'),512,370,900)
   if(stage==='post'||stage==='osBoot'){c.fillStyle='#d2a76b';for(let i=0;i<5;i++){c.beginPath();c.arc(472+i*20,430,3.5,0,Math.PI*2);c.fill()}}
   if(symptom){c.font='400 20px "Vazirmatn",sans-serif';c.fillText(symptom.title[fa?'fa':'en'],512,440,900)}
  }
  if(mesh.current?.material.map)mesh.current.material.map.needsUpdate=true;invalidate()
 };draw();resource.wallpaper.addEventListener('load',draw);resource.wallpaper.addEventListener('error',draw);void document.fonts.ready.then(draw);return()=>{live=false;resource.wallpaper.removeEventListener('load',draw);resource.wallpaper.removeEventListener('error',draw)}},[resource,stage,trial,t,i18n.language,invalidate,devices,typed,cursor,typing])
 useEffect(()=>()=>{gl.domElement.style.removeProperty('cursor')},[gl])
 useEffect(()=>{resource.wallpaper.setAttribute('src','/images/assembly/windows11-bloom.jpg');return()=>{resource.wallpaper.removeAttribute('src');resource.map.dispose()}},[resource])
 return <mesh ref={mesh} name="assembly-monitor-screen" position={[0,0,.091]} userData={{displayStage:stage}}
  onPointerOver={e=>{e.stopPropagation();const s=useAssembly.getState();if(s.power==='running'&&s.displayStage==='desktop')gl.domElement.style.setProperty('cursor',s.peripherals.mouse?'none':s.peripherals.keyboard?'text':'')}}
  onPointerOut={()=>{gl.domElement.style.removeProperty('cursor')}}
  onPointerMove={e=>{e.stopPropagation();const s=useAssembly.getState();if(s.power==='running'&&s.displayStage==='desktop'&&e.uv)s.moveCursor(e.uv.x,1-e.uv.y)}}
  onPointerDown={e=>e.stopPropagation()}
  onClick={e=>{e.stopPropagation();const s=useAssembly.getState();if(s.power==='running'&&s.displayStage==='desktop'&&s.peripherals.keyboard)window.dispatchEvent(new Event('core-monitor-focus'))}}>
 <planeGeometry args={[3.02,1.70]}/><meshBasicMaterial map={resource.map} toneMapped={false}/></mesh>
}
