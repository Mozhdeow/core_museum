import {useCallback,useRef,type KeyboardEvent} from 'react'
import {ArrowLeft,ArrowRight,ArrowUpRight,ChevronDown,ChevronUp,RotateCcw,X} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import type {GalleryImage, Locale} from '@/types/museum'
import {MuseumOverlay} from '@/features/museum/MuseumOverlay'
import {useElevatorGallery} from './useElevatorGallery'
import './elevatorGallery.css'

type Props={itemId:string;title:string;images:GalleryImage[];locale:Locale;onClose():void}

export function GalleryOverlay(props:Props){
    const revision=JSON.stringify(props.images.map(image=>[image.id,image.url]))
    return <ElevatorGallery key={`${props.itemId}:${revision}`} {...props}/>
}

function ElevatorGallery({itemId,title,images,locale,onClose}:Props){
    const {t}=useTranslation(['museum','common']),root=useRef<HTMLDivElement>(null)
    const state=useElevatorGallery(root,images),image=images[state.index]
    const {select,zoom,requested}=state
    const expanded=['entering','inside','returning'].includes(state.phase)
    const number=(i:number)=>String(i+1).padStart(2,'0')
    const imageLabel=(i:number)=>t('elevator.image',{number:number(i)})
    const escape=useCallback(()=>{if(expanded)zoom(false);else onClose()},[expanded,zoom,onClose])
    const go=useCallback((direction:-1|1)=>{
        if(!expanded)select((requested+direction+images.length)%images.length)
    },[expanded,select,requested,images.length])
    const keys=(event:KeyboardEvent<HTMLDivElement>)=>{
        if(event.altKey||event.ctrlKey||event.metaKey)return
        const directions:Record<string,number>={ArrowDown:1,ArrowUp:-1,ArrowLeft:-1,ArrowRight:1}
        let index:number|undefined
        if(event.key==='Home')index=0
        else if(event.key==='End')index=images.length-1
        else if(event.key in directions)index=(state.requested+directions[event.key]+images.length)%images.length
        if(index===undefined)return
        event.preventDefault();event.stopPropagation();state.select(index)
        event.currentTarget.querySelectorAll<HTMLButtonElement>('.elevator-number')[index]?.focus()
    }
    if(!image)return null
    const caption=image.caption[locale],open=state.phase==='open'||state.phase==='inside'
    const phaseText=t(state.media==='error'?'galleryImageError':state.phase==='preparing'?'galleryImageLoading':
        state.phase==='travelling'||state.phase==='closing'?'elevator.travelling':'elevator.ready')
    return <MuseumOverlay label={t('gallery',{ns:'common'})} kind="gallery" onClose={onClose} onEscape={escape} onArrow={images.length>1?go:undefined}>
        <div ref={root} className="core-elevator" dir={locale==='fa'?'rtl':'ltr'} data-gallery-item={itemId}
            data-phase={state.phase} data-current-id={image.id} data-media-state={state.media} data-expanded={expanded}>
            <header className="museum-dialog-header elevator-header">
                <div><span className="eyebrow">CORE / {t('elevator.archive')}</span><h2 dir="auto">{title}</h2></div>
                <div className="elevator-header-actions">
                    <button data-gallery-return hidden={!expanded} onClick={()=>state.zoom(false)}><ArrowLeft size={16}/><span>{t('elevator.return')}</span></button>
                    <button data-close aria-label={t('close',{ns:'common'})} onClick={onClose}><X size={20}/></button>
                </div>
            </header>
            <div className="elevator-space">
                <div className="elevator-architecture" inert={expanded} aria-hidden={expanded}>
                    <div className="elevator-bay">
                        <div className="elevator-top-display" aria-hidden="true">
                            <span>CORE <span className="elevator-display-rule">/</span> {t('elevator.archive')}</span>
                            <strong dir="ltr">{number(state.requested)} <ChevronUp size={12}/><ChevronDown size={12}/></strong>
                            <div className="elevator-travel-track"><span className="elevator-travel-line"/></div>
                        </div>
                        <div className="elevator-portal"><div className="elevator-aperture">
                            {state.media!=='ready'&&<div className="elevator-media-status" role="status">
                                <p>{t(state.media==='error'?'galleryImageError':'galleryImageLoading')}</p>
                                {state.media==='error'&&<button onClick={()=>state.select(state.index,true)}><RotateCcw size={15}/>{t('elevator.retry')}</button>}
                            </div>}
                            <div className="elevator-door elevator-door-left" aria-hidden="true"><span>CORE</span><small>ARCHIVE ACCESS</small></div>
                            <div className="elevator-door elevator-door-right" aria-hidden="true"><span>{number(state.requested)}</span><small>VISUAL COLLECTION</small></div>
                        </div></div>
                        <div className="elevator-threshold" aria-hidden="true"><i/><span>CORE — THE CONNECTED ARCHIVE</span><i/></div>
                    </div>
                    <aside className="elevator-index" aria-label={t('elevator.selection')}>
                        <div className="elevator-index-heading"><span>{t('elevator.index')}</span><strong>{t('elevator.select')}</strong></div>
                        <div className="elevator-numbers" onKeyDown={keys}>
                            {images.map((entry,i)=><button className="elevator-number" key={entry.id} aria-label={imageLabel(i)}
                                aria-pressed={state.requested===i} tabIndex={state.requested===i?0:-1} onClick={()=>state.select(i)}>
                                <span dir="ltr">{number(i)}</span><i aria-hidden="true"/>
                            </button>)}
                        </div>
                        {images.length>1&&<div className="elevator-page-controls">
                            <button aria-label={t('previous',{ns:'common'})} onClick={()=>go(-1)}><ArrowLeft size={16}/></button>
                            <span dir="ltr">{number(state.requested)} / {String(images.length).padStart(2,'0')}</span>
                            <button aria-label={t('next',{ns:'common'})} onClick={()=>go(1)}><ArrowRight size={16}/></button>
                        </div>}
                        <p className="elevator-invitation">{t('elevator.hint')}</p>
                        <div className="elevator-index-engraving" aria-hidden="true">C / E — 01<br/>CORE MUSEUM</div>
                    </aside>
                </div>
                <button className="elevator-media" aria-label={t('elevator.stepInside')} onClick={()=>state.zoom(true)}
                    disabled={state.phase!=='open'||state.media!=='ready'} data-gallery-image-button>
                    <img data-gallery-image alt={caption||title||imageLabel(state.index)} draggable={false}/>
                    <span className="elevator-step-hint" aria-hidden="true">{t('elevator.stepInside')}<ArrowUpRight size={16}/></span>
                </button>
            </div>
            <footer className="elevator-footer">
                <div className="elevator-caption">{caption&&<p dir="auto">{caption}</p>}</div>
                <div className="elevator-readout"><span dir="ltr">{number(state.index)} / {String(images.length).padStart(2,'0')}</span>
                    <span role="status" aria-live="polite">{open?t('elevator.selected',{number:number(state.index),count:images.length}):phaseText}</span></div>
            </footer>
        </div>
    </MuseumOverlay>
}
