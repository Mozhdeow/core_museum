import {useEffect} from 'react'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {museumPresentation} from '@/features/museum/exhibitPresentation'
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
    const categoryFilter=useMuseumStore(s=>s.categoryFilter)
    const userId = useAuthStore(s => s.user?.id)
    const catalogOwner=useMuseumStore(s=>s.owner)
    const location=useMuseumNavigation(s=>s.location)
    const overlay = useMuseumNavigation(s => s.overlay)
    const closeOverlay = useMuseumNavigation(s => s.closeOverlay)
    useEffect(() => () => useMuseumNavigation.getState().closeOverlay(), [])
    const item = catalogOwner===userId?selectedMuseumItem({items, focusedItemId}):undefined
    const categories=useMuseumStore(s=>s.categories),selectionUnavailable=useMuseumStore(s=>s.selectionUnavailable)
    const presentation=museumPresentation({items,sections,categories,focusedItemId:item?.id??null,modelStatus},location),cpuItem=presentation.cpuCompatible
    const locale = i18n.language === 'fa' ? 'fa' : 'en'
    const section = sections.find(s => s.id === sectionId)
    const refresh = () => {
        if (userId) void useMuseumStore.getState().load(userId, true)
    }
    const retryModel = () => {
        if (item?.model3DUrl) useGLTF.clear(item.model3DUrl)
        useMuseumStore.getState().retryModel()
    }
    return <div className="relative h-full">
        {!item && !(status==='ready'&&categoryFilter&&!selectionUnavailable) && <details className="museum-empty-card pointer-events-auto"
                           open={status === 'error' || status === 'loading' || status === 'idle'}
                           role={status === 'error' ? 'alert' : 'status'}>
            <summary><span className="eyebrow">CORE / ARCHIVE</span>
                <span
                    className="museum-preview-label">{t(status === 'ready' ? selectionUnavailable?'selectionUnavailableLabel':categoryFilter?'emptyResults':'previewLabel' : status === 'error' ? 'dataError' : 'loadingCollection', {ns: 'museum'})}</span>
            </summary>
            <div className="museum-empty-body">
                <p>{t(status === 'error' ? 'dataError' : status === 'loading' || status === 'idle' ? 'loadingCollection' : selectionUnavailable?'selectionUnavailable':categoryFilter?'emptyResults':section?'emptySection':items.length?'selectExhibit':'emptyCollection', {ns: 'museum'})}</p>
                {status === 'ready' && <p>{t('previewNotice', {ns: 'museum'})}</p>}
                {section?.description?.[locale] &&
                    <p className="mt-3 text-sm text-muted">{section.description[locale]}</p>
                }
                {(status === 'error' || status === 'ready') &&
                    <Button variant="outline" className="mt-4" onClick={refresh}>{t('retry', {ns: 'museum'})}</Button>
                }
            </div>
        </details>}
        {item && <details className="museum-exhibit-card pointer-events-auto" aria-label={t('itemInfo')}
                          data-exhibit-id={item.id}>
            <summary aria-label={t('exhibitDetails', {ns: 'museum'})}>
                <div>
                    <span className="eyebrow">
                        {item.categoryName?.[locale] || t('uncategorized', {ns: 'museum'})}{item.featured ? ` / ${t('featured')}` : ''}</span>
                    <h2 dir="auto">{item.title[locale]}</h2>
                    {!cpuItem && <span className="museum-association-badge">{t('exhibition', {ns: 'museum'})}</span>}
                </div>
            </summary>
            <div className="museum-exhibit-body">
                {!cpuItem && <p className="museum-exhibit-notice" role="status">{t('genericExhibition', {ns: 'museum'})}</p>}
                <span
                    className="font-mono text-[9px] text-muted">{[item.brand, item.releaseYear || null].filter(Boolean).join(' / ')}</span>
                <div className="hud-divider"/>
                <div className="mt-4 grid gap-4">
                    <div>
                        <p className="max-w-xl text-sm leading-6 text-muted"
                           dir="auto">{item.description[locale] || item.shortDescription[locale]}</p>
                        <p className="mt-2 text-xs text-muted">{item.sectionTitle?.[locale] || t('unassigned', {ns: 'museum'})}</p>
                        <div
                            className="mt-4 grid grid-cols-2 gap-3 wrap-anywhere">{item.specifications.map((spec, index) =>
                            <div key={index} className="border-s border-border ps-3"><span
                                className="font-mono text-[8px] uppercase tracking-widest text-muted"
                                dir="auto">{spec.label[locale]}</span><strong className="mt-1 block text-xs text-ink"
                                                                              dir="auto">{spec.value}</strong>
                            </div>)}</div>
                        {item.thumbnail && <img src={item.thumbnail} alt={item.title[locale]}
                                                className="mt-3 h-12 w-16 object-cover"/>}
                        {item.attributionRequired && item.attributionText &&
                            <p className="mt-3 text-xs text-muted">{item.attributionText}</p>}
                        {item.creator &&
                            <p className="mt-2 text-xs text-muted">{item.creator}{item.license ? ` / ${item.license}` : ''}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" disabled={!presentation.canGallery}
                                onClick={() => useMuseumNavigation.getState().openOverlay('gallery')}>{t('viewGallery')}</Button>
                        {presentation.canCurator &&
                            <Button variant="outline"
                                    onClick={() => useMuseumNavigation.getState().openOverlay('ai')}>{t('askAI')}</Button>}
                        <Button variant="outline" onClick={refresh}>{t('retry', {ns: 'museum'})}</Button>
                    </div>
                </div>
                {<p className="mt-3 text-xs text-muted"
                               role="status">{t(`model.${modelStatus}`, {ns: 'museum'})}</p>}
                {(item.enableGallery === false || !item.galleryImages.length) &&
                    <p className="mt-2 text-xs text-muted">{t(item.enableGallery === false ? 'galleryDisabled' : 'galleryEmpty', {ns: 'museum'})}</p>}
                {modelStatus === 'error' && <Button variant="outline" className="mt-2"
                                                               onClick={retryModel}>{t('retryModel', {ns: 'museum'})}</Button>}
            </div>
        </details>}
        {item && overlay === 'gallery' && presentation.canGallery &&
            <GalleryOverlay key={item.id} images={item.galleryImages} locale={locale}
                            onClose={closeOverlay}/>}
        {item && overlay === 'ai' && presentation.canCurator &&
            <AICuratorPanel key={item.id} item={item} locale={locale} section={sectionId ?? ''}
                            onClose={closeOverlay}/>}
    </div>
}
