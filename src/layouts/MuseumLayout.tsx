import {Outlet} from 'react-router-dom';
import {Home} from 'lucide-react';
import {MuseumCanvas} from '@/experience/MuseumCanvas';
import {Logo} from '@/components/common/Logo';
import {AudioToggle} from '@/components/common/AudioToggle';
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher';
import {useMuseumStore} from '@/features/museum/museumStore';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import {SECTION_IDS} from '@/types/museum'

export function MuseumLayout() {
    const {t} = useTranslation(['common', 'museum']);
    const {progress, section} = useMuseumStore();
    const index = Math.min(SECTION_IDS.indexOf(section as typeof SECTION_IDS[number]) + 1, 6);
    return <div className="relative min-h-[1800px] bg-void"><MuseumCanvas fixed/>
        <div
            className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,#050505aa_100%)]"/>
        <header className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-start justify-between p-5 md:p-8">
            <Logo to="/museum" compact/>
            <div className="flex items-center gap-2"><LanguageSwitcher/><AudioToggle compact/><Link to="/"
                                                                                                    className="icon-button font-mono text-[10px] uppercase tracking-widest"
                                                                                                    aria-label={t('exit')}><Home size={15}/><span
                className="hidden md:inline">{t('exit')}</span></Link></div>
        </header>
        <div
            className="pointer-events-none fixed inset-x-0 top-1/2 z-20 mx-5 flex -translate-y-1/2 items-center justify-between md:mx-8">
            <div className="pointer-events-auto"><span className="eyebrow">{t('section')}</span><h1
                className="mt-2 font-display text-3xl uppercase tracking-wide text-ink md:text-5xl"
                dir="auto">{t(section, {ns: 'museum'})}</h1></div>
            <div className="pointer-events-auto text-end"><span
                className="font-mono text-[10px] tracking-widest text-muted">{String(index).padStart(2, '0')} / 06</span>
                <div className="mt-3 h-px w-28 bg-border md:w-40">
                    <div className="h-px bg-orange transition-all duration-500"
                         style={{width: `${Math.max(progress * 100, 5)}%`}}/>
                </div>
                <span
                    className="mt-2 block font-mono text-[9px] uppercase tracking-widest text-muted">{t('progress')}</span>
            </div>
        </div>
        <div className="relative z-20"><Outlet/></div>
    </div>
}
