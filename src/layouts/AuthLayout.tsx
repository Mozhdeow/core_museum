import {Outlet, Link} from 'react-router-dom';
import {Logo} from '@/components/common/Logo';
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher';
import {AudioToggle} from '@/components/common/AudioToggle';
import {MuseumCanvas} from '@/experience/MuseumCanvas';
import {useTranslation} from 'react-i18next';

export function AuthLayout() {
    const {t} = useTranslation('common');
    return <div className="auth-shell relative min-h-dvh overflow-hidden">
        <MuseumCanvas fixed className="opacity-30"/>
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,#050505_18%,transparent_58%,#050505_100%)]"/>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_44%,transparent_8%,#050505aa_70%)]"/>
        <header className="relative z-10 flex items-center justify-between p-5 md:p-8">
            <Logo/>
            <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
                <LanguageSwitcher/>
                <AudioToggle compact/>
                <Link to="/" className="hidden font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-orange sm:inline">CORE / {t('back')}</Link>
            </div>
        </header>
        <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-100px)] w-full max-w-[1380px] items-center gap-10 px-5 pb-12 pt-5 md:grid-cols-[minmax(240px,.7fr)_minmax(360px,480px)] md:px-10 lg:gap-24 lg:px-16">
            <aside className="hidden max-w-sm self-center md:block">
                <p className="eyebrow">{t('archive')} / 001</p>
                <h2 className="mt-5 font-display text-5xl leading-[.95] tracking-[-.06em] text-ink lg:text-7xl">{t('enterArchive')}<br/><span className="text-orange">{t('archiveTitle')}</span></h2>
                <p className="mt-7 max-w-xs text-sm leading-7 text-muted">{t('exploreLine')}</p>
                <div className="mt-12 max-w-xs">
                    <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.16em] text-muted"><span>{t('system')}</span><span className="text-cyan">{t('online')}</span></div>
                    <div className="hud-divider"/>
                    <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[.16em] text-muted"><span>CORE / AUTH</span><span>2026.01</span></div>
                </div>
            </aside>
            <section className="w-full max-w-xl justify-self-center md:justify-self-end"><Outlet/></section>
        </main>
    </div>
}
