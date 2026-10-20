import {useEffect, useRef} from 'react'
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {Environment, Lightformer} from '@react-three/drei'
import {Vector2} from 'three'
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js'
import {CoreEngine} from '@/experience/CoreIdentity'
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js'
import {useMediaQuery, useReducedMotion} from '@/hooks/usePreferences'

function Finish() {
    const {gl, scene, camera, size, invalidate} = useThree()
    const composer = useRef<EffectComposer | null>(null)
    useEffect(() => {
        const effect = new EffectComposer(gl), render = new RenderPass(scene, camera)
        const bloom = new UnrealBloomPass(new Vector2(1, 1), .20, .4, 1.15), output = new OutputPass()
        effect.addPass(render);
        effect.addPass(bloom);
        effect.addPass(output)
        composer.current = effect;
        invalidate()
        return () => {
            composer.current = null;
            render.dispose();
            bloom.dispose();
            output.dispose();
            effect.dispose()
        }
    }, [gl, scene, camera, invalidate])
    useEffect(() => {
        composer.current?.setSize(size.width, size.height);
        invalidate()
    }, [size.width, size.height, invalidate])
    useFrame((_, delta) => composer.current?.render(delta), 1)
    return null
}

export function HeroMonitorCanvas({active = true, portal = false}: { active?: boolean; portal?: boolean }) {
    const reduced = useReducedMotion(), mobile = useMediaQuery('(max-width: 900px)')
    return <Canvas className="hero-monitor-canvas" frameloop={active && !reduced ? 'always' : 'demand'}
                   resize={{scroll: false, offsetSize: true}} dpr={[1, mobile ? 1.25 : 1.5]} shadows
                   camera={{position: [6.5, 4.9, 7.7], fov: mobile ? 39 : 35}}
                   onCreated={({camera}) => camera.lookAt(0, .25, 0)} gl={{antialias: true, alpha: false}}
                   fallback={<div className="hero-monitor-canvas__fallback" aria-hidden="true"/>}>
        <color attach="background" args={['#050506']}/>
        <ambientLight intensity={.3}/>
        <hemisphereLight args={['#e2e7f0', '#17110b', .55]}/>
        <directionalLight position={[2, 6, 4]} intensity={3} color="#fff0dd" castShadow
                          shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]} shadow-bias={-.001}/>
        <Environment resolution={128} frames={1}>
            <Lightformer intensity={5} color="#f2f4ff" position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]}
                         scale={[5, 3, 1]}/>
            <Lightformer intensity={4} color="#e2e7f0" position={[3, 1, 3]} rotation={[0, -Math.PI / 4, 0]}
                         scale={[2, 6, 1]}/>
            <Lightformer intensity={3} color="#ffb455" position={[-4, 1, -1]} rotation={[0, Math.PI / 2, 0]}
                         scale={[2, 5, 1]}/>
        </Environment>
        <group scale={portal ? 1.08 : 1}><CoreEngine active={active} reduced={reduced} interactive={active && !mobile}/>
        </group>
        <Finish/>
    </Canvas>
}

