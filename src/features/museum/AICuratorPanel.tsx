import {useEffect, useState} from 'react';
import {Bot, Send, Sparkles, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {curatorService} from '@/lib/services';
import {EXPLANATION_MODES, type ExplanationMode} from '@/types/services';
import type {Locale, MuseumItem, SectionId} from '@/types/museum';

export function AICuratorPanel({item, locale, section, onClose}: {
    item: MuseumItem;
    locale: Locale;
    section: SectionId;
    onClose: () => void
}) {
    const {t} = useTranslation(['common', 'museum']);
    const [mode, setMode] = useState<ExplanationMode>('simple');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const ask = async () => {
        const response = await curatorService.ask({currentItemId: item.id, currentSection: section, locale, question, explanationMode: mode});
        setAnswer(response.answer)
    };

    return <aside className="museum-panel fixed inset-x-4 top-20 z-40 mx-auto max-h-[calc(100dvh-6rem)] w-auto max-w-[390px] overflow-y-auto p-4 md:inset-x-auto md:end-8 md:top-auto md:bottom-8 md:m-0 md:w-[340px] md:p-5" role="dialog" aria-modal="false" aria-label={t('askAI')} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
        <div className="mb-4 flex items-start justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-orange"><Bot size={15}/><span className="font-mono text-[9px] uppercase tracking-[.16em]">CORE AI / CURATOR</span></div><h3 className="font-display text-lg text-ink">{t('askAI')}</h3></div>
            <button type="button" onClick={onClose} className="icon-button shrink-0" aria-label={t('close')}><X size={15}/></button>
        </div>
        <p className="mb-4 text-xs leading-5 text-muted" dir="auto">{item.title[locale]} · {t('curatorHint', {ns: 'museum'})}</p>
        <div className="mb-4 grid grid-cols-3 gap-1">{EXPLANATION_MODES.map(option => <button type="button" key={option} onClick={() => setMode(option)} className={`border px-1 py-2 font-mono text-[9px] uppercase tracking-widest transition-colors ${mode === option ? 'border-orange bg-orange/10 text-orange' : 'border-border text-muted hover:border-muted'}`}>{t(`levels.${option}`, {ns: 'museum'})}</button>)}</div>
        <div className="flex gap-2"><input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void ask() }} placeholder={t('askPlaceholder', {ns: 'museum'})} className="field-input min-w-0" dir="auto"/><button type="button" onClick={() => void ask()} className="button button-primary shrink-0 px-3" aria-label={t('askAI')}><Send size={14} className="rtl:rotate-180"/></button></div>
        {answer && <div className="mt-4 border-s-2 border-orange ps-3 text-xs leading-6 text-muted" dir="auto">{answer}</div>}
        <div className="mt-4 flex items-start gap-2 font-mono text-[8px] leading-4 text-muted"><Sparkles size={11} className="mt-0.5 shrink-0 text-orange"/>{t('curatorMock', {ns: 'museum'})}</div>
    </aside>
}
