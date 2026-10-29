import {useTranslation} from 'react-i18next'
import {useMuseumQuality,type QualityChoice,type Brightness} from './useMuseumQuality'
export function MuseumPreferences(){
 const {t}=useTranslation('museum'),choice=useMuseumQuality(s=>s.choice),brightness=useMuseumQuality(s=>s.brightness)
 return <div className="museum-preferences">
  <label>{t('display.quality')}<select aria-label={t('display.quality')} value={choice} onChange={e=>useMuseumQuality.getState().setChoice(e.target.value as QualityChoice)}>{(['auto','high','medium','low'] as const).map(value=><option key={value} value={value}>{t(`display.${value}`)}</option>)}</select></label>
  <label>{t('display.brightness')}<select aria-label={t('display.brightness')} value={brightness} onChange={e=>useMuseumQuality.getState().setBrightness(e.target.value as Brightness)}>{(['dim','standard','bright'] as const).map(value=><option key={value} value={value}>{t(`display.${value}`)}</option>)}</select></label>
 </div>
}
