import {useEffect,useMemo,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {adaptiveMuseumResolution,pixelBudget} from './museumAdaptivePolicy'
import {useMuseumQuality} from './useMuseumQuality'
import {useMuseumNavigation} from '@/features/museum/navigationState'
export function MuseumAdaptive({mobile}:{mobile:boolean}){
 const {setDpr,size}=useThree(),controller=useMemo(()=>adaptiveMuseumResolution(),[]),tier=useMuseumQuality(s=>s.tier),choice=useMuseumQuality(s=>s.choice),bounds=useMemo(()=>pixelBudget(size.width,size.height,devicePixelRatio,mobile,tier),[size.width,size.height,mobile,tier]),current=useRef(bounds.max),previous=useRef({choice,width:size.width,height:size.height})
 useEffect(()=>{const p=previous.current,reset=p.choice!==choice||p.width!==size.width||p.height!==size.height;current.current=reset?bounds.max:Math.max(bounds.min,Math.min(bounds.max,current.current));previous.current={choice,width:size.width,height:size.height};setDpr(current.current)},[bounds,setDpr,choice,size.width,size.height])
 useFrame(({gl},dt)=>{if(Math.abs(gl.getPixelRatio()-current.current)>.001)setDpr(current.current);const nav=useMuseumNavigation.getState(),q=useMuseumQuality.getState(),decision=controller.sample(dt,{tier:q.tier,effects:q.effects,reason:q.reason,dpr:current.current,auto:q.choice==='auto',active:gl.domElement.dataset.museumPrepared==='ready'&&!document.hidden&&!nav.overlay&&nav.mode!=='inspect',hall:nav.location,intent:nav.intent,min:bounds.min,max:bounds.max});gl.domElement.dataset.qualityTier=q.tier
 if(decision){current.current=decision.dpr;setDpr(decision.dpr);if(decision.tier!==q.tier||decision.effects!==q.effects||decision.reason!==q.reason)useMuseumQuality.setState({tier:decision.tier,effects:decision.effects,reason:decision.reason})}
 })
 return null
}
