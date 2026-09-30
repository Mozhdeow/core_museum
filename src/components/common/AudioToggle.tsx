import {Volume2, VolumeX} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useAudioStore} from '@/features/audio/audioStore'

export function AudioToggle({compact = false}: { compact?: boolean }) {
    const {t} = useTranslation('common');
    const {enabled, toggle} = useAudioStore();
    return <button type="button" onClick={toggle} className="icon-button"
                   aria-label={enabled ? t('soundOff') : t('soundOn')}
                   title={enabled ? t('soundOff') : t('soundOn')}>{enabled ? <Volume2 size={16}/> :
        <VolumeX size={16}/>}{!compact && <span
        className="hidden font-mono text-[10px] uppercase tracking-[0.16em] md:inline">{enabled ? t('soundOn') : t('soundOff')}</span>}</button>
}
