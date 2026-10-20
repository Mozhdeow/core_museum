import {useMemo} from 'react'

/** Read the landing's existing semantic tokens. No independent museum brand palette. */
export function useMuseumPalette() {
    return useMemo(() => {
        const css = getComputedStyle(document.documentElement)
        const token = (name: string) => css.getPropertyValue(`--color-${name}`).trim()
        return {orange: token('orange'), amber: token('amber'), cyan: token('cyan'), ink: token('ink'),
            graphite: '#22272b', steel: '#4b5358', stone: '#30363b', dark: '#101418', light: '#e6e8e8'}
    }, [])
}
