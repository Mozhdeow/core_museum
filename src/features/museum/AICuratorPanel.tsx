import type {Locale,MuseumItem,SectionId} from '@/types/museum'
import {CoreAIPanel} from '@/features/coreAI/CoreAIPanel'
import {museumAIContext} from '@/features/coreAI/coreAIContext'
import {useMuseumStore} from './museumStore'
/** Compatibility entry point: museum and Lab use the same provider, chat and owner-scoped memory. */
export function AICuratorPanel({item,locale,onClose}: {item:MuseumItem;locale:Locale;section:SectionId;onClose():void}){
 const catalog=useMuseumStore(s=>s.items)
 return <CoreAIPanel context={museumAIContext(item.id,catalog)} locale={locale} onClose={onClose}/>
}
