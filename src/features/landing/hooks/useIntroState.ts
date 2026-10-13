import {useMemo} from 'react'

export type IntroMode = 'full' | 'short' | 'skip'
export const INTRO_STORAGE_KEY = 'core_intro_last_seen_at'
export const INTRO_FULL_STORAGE_KEY = 'core_intro_last_full_seen_at'
const THREE_HOURS = 3 * 60 * 60 * 1000
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

export function getIntroMode(now = Date.now()): IntroMode {
    try {
        const lastSeen = Number(localStorage.getItem(INTRO_STORAGE_KEY))
        const lastFullSeen = Number(localStorage.getItem(INTRO_FULL_STORAGE_KEY))
        if (!Number.isFinite(lastSeen) || !Number.isFinite(lastFullSeen) || now - lastSeen < 0 || now - lastFullSeen < 0) return 'full'
        if (now - lastFullSeen >= TWENTY_FOUR_HOURS) return 'full'
        if (now - lastSeen < THREE_HOURS) return 'skip'
        return 'short'
    } catch {
        return 'full'
    }
}

export function markIntroSeen(mode: Exclude<IntroMode, 'skip'>, now = Date.now()) {
    try {
        localStorage.setItem(INTRO_STORAGE_KEY, String(now))
        if (mode === 'full') localStorage.setItem(INTRO_FULL_STORAGE_KEY, String(now))
    } catch { /* storage may be unavailable */ }
}

export function useIntroState(): IntroMode {
    return useMemo(() => getIntroMode(), [])
}
