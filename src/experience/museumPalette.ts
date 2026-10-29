import {useMemo} from 'react'

/** Read the landing's existing semantic tokens. No independent museum brand palette. */
export function useMuseumPalette() {
    return useMemo(() => {
        const css = getComputedStyle(document.documentElement)
        const token = (name: string) => css.getPropertyValue(`--color-${name}`).trim()
        return {orange: token('orange'), amber: token('amber'), cyan: token('cyan'), ink: token('ink'),
            graphite: '#292a2c', steel: '#3b3c3e', stone: '#303134', dark: '#202125', light: '#e6dfd4'}
    }, [])
}
