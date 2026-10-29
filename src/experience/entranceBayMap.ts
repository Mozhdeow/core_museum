/** Physical case centres and the matching wall slots. Catalog identities are not inferred here. */
import {entrancePosterWall} from './entranceWallLayout.ts'
const [front,middle,rear,last]=entrancePosterWall.posters
export const entranceBayMap=[
 {x:-6.12,z:rear,kind:'terminal',story:'terminal',en:'Personal computing',fa:'رایانش شخصی'},
 {x:6.12,z:rear,kind:'cpu',story:'cycle',en:'The processor',fa:'پردازنده'},
 {x:-6.12,z:middle,kind:'gpu',story:'gpu',en:'Making images',fa:'ساختن تصویر'},
 {x:6.12,z:middle,kind:'motherboard',story:'motherboard',en:'Everything connects',fa:'پیوند اجزا'},
 {x:-6.12,z:front,kind:'memory',story:'memory',en:'Working memory',fa:'حافظهٔ کاری'},
 {x:6.12,z:front,kind:'hdd',story:'storageTimeline',en:'Preserving information',fa:'نگهداری اطلاعات'},
] as const
export const entranceSurplusPlates=[{side:-1,z:last,story:'memoryTimeline'},{side:1,z:last,story:'cpuTimeline'}] as const
