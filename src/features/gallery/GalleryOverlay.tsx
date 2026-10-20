import {useCallback,useState} from 'react'
import {ArrowLeft,ArrowRight,X} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import type {GalleryImage,Locale} from '@/types/museum'
import {MuseumOverlay} from '@/features/museum/MuseumOverlay'
function GalleryMedia({image,locale}: {image:GalleryImage;locale:Locale}){
 const {t}=useTranslation('museum'),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading')
 return <><img src={image.url} alt={image.caption[locale]} onLoad={()=>setStatus('ready')} onError={()=>setStatus('error')} style={{visibility:status==='ready'?'visible':'hidden'}}/>
  {status!=='ready'&&<p className="museum-gallery-status" role="status">{t(status==='error'?'galleryImageError':'galleryImageLoading')}</p>}</>
}
export function GalleryOverlay({images,locale,onClose}: {images:GalleryImage[];locale:Locale;onClose():void}){
 const {t}=useTranslation('common'),[index,setIndex]=useState(0)
 const go=useCallback((direction:-1|1)=>setIndex(i=>(i+direction+images.length)%images.length),[images.length])
 const image=images[index];if(!image)return null
 return <MuseumOverlay label={t('gallery')} kind="gallery" onClose={onClose} onArrow={images.length>1?go:undefined}>
  <header className="museum-dialog-header"><div><span className="eyebrow">CORE / {t('gallery')}</span><h2>{t('archive')}</h2></div><button data-close aria-label={t('close')} onClick={onClose}><X size={20}/></button></header>
  <div className="museum-gallery-stage" dir={locale==='fa'?'rtl':'ltr'}>
   <GalleryMedia key={image.id} image={image} locale={locale}/>
   {images.length>1&&<><button aria-label={t('previous')} onClick={()=>go(-1)}><ArrowLeft className="rtl:rotate-180" size={20}/></button><button aria-label={t('next')} onClick={()=>go(1)}><ArrowRight className="rtl:rotate-180" size={20}/></button></>}
  </div>
  <div className="museum-gallery-caption" dir={locale==='fa'?'rtl':'ltr'}><p dir="auto">{image.caption[locale]}</p><span>{index+1} / {images.length}</span></div>
 </MuseumOverlay>
}
