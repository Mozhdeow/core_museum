import {useEffect} from 'react'
import {useAuthStore} from '@/features/auth/authStore'
import {useMuseumStore} from '@/features/museum/museumStore'
import {catalogRevision,subscribeCatalogInvalidation} from '@/features/museum/catalogInvalidation'
const loadedRevisions=new Map<string,string>()

// MuseumLayout owns loading. Scene and information UI only subscribe to this catalog.
export function useMuseumCatalog() {
    const userId = useAuthStore(s => s.user?.id)
    useEffect(() => {
        if (userId){const revision=catalogRevision();void useMuseumStore.getState().load(userId,loadedRevisions.get(userId)!==revision);loadedRevisions.set(userId,revision)}
        else useMuseumStore.getState().reset()
    }, [userId])
    useEffect(()=>subscribeCatalogInvalidation(()=>{if(userId){loadedRevisions.set(userId,catalogRevision());void useMuseumStore.getState().load(userId,true)}}),[userId])
    return () => {if (userId) void useMuseumStore.getState().load(userId, true)}
}
