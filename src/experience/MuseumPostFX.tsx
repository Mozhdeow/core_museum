import {useEffect, useMemo} from 'react'
import {useFrame, useThree} from '@react-three/fiber'
import {HalfFloatType, Vector2, WebGLRenderTarget} from 'three'
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js'
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js'
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js'

/** Loaded only for the high museum tier. HDR threshold excludes ordinary prints and portraits. */
export default function MuseumPostFX() {
    const {gl, scene, camera, size} = useThree()
    const fx = useMemo(() => {
        const target = new WebGLRenderTarget(1, 1, {type: HalfFloatType, depthBuffer: true,samples:0})
        const composer = new EffectComposer(gl, target), bloom = new ShaderPass({uniforms:{tDiffuse:{value:null},texel:{value:new Vector2(1,1)}},
            vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
            fragmentShader:'uniform sampler2D tDiffuse;uniform vec2 texel;varying vec2 vUv;vec3 glow(vec2 p){vec3 c=texture2D(tDiffuse,p).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-1.7)/(max(c.r,max(c.g,c.b))+.001);}void main(){vec4 base=texture2D(tDiffuse,vUv);vec3 halo=glow(vUv+texel*vec2(3.,0.))+glow(vUv-texel*vec2(3.,0.))+glow(vUv+texel*vec2(0.,3.))+glow(vUv-texel*vec2(0.,3.));gl_FragColor=vec4(base.rgb+halo*.035,base.a);}'})
        const render = new RenderPass(scene, camera), output = new OutputPass()
        composer.addPass(render); composer.addPass(bloom); composer.addPass(output)
        return {composer, bloom, render, output}
    }, [gl, scene, camera])
    useEffect(() => {fx.composer.setPixelRatio(Math.min(gl.getPixelRatio(),1)*.85); fx.composer.setSize(size.width, size.height);fx.bloom.uniforms.texel.value.set(1/(size.width*.85),1/(size.height*.85))}, [fx, gl, size])
    useEffect(() => () => {fx.bloom.dispose(); fx.render.dispose(); fx.output.dispose(); fx.composer.dispose()}, [fx])
    useFrame((_, dt) => fx.composer.render(dt), 1)
    return null
}
