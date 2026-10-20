import {useCallback, useEffect, useMemo, useRef} from 'react'
import {useFrame, useThree} from '@react-three/fiber'
import {Euler, Quaternion, Vector3, MathUtils, Matrix4, PerspectiveCamera} from 'three'
import {createMuseumRoute} from '@/features/museum/museumRoute'
import gsap from 'gsap'
import {constrainMuseumPosition, destinationAt, useMuseumNavigation} from '@/features/museum/navigationState'
import {moveMuseumPosition,excludeCPUPlatform} from '@/features/museum/museumCollision'
import {useCPUExperience} from '@/features/museum/cpuExperienceState'
import {museumKeyboardOwned} from '@/features/museum/navigationKeyboard'
import {useVisitRuntime,captureVisit,flushVisit} from '@/features/museum/visitRuntime'
import {VISIT_VERSION,VISIT_ARCHITECTURE,type WalkingPose} from '@/features/museum/visitPersistence'
import {useMuseumStore} from '@/features/museum/museumStore'
import {selectedMuseumItem} from '@/features/museum/museumState'
import {categoryShowcases,SHOWCASE_X} from '@/features/museum/exhibition'
import {inspectionFraming} from './modelGeometry'

export function MuseumNavigation({reduced,owner}: {reduced: boolean;owner?:string}) {
    const {camera, gl, invalidate, size} = useThree()
    const mode = useMuseumNavigation(s => s.mode), playing = useMuseumNavigation(s => s.playing)
    const overlay=useMuseumNavigation(s=>s.overlay)
    const showcase=useMuseumNavigation(s=>s.showcase)
    const flight=useRef<{amount:number;start:Vector3;rotation:Quaternion;end:Vector3;target:Vector3;complete:()=>void}|null>(null)
    const intent=useMuseumNavigation(s=>s.intent),visit=useVisitRuntime()
    const modelStatus=useMuseumStore(s=>visit.phase==='restoring'?s.modelStatus:null)
    const restoreGuard=useRef<{mode:string;request:number;intent:number}|null>(null)
    const checkpoint=useRef<'entrance'|'corridor'|'cpu'>('entrance'),returnProgress=useRef(0),returning=useRef(false)
    const request = useMuseumNavigation(s => s.request), inspectCommand = useMuseumNavigation(s=>s.inspectCommand)
    const orbit = useRef({yaw:.05,pitch:.24,distance:7.2})
    const savedPose = useRef<{position:Vector3;quaternion:Quaternion}|null>(null)
    const pointers = useRef(new Map<number,{x:number;y:number}>())
    const driver = useRef({progress: 0}), tween = useRef<gsap.core.Tween | null>(null)
    const keys = useRef(new Set<string>()), look = useRef({active: false, x: 0, y: 0, yaw: 0, pitch: 0})
    const reportAt = useRef(-1), screenShift=useRef({x:0,y:0})
    const route = useMemo(()=>createMuseumRoute(), [])
    const work = useMemo(() => ({position: new Vector3(), target: new Vector3(), quaternion: new Quaternion(),
        matrix: new Matrix4(), euler: new Euler(0, 0, 0, 'YXZ')}), [])
    const sample=useCallback(()=>{
        const runtime=useVisitRuntime.getState(),nav=useMuseumNavigation.getState(),catalog=useMuseumStore.getState()
        if(!owner||runtime.owner!==owner||runtime.phase!=='ready'||catalog.owner!==owner||catalog.status!=='ready')return
        const inspecting=nav.mode==='inspect',pose=inspecting?savedPose.current:{position:camera.position,quaternion:camera.quaternion}
        if(!pose)return
        const exp=useCPUExperience.getState(),item=selectedMuseumItem(catalog)
        captureVisit({version:VISIT_VERSION,architecture:VISIT_ARCHITECTURE,owner:runtime.owner,savedAt:Date.now(),
            mode:nav.showcase?'explore':inspecting?nav.returnTo?.mode??'guided':nav.mode as 'guided'|'explore',
            pose:{position:pose.position.toArray(),quaternion:pose.quaternion.toArray()} as WalkingPose,
            location:destinationAt(pose.position.z),checkpoint:checkpoint.current,progress:inspecting?returnProgress.current:nav.progress,
            target:nav.request.target,selectedId:catalog.focusedItemId,sectionId:catalog.section,categoryId:catalog.categoryFilter,...(nav.showcase?{showcaseBay:nav.showcase.bay}:{}),
            inspect:inspecting&&nav.inspection==='active'?{view:exp.view,sourceId:exp.sourceId,modelPath:item?.modelPath??null,orbit:{...orbit.current}}:null})
        flushVisit()
    },[camera,owner])
    useEffect(()=>{
        const flush=()=>{sample();flushVisit(true)}
        window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',flush)
        return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',flush)}
    },[sample])
    useEffect(() => {
        // Widen portrait framing without resetting the owned camera pose on resize.
        if(camera instanceof PerspectiveCamera) {
            Object.assign(camera,{fov:size.width/size.height<.75?70:60})
            camera.updateProjectionMatrix();invalidate()
        }
    },[camera,size.width,size.height,invalidate])
    useEffect(() => {
        const canvas = gl.domElement
        canvas.setAttribute('tabindex', '0')
        canvas.setAttribute('aria-label', 'Museum 3D navigation / حرکت در موزه')
        canvas.setAttribute('data-camera-z',camera.position.z.toFixed(2))
        canvas.setAttribute('data-camera-x',camera.position.x.toFixed(2))
        const clear = () => {pointers.current.clear();keys.current.clear(); look.current.active = false; useMuseumNavigation.getState().setMove(0)}
        const down = (e: KeyboardEvent) => {
            if(useMuseumNavigation.getState().overlay)return
            if(useMuseumNavigation.getState().mode==='inspect') {
                if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.target instanceof HTMLElement&&e.target.closest('input,select,textarea,[contenteditable="true"]'))return
                if(e.key==='Escape'){e.preventDefault();useMuseumNavigation.getState().exitInspect();return}
                if(e.target!==canvas)return
                const o=orbit.current
                if(e.code==='ArrowLeft')o.yaw-=.08;else if(e.code==='ArrowRight')o.yaw+=.08
                else if(e.code==='ArrowUp')o.pitch+=.05;else if(e.code==='ArrowDown')o.pitch-=.05
                else if(e.key==='+'||e.key==='=')o.distance-=.35;else if(e.key==='-')o.distance+=.35;else return
                e.preventDefault();invalidate();return
            }
            if (useMuseumNavigation.getState().mode !== 'explore' || e.defaultPrevented || museumKeyboardOwned(e.target) ||
                (e.target instanceof HTMLElement && e.target.closest('button,a')) || e.altKey || e.ctrlKey || e.metaKey) return
            if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'KeyQ', 'KeyE'].includes(e.code)) {
                e.preventDefault(); keys.current.add(e.code); invalidate()
            }
        }
        const up = (e: KeyboardEvent) => {keys.current.delete(e.code)}
        const pointerDown = (e: PointerEvent) => {
            if(useMuseumNavigation.getState().overlay)return
            if(useMuseumNavigation.getState().mode==='inspect') {
                if(useMuseumNavigation.getState().inspection!=='active'||e.button!==0)return
                e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId)
                pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});return
            }
            if (useMuseumNavigation.getState().mode !== 'explore' || e.button !== 0) return
            canvas.focus({preventScroll: true}); canvas.setPointerCapture(e.pointerId)
            pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
            Object.assign(look.current, {active: true, x: e.clientX, y: e.clientY})
        }
        const pointerMove = (e: PointerEvent) => {
            if(useMuseumNavigation.getState().overlay)return
            if(useMuseumNavigation.getState().mode==='inspect') {
                const previous=pointers.current.get(e.pointerId);if(!previous)return
                const o=orbit.current,other=Array.from(pointers.current.entries()).find(([id])=>id!==e.pointerId)?.[1]
                if(other){const before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(after>1)o.distance*=before/after}
                else {o.yaw-=(e.clientX-previous.x)*.005;o.pitch+=(e.clientY-previous.y)*.004}
                pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});invalidate();return
            }
            const state = look.current
            if (!state.active) return
            state.yaw -= (e.clientX - state.x) * .003
            state.pitch = MathUtils.clamp(state.pitch - (e.clientY - state.y) * .0025, -.65, .65)
            state.x = e.clientX; state.y = e.clientY; invalidate()
        }
        const pointerUp = (e:PointerEvent) => {pointers.current.delete(e.pointerId);look.current.active = false}
        const wheel=(e:WheelEvent)=>{if(useMuseumNavigation.getState().mode==='inspect'){e.preventDefault();orbit.current.distance+=Math.sign(e.deltaY)*.35;invalidate()}}
        canvas.addEventListener('wheel',wheel,{passive:false})
        const visibility = () => {clear(); if (document.hidden) tween.current?.pause(); else if (useMuseumNavigation.getState().playing&&!useMuseumNavigation.getState().overlay) tween.current?.resume()}
        window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear)
        document.addEventListener('visibilitychange', visibility)
        const unsubscribe = useMuseumNavigation.subscribe((state, previous) => {if (state.move !== previous.move) invalidate()})
        canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove)
        canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('lostpointercapture', pointerUp)
        return () => {
            unsubscribe(); clear();canvas.removeEventListener('wheel',wheel); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear)
            document.removeEventListener('visibilitychange', visibility)
            canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove)
            canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('lostpointercapture', pointerUp)
        }
    }, [camera, gl, invalidate])
    useEffect(() => {
        tween.current?.kill(); keys.current.clear(); look.current.active = false
        reportAt.current = -1
        const runtime=useVisitRuntime.getState(),nav=useMuseumNavigation.getState()
        if(runtime.owner!==owner)return
        if(runtime.phase!=='ready'){
            if(nav.intent!==runtime.intent){runtime.ready()}
            else if(runtime.phase==='waiting')return
            else {
                const s=runtime.snapshot
                if(s){
                    const catalog=useMuseumStore.getState(),item=selectedMuseumItem(catalog)
                    const sourceId=item?.id??null
                    let inspection=s.inspect
                    if(inspection&&(inspection.sourceId!==sourceId||(inspection.view==='model'&&(!item?.model3DUrl||item?.modelPath!==inspection.modelPath))))inspection=null
                    if(inspection?.view==='model'&&catalog.modelStatus==='loading')return
                    if(inspection?.view==='model'&&catalog.modelStatus!=='ready')inspection=null
                    camera.position.fromArray(s.pose.position);camera.quaternion.fromArray(s.pose.quaternion)
                    driver.current.progress=s.progress;returnProgress.current=s.progress;checkpoint.current=s.checkpoint
                    work.euler.setFromQuaternion(camera.quaternion,'YXZ');look.current.yaw=work.euler.y;look.current.pitch=work.euler.x
                    const restoredMode=inspection?'inspect':s.mode,requestId=nav.request.id+1
                    savedPose.current=inspection?{position:camera.position.clone(),quaternion:camera.quaternion.clone()}:null
                    if(inspection){Object.assign(orbit.current,inspection.orbit);useCPUExperience.getState().open(sourceId,inspection.view==='model')}
                    restoreGuard.current={mode:restoredMode,request:requestId,intent:nav.intent}
                    useMuseumNavigation.setState({mode:restoredMode,playing:false,progress:s.progress,location:s.location,move:0,overlay:null,
                        inspection:inspection?'entering':'closed',returnTo:inspection?{mode:s.mode,playing:false}:null,showcase:s.showcaseBay===undefined||!item?null:{id:1,bay:Math.max(0,categoryShowcases(catalog).findIndex(c=>c.category.id===item.categoryId))},
                        request:{id:requestId,target:s.target,instant:false},arrivalRevision:nav.arrivalRevision+1})
                    runtime.ready();invalidate();return
                }
                runtime.ready()
            }
        }
        const guard=restoreGuard.current
        if(guard&&guard.mode===mode&&guard.request===request.id&&guard.intent===nav.intent){invalidate();return}
        restoreGuard.current=null
        flight.current=null
        if(mode==='inspect') {
            if(!savedPose.current){
                const safe=constrainMuseumPosition(camera.position.x,camera.position.z)
                savedPose.current={position:camera.position.clone().setX(safe.x).setZ(safe.z),quaternion:camera.quaternion.clone()}
                const distance=useCPUExperience.getState().view==='model'?inspectionFraming(nav.artifactRadius,(camera as PerspectiveCamera).aspect,(camera as PerspectiveCamera).fov).home:7.2
                Object.assign(orbit.current,{yaw:.05,pitch:.24,distance})
                returnProgress.current=nav.progress
            }
            invalidate();return
        }
        if (mode === 'explore') {
            returning.current=false
            const safe=constrainMuseumPosition(camera.position.x,camera.position.z);camera.position.setX(safe.x);camera.position.setZ(safe.z)
            gl.domElement.focus({preventScroll: true})
            work.euler.setFromQuaternion(camera.quaternion, 'YXZ')
            look.current.yaw = work.euler.y; look.current.pitch = work.euler.x
            return
        }
        if(showcase){
            const bay=categoryShowcases(useMuseumStore.getState())[showcase.bay]
            if(!bay)return
            const complete=()=>{checkpoint.current=destinationAt(bay.z);useMuseumNavigation.setState({mode:'explore',playing:false,showcase:null});invalidate()}
            const current={amount:0,start:camera.position.clone(),rotation:camera.quaternion.clone(),end:new Vector3(0,1.72,bay.z+1.1),target:new Vector3(bay.side*SHOWCASE_X,1.95,bay.z),complete}
            flight.current=current
            if(reduced){camera.position.copy(current.end);camera.lookAt(current.target);complete();return}
            tween.current=gsap.to(current,{amount:1,duration:Math.max(1.5,current.start.distanceTo(current.end)/4),ease:'power2.inOut',paused:!nav.playing,onUpdate:invalidate,onComplete:invalidate})
            return()=>{tween.current?.kill()}
        }
        // Rejoin at the nearest path point, never teleport from free exploration.
        let nearest = 0, distance = Infinity
        for (let i = 0; i <= 100; i++) {
            route.getPointAt(i / 100, work.position)
            const d = camera.position.distanceToSquared(work.position)
            if (d < distance) {distance = d; nearest = i / 100}
        }
        driver.current.progress = returning.current?returnProgress.current:nearest
        const wasReturning=returning.current;returning.current=false
        if (!wasReturning&&(request.instant || reduced)) {
            driver.current.progress = request.target
            route.getPointAt(request.target, camera.position)
            camera.lookAt(0, 1.6, camera.position.z - 8)
            useMuseumNavigation.getState().report(request.target, destinationAt(camera.position.z))
            useMuseumNavigation.getState().finish(); invalidate(); return
        }
        tween.current = gsap.to(driver.current, {progress: request.target, duration: Math.max(2, Math.abs(request.target - nearest) * 16),
            ease: 'none', paused: !useMuseumNavigation.getState().playing,
            onUpdate: invalidate, onComplete: () => useMuseumNavigation.getState().finish()})
        return () => {tween.current?.kill()}
    }, [mode, request, reduced, camera, gl, invalidate, route, work,intent,visit.phase,visit.epoch,modelStatus,owner,showcase])
    useEffect(()=>{
        if(inspectCommand.reset){const nav=useMuseumNavigation.getState(),distance=useCPUExperience.getState().view==='model'?inspectionFraming(nav.artifactRadius,(camera as PerspectiveCamera).aspect,(camera as PerspectiveCamera).fov).home:7.2;Object.assign(orbit.current,{yaw:.05,pitch:.24,distance})}
        else orbit.current.distance+=inspectCommand.zoom*.6
        invalidate()
    },[inspectCommand,invalidate,camera])
    useEffect(() => {
        if(overlay){keys.current.clear();for(const id of pointers.current.keys())if(gl.domElement.hasPointerCapture(id))gl.domElement.releasePointerCapture(id);pointers.current.clear();look.current.active=false;useMuseumNavigation.getState().setMove(0)}
        if(playing&&!document.hidden&&!overlay)tween.current?.resume();else tween.current?.pause()
    },[playing,overlay,gl])
    useFrame((state, rawDelta) => {
        const dt = Math.min(rawDelta, .05), nav = useMuseumNavigation.getState()
        if(useVisitRuntime.getState().phase!=='ready'||useVisitRuntime.getState().owner!==owner)return
        if (document.hidden||nav.overlay) return
        if(nav.mode==='inspect') {
            const o=orbit.current
            const model=useCPUExperience.getState().view==='model'
            if(model){const framing=inspectionFraming(nav.artifactRadius,(camera as PerspectiveCamera).aspect,(camera as PerspectiveCamera).fov);o.yaw=MathUtils.euclideanModulo(o.yaw+Math.PI,Math.PI*2)-Math.PI;o.pitch=MathUtils.clamp(o.pitch,-1.35,1.35);o.distance=MathUtils.clamp(o.distance,framing.near,framing.far)}
            else{o.yaw=MathUtils.clamp(o.yaw,-.9,.9);o.pitch=MathUtils.clamp(o.pitch,.05,.43);o.distance=MathUtils.clamp(o.distance,5.2,8.8)}
            const focus=useCPUExperience.getState().view==='model'?nav.artifactFocusY:2.25
            work.target.set(0,focus,-27)
            work.position.set(Math.sin(o.yaw)*Math.cos(o.pitch)*o.distance,model?focus+Math.sin(o.pitch)*o.distance:Math.min(5.7,focus+Math.sin(o.pitch)*o.distance),-27+Math.cos(o.yaw)*Math.cos(o.pitch)*o.distance)
            work.matrix.lookAt(work.position,work.target,camera.up);work.quaternion.setFromRotationMatrix(work.matrix)
            if(nav.inspection==='exiting'&&savedPose.current){work.position.copy(savedPose.current.position);work.quaternion.copy(savedPose.current.quaternion)}
            const blend=reduced?1:1-Math.exp(-dt*7)
            camera.position.lerp(work.position,blend);camera.quaternion.slerp(work.quaternion,blend)
            if(!model){const clear=excludeCPUPlatform(camera.position.x,camera.position.z);camera.position.setX(clear.x);camera.position.setZ(clear.z)}
            const shift=screenShift.current,portrait=size.width/size.height<.75,landscape=size.height<540&&size.width>540
            const targetX=nav.inspection==='exiting'?0:landscape?(document.documentElement.dir==='rtl'?-.17:.17):0,targetY=nav.inspection==='exiting'?0:portrait?.17:0
            shift.x=reduced?targetX:MathUtils.damp(shift.x,targetX,7,dt);shift.y=reduced?targetY:MathUtils.damp(shift.y,targetY,7,dt)
            const settled=camera.position.distanceToSquared(work.position)<.0001&&1-Math.abs(camera.quaternion.dot(work.quaternion))<.00001&&Math.abs(shift.x-targetX)+Math.abs(shift.y-targetY)<.0005
            if(settled&&nav.inspection==='entering')nav.inspectionReady()
            if(settled&&nav.inspection==='exiting'){camera.position.copy(work.position);camera.quaternion.copy(work.quaternion);savedPose.current=null;returning.current=true;nav.restoreNavigation()}
            if(camera instanceof PerspectiveCamera){
                if(Math.abs(shift.x)+Math.abs(shift.y)>.0001)camera.setViewOffset(size.width,size.height,size.width*shift.x,size.height*shift.y,size.width,size.height)
                else camera.clearViewOffset()
            }
            gl.domElement.setAttribute('data-inspect-distance',o.distance.toFixed(2))
            gl.domElement.setAttribute('data-orbit-yaw',o.yaw.toFixed(2))
            gl.domElement.setAttribute('data-camera-z',camera.position.z.toFixed(2))
            gl.domElement.setAttribute('data-camera-x',camera.position.x.toFixed(2))
            if(reduced&&(!settled||pointers.current.size))invalidate()
            sample()
            return
        }
        const keyboardOwned = museumKeyboardOwned(document.activeElement)
        if (keyboardOwned) {keys.current.clear(); look.current.active = false; if(nav.move)nav.setMove(0)}
        if (nav.mode === 'guided') {
            const f=flight.current
            if(f){work.position.lerpVectors(f.start,f.end,f.amount);work.target.copy(f.target)}
            else{route.getPointAt(driver.current.progress, work.position);work.target.set(0, 1.6, work.position.z - 8)}
            work.matrix.lookAt(work.position, work.target, camera.up); work.quaternion.setFromRotationMatrix(work.matrix)
            if(f)work.quaternion.copy(f.rotation).slerp(new Quaternion().setFromRotationMatrix(work.matrix),MathUtils.smoothstep(f.amount,.25,1))
            const blend = reduced ? 1 : 1 - Math.exp(-dt * 5)
            const next=moveMuseumPosition(camera.position.x,camera.position.z,(work.position.x-camera.position.x)*blend,(work.position.z-camera.position.z)*blend)
            camera.position.setX(next.x);camera.position.setZ(next.z);camera.quaternion.slerp(work.quaternion, blend)
            const safe=constrainMuseumPosition(camera.position.x,camera.position.z);camera.position.setX(safe.x);camera.position.setZ(safe.z)
            // The tween advances a target; the damped camera must actually arrive before
            // handing ownership back to Free Explore, otherwise flights stop short.
            if(f&&f.amount>=1&&camera.position.distanceTo(f.end)<.02&&camera.quaternion.angleTo(work.quaternion)<.01)f.complete()
        } else {
            const held = keys.current, lookState = look.current
            lookState.yaw += ((held.has('KeyQ') ? 1 : 0) - (held.has('KeyE') ? 1 : 0)) * dt * 1.1
            work.euler.set(lookState.pitch, lookState.yaw, 0, 'YXZ'); work.quaternion.setFromEuler(work.euler)
            camera.quaternion.slerp(work.quaternion, reduced ? 1 : 1 - Math.exp(-dt * 14))
            let forward = Number(held.has('KeyW') || held.has('ArrowUp')) - Number(held.has('KeyS') || held.has('ArrowDown')) + (keyboardOwned ? 0 : nav.move)
            let strafe = Number(held.has('KeyD')) - Number(held.has('KeyA'))
            const length = Math.hypot(forward, strafe)
            if (length > 1) {forward /= length; strafe /= length}
            const yaw = work.euler.setFromQuaternion(camera.quaternion, 'YXZ').y
            const step = dt * 3.2
            const next=moveMuseumPosition(camera.position.x,camera.position.z,
                (-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*step,
                (-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*step)
            camera.position.setX(next.x);camera.position.setZ(next.z)
        }
        camera.position.setY(1.72)
        if (state.clock.elapsedTime - reportAt.current > .15) {
            reportAt.current = state.clock.elapsedTime
            const progress = nav.mode === 'guided'&&!flight.current ? driver.current.progress : MathUtils.clamp((15.5 - camera.position.z) / 37, 0, 1)
            nav.report(progress, destinationAt(camera.position.z))
            if(nav.mode==='guided'&&!nav.playing&&Math.abs(driver.current.progress-nav.request.target)<.001&&camera.position.distanceTo(work.position)<.02)checkpoint.current=destinationAt(camera.position.z)
            gl.domElement.setAttribute('data-camera-z', camera.position.z.toFixed(2))
            gl.domElement.setAttribute('data-camera-x', camera.position.x.toFixed(2))
        }
        // Demand mode still renders intentional navigation; no idle reduced-motion loop.
        if (reduced && (nav.playing || (nav.mode === 'explore' && (keys.current.size > 0 || nav.move !== 0)))) invalidate()
        sample()
    })
    return null
}
