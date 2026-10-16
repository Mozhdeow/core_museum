import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useGLTF} from '@react-three/drei'
import {GalleryOverlay} from '@/features/gallery/GalleryOverlay'
import {AICuratorPanel} from '@/features/museum/AICuratorPanel'
import {useMuseumStore} from '@/features/museum/museumStore'
import {selectedMuseumItem} from '@/features/museum/museumState'
import {Button} from '@/components/ui/Button'
import {useAuthStore} from '@/features/auth/authStore'

export function MuseumPage() {
    const selectedId = useMuseumStore(s => s.focusedItemId)
    return <MuseumContent key={selectedId ?? 'collection'}/>
}

function MuseumContent() {
    const {t, i18n} = useTranslation(['common', 'museum'])
    const items = useMuseumStore(s => s.items)
    const focusedItemId = useMuseumStore(s => s.focusedItemId)
    const sectionId = useMuseumStore(s => s.section)
    const sections = useMuseumStore(s => s.sections)
    const status = useMuseumStore(s => s.status)
    const modelStatus = useMuseumStore(s => s.modelStatus)
    const userId = useAuthStore(s => s.user?.id)
    const [galleryFor, setGalleryFor] = useState<string | null>(null)
    const [aiFor, setAiFor] = useState<string | null>(null)
    const item = selectedMuseumItem({items, focusedItemId})
    const locale = i18n.language === 'fa' ? 'fa' : 'en'
    const section = sections.find(s => s.id === sectionId)
    const refresh = () => {if (userId) void useMuseumStore.getState().load(userId, true)}
    const retryModel = () => {
        if (item?.model3DUrl) useGLTF.clear(item.model3DUrl)
        useMuseumStore.getState().retryModel()
    }
    return <div className="relative min-h-[1800px]">
        {!item && <div className="pointer-events-auto fixed inset-x-4 bottom-8 z-30 mx-auto max-w-md border border-border bg-surface p-6 text-center" role={status === 'error' ? 'alert' : 'status'}>
            <span className="eyebrow">CORE / ARCHIVE</span>
            <p className="mt-3 font-display text-xl">{t(status === 'error' ? 'dataError' : status === 'loading' || status === 'idle' ? 'loadingCollection' : items.length ? 'emptySection' : 'emptyCollection', {ns:'museum'})}</p>
            {section?.description?.[locale] && <p className="mt-3 text-sm text-muted">{section.description[locale]}</p>}
            {(status === 'error' || status === 'ready') && <Button variant="outline" className="mt-4" onClick={refresh}>{t('retry', {ns:'museum'})}</Button>}
        </div>}
        {item && <aside className="museum-panel pointer-events-auto fixed inset-x-4 bottom-4 z-30 mx-auto w-auto max-w-[680px] max-h-[55dvh] overflow-y-auto p-4 md:inset-x-auto md:start-8 md:bottom-8 md:m-0 md:w-[min(52vw,680px)] md:p-6" aria-label={t('itemInfo')} data-exhibit-id={item.id}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div><span className="eyebrow">{item.categoryName?.[locale] || t('uncategorized', {ns:'museum'})}{item.featured ? ` / ${t('featured')}` : ''}</span><h2 className="mt-2 max-w-lg font-display text-2xl uppercase leading-none tracking-[-.03em] text-ink md:text-4xl" dir="auto">{item.title[locale]}</h2></div>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">{[item.brand, item.releaseYear || null].filter(Boolean).join(' / ')}</span>
            </div>
            <div className="hud-divider"/>
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div><p className="max-w-xl text-sm leading-6 text-muted" dir="auto">{item.description[locale] || item.shortDescription[locale]}</p>
                    <p className="mt-2 text-xs text-muted">{item.sectionTitle?.[locale] || t('unassigned', {ns:'museum'})}</p>
                    <div className="mt-4 grid grid-cols-3 gap-3">{item.specifications.map((spec,index) => <div key={index} className="border-s border-border ps-3"><span className="font-mono text-[8px] uppercase tracking-widest text-muted" dir="auto">{spec.label[locale]}</span><strong className="mt-1 block text-xs text-ink" dir="auto">{spec.value}</strong></div>)}</div>
                    {item.thumbnail && <img src={item.thumbnail} alt={item.title[locale]} className="mt-3 h-12 w-16 object-cover"/>}
                    {item.attributionRequired && item.attributionText && <p className="mt-3 text-xs text-muted">{item.attributionText}</p>}
                    {item.creator && <p className="mt-2 text-xs text-muted">{item.creator}{item.license ? ` / ${item.license}` : ''}</p>}
                </div>
                <div className="flex flex-wrap gap-2 md:max-w-[210px] md:justify-end">
                    <Button variant="outline" disabled={item.enableGallery === false || !item.galleryImages.length} onClick={() => setGalleryFor(item.id)}>{t('viewGallery')}</Button>
                    {item.enableAiCurator !== false && <Button variant="outline" onClick={() => setAiFor(item.id)}>{t('askAI')}</Button>}
                    <Button variant="outline" onClick={refresh}>{t('retry', {ns:'museum'})}</Button>
                </div>
            </div>
            <p className="mt-3 text-xs text-muted" role="status">{t(`model.${modelStatus}`, {ns:'museum'})}</p>
            {modelStatus === 'error' && <Button variant="outline" className="mt-2" onClick={retryModel}>{t('retryModel', {ns:'museum'})}</Button>}
        </aside>}
        {item && galleryFor === item.id && item.enableGallery !== false && <GalleryOverlay key={item.id} images={item.galleryImages} locale={locale} onClose={() => setGalleryFor(null)}/>}
        {item && aiFor === item.id && item.enableAiCurator !== false && <AICuratorPanel key={item.id} item={item} locale={locale} section={sectionId ?? ''} onClose={() => setAiFor(null)}/>}
    </div>
}
