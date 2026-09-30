import {create} from 'zustand'
import type {SectionId} from '@/types/museum'

interface MuseumState {
    progress: number;
    section: SectionId;
    focusedItemId: string | null;
    setJourney: (progress: number) => void;
}

export const useMuseumStore = create<MuseumState>((set) => ({
    progress: 0, section: 'entrance', focusedItemId: null,
    setJourney: progress => set({
        progress, section: progress < 0.28 ? 'entrance' : progress < 0.66 ? 'cpu' : 'gpu',
        focusedItemId: progress >= 0.66 ? 'rtx-5090' : null,
    }),
}))
