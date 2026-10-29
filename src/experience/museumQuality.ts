export type MuseumQuality = 'high' | 'medium' | 'low'
export const museumQuality = {
    high: {dpr: 1.5, reflection: 512, environment: 128, anisotropy: 8, dust: 12, caseLights: 0, bloom: false},
    medium: {dpr: 1.25, reflection: 256, environment: 64, anisotropy: 4, dust: 6, caseLights: 0, bloom: false},
    low: {dpr: 1, reflection: 0, environment: 32, anisotropy: 2, dust: 0, caseLights: 0, bloom: false},
} as const
export function chooseMuseumQuality({cores = 4, memory = 4, dpr = 1, coarse = false, reduced = false}: {
    cores?: number; memory?: number; dpr?: number; coarse?: boolean; reduced?: boolean
}): MuseumQuality {
    if (coarse || reduced || cores <= 4 || memory < 4) return 'low'
    return cores >= 8 && memory >= 8 && dpr <= 2 ? 'high' : 'medium'
}
export function lowerMuseumQuality(tier: MuseumQuality): MuseumQuality {return tier === 'high' ? 'medium' : 'low'}
/** Rolling sustained frame cost; isolated compilation/loading stalls never trigger a downgrade. */
export function museumFrameWatchdog() {
    let seconds = 0, frames = 0, slowSeconds = 0, warmup = 4
    return {
        sample(dt: number, active = true) {
            if (!active || dt <= 0 || dt > .15) {seconds = frames = slowSeconds = 0; return false}
            if (warmup > 0) {warmup -= dt; return false}
            seconds += dt; frames++
            if (seconds < 1) return false
            slowSeconds = seconds / frames > .024 ? slowSeconds + seconds : 0
            seconds = frames = 0
            if (slowSeconds < 5) return false
            slowSeconds = 0; warmup = 4; return true
        },
    }
}
