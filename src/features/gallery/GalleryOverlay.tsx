import {useCallback, useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import type {GalleryImage, Locale} from '@/types/museum';

export function GalleryOverlay({images, locale, onClose}: { images: GalleryImage[]; locale: Locale; onClose: () => void }) {
    const {t} = useTranslation('common');
    const [index, setIndex] = useState(0);
    const image = images[index];
    const go = useCallback((direction: number) => setIndex(current => (current + direction + images.length) % images.length), [images.length]);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowLeft') go(-1); if (event.key === 'ArrowRight') go(1) };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [go, onClose]);
    if (!image) return null;
    return <div className="fixed inset-0 z-50 flex flex-col bg-void/95 p-4 backdrop-blur-xl md:p-8" role="dialog" aria-modal="true" aria-label={t('gallery')} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-border pb-4"><div><span className="eyebrow">CORE / {t('gallery')}</span><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted">{t('archive')}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}><X size={17}/><span className="hidden font-mono text-[9px] uppercase tracking-widest md:inline">{t('close')}</span></button></header>
        <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center py-6"><div className="w-full"><div className="relative overflow-hidden border border-border bg-surface shadow-2xl shadow-black/60"><img className="aspect-[16/9] max-h-[68dvh] w-full object-cover" src={image.url} alt={image.caption[locale]} /><button type="button" className="icon-button absolute start-3 top-1/2 -translate-y-1/2 bg-void/80 md:start-5" onClick={() => go(-1)} aria-label={t('previous')}><ArrowLeft className="rtl:rotate-180" size={17}/></button><button type="button" className="icon-button absolute end-3 top-1/2 -translate-y-1/2 bg-void/80 md:end-5" onClick={() => go(1)} aria-label={t('next')}><ArrowRight className="rtl:rotate-180" size={17}/></button></div><div className="flex items-start justify-between gap-5 border-x border-b border-border bg-surface px-4 py-3"><p className="max-w-2xl text-xs leading-5 text-muted" dir="auto">{image.caption[locale]}</p><span className="shrink-0 font-mono text-xs tabular-nums text-orange">{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span></div></div></main>
        <footer className="mx-auto flex w-full max-w-6xl justify-between font-mono text-[9px] uppercase tracking-[.16em] text-muted"><span>← / → {t('navigate')}</span><span>{t('museumGallery')}</span></footer>
    </div>
}
