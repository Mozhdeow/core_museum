import {useEffect} from 'react'
import {useAuthStore} from '@/features/auth/authStore'
import {useMuseumStore} from '@/features/museum/museumStore'

// MuseumLayout owns loading. Scene and information UI only subscribe to this catalog.
export function useMuseumCatalog() {
    const userId = useAuthStore(s => s.user?.id)
    useEffect(() => {
        if (userId) void useMuseumStore.getState().load(userId)
        else useMuseumStore.getState().reset()
    }, [userId])
    return () => {if (userId) void useMuseumStore.getState().load(userId, true)}
}
