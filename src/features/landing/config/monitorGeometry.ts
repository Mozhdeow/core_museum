export type ScreenRect = {left: number; top: number; width: number; height: number}

// Measured against each supplied artwork. Keeping these values normalized means the
// HTML/WebGL viewport follows the active display at every image size.
export const monitorGeometry = {
    desktop: {left: 10.4, top: 4.6, width: 79.2, height: 59.6} satisfies ScreenRect,
    // The portrait asset is 941 × 1672. Its active black display runs from
    // approximately x=11..929 and y=252..868 in source pixels.
    mobileIntro: {left: 1.2, top: 15.1, width: 97.6, height: 36.9} satisfies ScreenRect,
    hero: {left: 13.7, top: 16.7, width: 52.3, height: 45.0} satisfies ScreenRect,
} as const

export const monitorAssets = {
    desktop: {
        src: '/images/landing/hero/desktop.png',
        width: 1672,
        height: 941,
        geometry: monitorGeometry.desktop,
    },
    mobileIntro: {
        src: '/images/landing/hero/desktop-mobile.png',
        width: 941,
        height: 1672,
        geometry: monitorGeometry.mobileIntro,
    },
} as const
