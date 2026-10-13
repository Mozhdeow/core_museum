export type HeroDiveMode = 'code' | 'video'

export function getHeroDiveMode(search = typeof window === 'undefined' ? '' : window.location.search): HeroDiveMode {
    return new URLSearchParams(search).get('heroDive') === 'video' ? 'video' : 'code'
}
