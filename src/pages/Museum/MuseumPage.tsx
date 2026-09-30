import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {GalleryOverlay} from '@/features/gallery/GalleryOverlay';
import {AICuratorPanel} from '@/features/museum/AICuratorPanel';
import {useMuseumStore} from '@/features/museum/museumStore';
import {useMuseumItems} from '@/hooks/useMuseumItems';
import {Button} from '@/components/ui/Button';
import type {Locale} from '@/types/museum';
import i18n from '@/i18n';

export function MuseumPage() {
    const {t} = useTranslation(['common', 'museum']);
    const {section, progress, focusedItemId} = useMuseumStore(); const {items, loading} = useMuseumItems();
    const [gallery, setGallery] = useState(false);
    const [ai, setAi] = useState(false);
    const item = items.find(candidate => candidate.id === focusedItemId || candidate.slug === focusedItemId) ?? items[0];
    const locale = (i18n.language === 'fa' ? 'fa' : 'en') as Locale;
    const isFocused = progress > .52 && Boolean(item);

    return <div className="relative min-h-[1800px]">
        {!loading && !item && <div className="pointer-events-auto fixed inset-x-4 bottom-8 z-30 mx-auto max-w-md border border-border bg-surface p-6 text-center"><span className="eyebrow">CORE / ARCHIVE</span><p className="mt-3 font-display text-xl">{t('archiveEmpty')}</p></div>}
        {isFocused && item && <aside className="museum-panel pointer-events-auto fixed inset-x-4 bottom-4 z-30 mx-auto w-auto max-w-[680px] p-4 md:inset-x-auto md:start-8 md:bottom-8 md:m-0 md:w-[min(52vw,680px)] md:p-6" aria-label={t('itemInfo')}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div><span className="eyebrow">{t('featured')} / {t('gpu', {ns: 'museum'})}</span><h2 className="mt-2 max-w-lg font-display text-2xl uppercase leading-none tracking-[-.03em] text-ink md:text-4xl" dir="auto">{item.title[locale]}</h2></div>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">{item.brand} / {item.releaseYear}</span>
            </div>
            <div className="hud-divider"/>
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div><p className="max-w-xl text-sm leading-6 text-muted" dir="auto">{item.description[locale]}</p><div className="mt-4 grid grid-cols-3 gap-3">{item.specifications.map(spec => <div key={spec.value} className="border-s border-border ps-3"><span className="font-mono text-[8px] uppercase tracking-widest text-muted" dir="auto">{spec.label[locale]}</span><strong className="mt-1 block text-xs text-ink" dir="auto">{spec.value}</strong></div>)}</div></div>
                <div className="flex flex-wrap gap-2 md:max-w-[210px] md:justify-end"><Button variant="outline" disabled={!item.galleryImages.length} onClick={() => setGallery(true)}>{t('viewGallery')}</Button><Button variant="outline" onClick={() => setAi(true)}>{t('askAI')}</Button><button type="button" className="inline-flex items-center gap-1 px-1 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-orange" onClick={() => setAi(true)}>{t('exploreComponent')} <ArrowUpRight size={13} className="rtl:rotate-[-90deg]"/></button></div>
            </div>
        </aside>}
        {gallery && item && <GalleryOverlay images={item.galleryImages} locale={locale} onClose={() => setGallery(false)}/>} 
        {ai && item && <AICuratorPanel item={item} locale={locale} section={section} onClose={() => setAi(false)}/>} 
    </div>
}

