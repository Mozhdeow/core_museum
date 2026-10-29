import {useCallback,useLayoutEffect,useRef,useState,type RefObject} from 'react'
import {flushSync} from 'react-dom'
import gsap from 'gsap'
import {useReducedMotion} from '@/hooks/usePreferences'
import type {GalleryImage} from '@/types/museum'

type Phase='preparing'|'closing'|'travelling'|'opening'|'open'|'entering'|'inside'|'returning'
type MediaState='loading'|'ready'|'error'
type LoadResult=MediaState|'cancelled'

/** One GSAP owner. Selection requests coalesce; pixels change only behind closed doors. */
export function useElevatorGallery(root:RefObject<HTMLDivElement|null>,images:GalleryImage[]){
    const reduced=useReducedMotion()
    const [view,setView]=useState<{index:number;requested:number;phase:Phase;media:MediaState}>({index:0,requested:0,phase:'preparing',media:'loading'})
    const commands=useRef<{select(index:number,retry?:boolean):void;zoom(inside:boolean):void}>({select:()=>{},zoom:()=>{}})
    useLayoutEffect(()=>{
        const node=root.current
        if(!node||!images.length)return
        const space=node.querySelector<HTMLElement>('.elevator-space')!,aperture=node.querySelector<HTMLElement>('.elevator-aperture')!
        const media=node.querySelector<HTMLButtonElement>('.elevator-media')!,image=media.querySelector('img')!
        const doors=[node.querySelector('.elevator-door-left')!,node.querySelector('.elevator-door-right')!]
        const chrome=node.querySelector('.elevator-architecture')!,caption=node.querySelector('.elevator-caption')!
        const indicator=node.querySelector('.elevator-travel-line')!,returnButton=node.querySelector<HTMLButtonElement>('[data-gallery-return]')!
        const context=gsap.context(()=>{},node)
        let alive=true,busy=false,requested=0,current=-1,force=false,doorsOpen=false,phase:Phase='preparing',zoomRevision=0
        let timeline:gsap.core.Timeline|undefined,finishMotion:(()=>void)|undefined,cancelLoad:(()=>void)|undefined,preload:HTMLImageElement|undefined
        const update=(patch:Partial<typeof view>)=>{if(alive)setView(v=>({...v,...patch}))}
        const changePhase=(next:Phase)=>{phase=next;update({phase:next})}
        const stopMotion=()=>{timeline?.kill();finishMotion?.();finishMotion=undefined}
        const animate=(build:(tl:gsap.core.Timeline)=>void)=>new Promise<void>(resolve=>{
            stopMotion();finishMotion=resolve
            context.add(()=>{
                timeline=gsap.timeline({paused:true,onComplete:()=>{finishMotion=undefined;resolve()}})
                build(timeline)
                if(reduced){timeline.progress(1);finishMotion=undefined;resolve()}else timeline.play(0)
            })
        })
        // Fit the SAME DOM image at both endpoints using uniform scale: no crop/asset swap.
        const mediaPose=(inside:boolean)=>{
            const s=space.getBoundingClientRect(),a=aperture.getBoundingClientRect()
            const ratio=image.naturalWidth/image.naturalHeight||1
            const fit=(w:number,h:number)=>{const width=Math.min(w,h*ratio);return {width,height:width/ratio}}
            const large=fit(Math.max(1,s.width-32),Math.max(1,s.height-24)),small=fit(a.width,a.height)
            gsap.set(media,{width:large.width,height:large.height,transformOrigin:'0 0'})
            return inside?{x:(s.width-large.width)/2,y:(s.height-large.height)/2,scale:1}:
                {x:a.left-s.left+(a.width-small.width)/2,y:a.top-s.top+(a.height-small.height)/2,scale:small.width/large.width}
        }
        const zoom=async(inside:boolean)=>{
            if(!alive||!(phase==='open'||phase==='inside'||phase==='entering'||phase==='returning')||!image.naturalWidth)return
            const revision=++zoomRevision
            changePhase(inside?'entering':'returning')
            await animate(tl=>{
                tl.to(media,{...mediaPose(inside),duration:reduced?0:.52,ease:'power3.inOut'},0)
                  .to(chrome,{opacity:inside?0:1,duration:reduced?0:.24},0)
            })
            if(!alive||revision!==zoomRevision)return
            // The target is hidden/disabled until React commits the new phase.
            flushSync(()=>changePhase(inside?'inside':'open'))
            ;(inside?returnButton:media).focus({preventScroll:true})
        }
        const doorMotion=async(open:boolean)=>{
            changePhase(open?'opening':'closing')
            await animate(tl=>{
                tl.to(doors[0],{xPercent:open?-101:0,duration:open?.62:.44,ease:'power2.inOut'},0)
                  .to(doors[1],{xPercent:open?101:0,duration:open?.62:.44,ease:'power2.inOut'},0)
                  .to(caption,{opacity:open?1:0,duration:.18},open?.38:0)
                if(current<0)tl.fromTo(Array.from(node.querySelectorAll('.elevator-number')).slice(0,6),{y:6,opacity:.5},{y:0,opacity:1,duration:.2,stagger:.035},0)
            })
            doorsOpen=open
        }
        const load=(url:string)=>new Promise<LoadResult>(resolve=>{
            let done=false
            const finish=(result:LoadResult)=>{
                if(done)return;done=true;clearTimeout(timeout);image.onload=null;image.onerror=null;cancelLoad=undefined;resolve(result)
            }
            const timeout=window.setTimeout(()=>finish('error'),12000)
            cancelLoad=()=>{finish('cancelled');image.removeAttribute('src')}
            image.onload=()=>{if(image.naturalWidth)finish('ready');else finish('error')}
            image.onerror=()=>finish('error')
            image.src=url
            if(image.complete&&image.naturalWidth)finish('ready')
        })
        const run=async()=>{
            if(busy||!alive)return
            busy=true
            try{
                while(alive&&(current!==requested||force)){
                    if(doorsOpen)await doorMotion(false)
                    if(!alive)break
                    const choice=requested;force=false
                    changePhase(current<0?'preparing':'travelling')
                    // Commit metadata while the doors are fully shut, before touching the source.
                    flushSync(()=>update({index:choice,media:'loading'}))
                    const [result]=await Promise.all([load(images[choice].url),animate(tl=>{
                        tl.fromTo(indicator,{scaleX:.08,opacity:.25},{scaleX:1,opacity:1,duration:current<0?.3:.7,ease:'sine.inOut'})
                    })])
                    if(!alive)break
                    if(choice!==requested||result==='cancelled')continue
                    flushSync(()=>update({media:result==='ready'?'ready':'error'}))
                    if(result==='ready')gsap.set(media,mediaPose(false))
                    await doorMotion(true)
                    if(!alive)break
                    current=choice;changePhase('open')
                    // Only the next neighbour, never an entire full-resolution archive.
                    if(preload)preload.removeAttribute('src')
                    if(images.length>1){preload=new Image();preload.src=images[(choice+1)%images.length].url}
                }
            }finally{busy=false}
        }
        commands.current={
            select(index,retry=false){
                if(!alive||index<0||index>=images.length||['inside','entering','returning'].includes(phase))return
                if(index===requested&&!retry)return
                requested=index;force=retry;update({requested:index})
                cancelLoad?.();void run()
            },
            zoom:inside=>{void zoom(inside)},
        }
        const resize=new ResizeObserver(()=>{
            if(!image.naturalWidth)return
            const inside=phase==='inside'||phase==='entering'
            if(phase==='entering'||phase==='returning'){
                zoomRevision++;stopMotion();changePhase(inside?'inside':'open');gsap.set(chrome,{opacity:inside?0:1})
            }
            gsap.set(media,mediaPose(inside))
        })
        resize.observe(space);resize.observe(aperture)
        context.add(()=>{gsap.set(doors,{xPercent:0});gsap.set(caption,{opacity:0})})
        void Promise.resolve().then(run)
        return()=>{
            alive=false;zoomRevision++;commands.current={select:()=>{},zoom:()=>{}}
            cancelLoad?.();stopMotion();resize.disconnect();context.revert()
            image.onload=null;image.onerror=null;image.removeAttribute('src');preload?.removeAttribute('src')
        }
    },[root,images,reduced])
    return {...view,reduced,select:useCallback((index:number,retry=false)=>commands.current.select(index,retry),[]),
        zoom:useCallback((inside:boolean)=>commands.current.zoom(inside),[])}
}
