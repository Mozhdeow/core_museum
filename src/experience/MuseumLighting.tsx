import {Environment,Lightformer} from '@react-three/drei'
import {useMuseumQuality} from './useMuseumQuality'
import {museumQuality} from './museumQuality'
/** No local light objects: MuseumMood owns the same two fill lights in every tier/hall. */
export function MuseumLighting(){
 const tier=useMuseumQuality(s=>s.tier),revision=useMuseumQuality(s=>s.contextRevision)
 return <Environment key={`${tier}:${revision}`} frames={1} resolution={museumQuality[tier].environment} environmentIntensity={1} background={false}>
   <color attach="background" args={['#25262a']}/>
   <Lightformer color="#f3e6cf" intensity={2} position={[-4,5,3]} scale={[3,7,1]} target={[0,0,0]}/>
   <Lightformer color="#e5c99c" intensity={1} position={[4,3,-2]} scale={[2,6,1]} target={[0,0,0]}/>
   <Lightformer color="#e1e4e6" intensity={2} position={[0,6,-2]} scale={[7,3,1]} target={[0,0,0]}/>
  </Environment>
}
