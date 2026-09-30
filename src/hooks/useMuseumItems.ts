import {useCallback, useEffect, useState} from 'react'
import {museumItemsService} from '@/lib/services'
import type {MuseumItem} from '@/types/museum'
import {useAuthStore} from '@/features/auth/authStore'

export function useMuseumItems() {
    const [items, setItems] = useState<MuseumItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const isAdmin = useAuthStore(s => s.isAdmin)
    const refresh = useCallback(async () => {
        try {
            setItems(await museumItemsService.list({admin: isAdmin}));
            setError(false)
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [isAdmin])
    useEffect(() => {
        // The service fetch resolves asynchronously; this initial load is intentional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh()
    }, [refresh])
    return {items, loading, error, refresh}
}
