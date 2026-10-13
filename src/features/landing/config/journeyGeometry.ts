import type {ScreenRect} from './monitorGeometry'

export type Bounds = {x: number; y: number; width: number; height: number}
export type ComputerArtwork = {src: string; width: number; height: number; screen: ScreenRect}

// Landing-only glass measurements; the approved Intro keeps its own geometry.
export const journeyArtwork = {
    desktop: {src: '/images/landing/hero/desktop.png', width: 1672, height: 941,
        screen: {left: 10.85, top: 5, width: 78.05, height: 58.7}},
    portrait: {src: '/images/landing/hero/desktop-mobile.png', width: 941, height: 1672,
        screen: {left: 1.8, top: 15.35, width: 96.4, height: 36.35}},
} satisfies Record<string, ComputerArtwork>

export function screenInImage(image: Bounds, artwork: ComputerArtwork): Bounds {
    const {screen} = artwork
    return {x: image.x + image.width * screen.left / 100, y: image.y + image.height * screen.top / 100,
        width: image.width * screen.width / 100, height: image.height * screen.height / 100}
}

// Reconstruct the same native-proportion photograph around its actual glass.
export function imageAroundScreen(screen: Bounds, artwork: ComputerArtwork): Bounds {
    const width = screen.width / (artwork.screen.width / 100)
    const height = width * artwork.height / artwork.width
    return {x: screen.x - width * artwork.screen.left / 100,
        y: screen.y - height * artwork.screen.top / 100, width, height}
}

export function journeyBounds(width: number, height: number, portrait: boolean) {
    const artwork = portrait ? journeyArtwork.portrait : journeyArtwork.desktop
    let hero: Bounds
    let locked: Bounds
    if (portrait) {
        const imageWidth = width * .98
        const imageHeight = imageWidth * artwork.height / artwork.width
        const screenHeight = imageHeight * artwork.screen.height / 100
        const screenTop = Math.max(104, (height - screenHeight) * .37)
        locked = {x: (width - imageWidth) / 2, y: screenTop - imageHeight * artwork.screen.top / 100,
            width: imageWidth, height: imageHeight}
        const heroWidth = width * .90
        const heroHeight = heroWidth * artwork.height / artwork.width
        hero = {x: (width - heroWidth) / 2, y: height * .57 - heroHeight * artwork.screen.top / 100,
            width: heroWidth, height: heroHeight}
    } else {
        const scale = Math.max(width / artwork.width, (height - 76) / artwork.height)
        locked = {x: (width - artwork.width * scale) / 2, y: 76,
            width: artwork.width * scale, height: artwork.height * scale}
        const heroWidth = Math.min(width * .65, 1500)
        hero = {x: width * .39, y: (height - heroWidth * artwork.height / artwork.width) * .53,
            width: heroWidth, height: heroWidth * artwork.height / artwork.width}
    }
    // Both endpoints have the same glass ratio and source. A uniform transform
    // connects them without morphing, swapping, clipping or stretching the scene.
    return {hero: screenInImage(hero, artwork), locked: screenInImage(locked, artwork)}
}
