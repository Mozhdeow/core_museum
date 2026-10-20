// Cross-tab CMS notifications carry no content or credentials.
const key='core-catalog-revision'
let localRevision=''
export function catalogRevision(){try{return localStorage.getItem(key)??localRevision}catch{return localRevision}}
export function invalidateMuseumCatalog(){localRevision=crypto.randomUUID();try{localStorage.setItem(key,localRevision)}catch{/* same-document event still works */}window.dispatchEvent(new Event(key))}
export function subscribeCatalogInvalidation(refresh:()=>void){
 const storage=(event:StorageEvent)=>{if(event.key===key)refresh()}
 window.addEventListener(key,refresh);window.addEventListener('storage',storage)
 return()=>{window.removeEventListener(key,refresh);window.removeEventListener('storage',storage)}
}
