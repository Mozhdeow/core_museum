import {useTranslation} from 'react-i18next'
import {Sign} from './MuseumPrimitives'
import {CoreEngine} from './CoreIdentity'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {useReducedMotion} from '@/hooks/usePreferences'

/** Branded placeholder only; never represents the selected exhibit's geometry. */
export function CorePreview({loading=false}:{loading?:boolean}) {
 const {t}=useTranslation('museum')
 const reduced=useReducedMotion(),paused=useMuseumNavigation(s=>s.atmospherePaused||s.mode==='inspect'||Boolean(s.overlay)||(s.mode==='guided'&&!s.playing&&s.progress>0&&s.progress<.99))
 const interactive=useMuseumNavigation(s=>s.location==='cpu'&&s.mode!=='inspect'&&!s.overlay&&!s.playing)
 return <group name="missing-model-marker" position={[0,2.25,0]}>
  <group scale={.4} rotation={[.2,.35,0]}>
   <CoreEngine active={!paused} reduced={reduced} interactive={interactive} scoped/>
  </group>
  <Sign at={[0,-.68,1.2]} width={2.2} title="CORE" subtitle={t(loading?'coreLoading':'corePlaceholder')} center/>
 </group>
}
