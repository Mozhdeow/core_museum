import type {GalleryImage,MuseumItem} from '@/types/museum'

/** The catalog already joins gallery_images by item UUID; never promote a cover or model. */
export function eligibleGalleryImages(item:MuseumItem|undefined):GalleryImage[]{
    if(!item||item.status!=='published'||item.enableGallery===false)return []
    const seen=new Set<string>()
    return item.galleryImages.filter(image=>{
        if(!image.id||!image.url.trim()||seen.has(image.id))return false
        seen.add(image.id)
        return true
    })
}
