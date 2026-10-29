import {CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace} from 'three'

/** Deterministic room-owned maps, generated once. Color maps are sRGB; data maps are linear. */
export function museumSurfaceTextures(anisotropy: number) {
    const map = (kind: 'stone' | 'roughness' | 'brushed' | 'pool' | 'ao' | 'chip') => {
        const c = document.createElement('canvas'); c.width = c.height = kind === 'stone' ? 512 : 256
        const x = c.getContext('2d')!, n = c.width
        if (kind === 'pool' || kind === 'ao') {
            const gradient = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
            gradient.addColorStop(0, kind === 'ao' ? '#000000d9' : '#ffb54726')
            gradient.addColorStop(.35, kind === 'ao' ? '#00000080' : '#ff7a1812')
            gradient.addColorStop(1, '#00000000'); x.fillStyle = gradient; x.fillRect(0, 0, n, n)
        } else {
            const image = x.createImageData(n, n)
            for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
                const noise = Math.sin(i * 12.9898 + y * 78.233) * 43758.5453 % 1
                const cloud = Math.sin(i * .027) * Math.sin(y * .043) + Math.sin((i + y) * .013)
                const value = kind === 'roughness' ? 170 + cloud * 22 + noise * 9 :
                    kind === 'brushed' ? 128 + Math.sin(y * 3.1) * 13 + noise * 5 :
                    kind === 'chip' ? 54 + noise * 9 : 100 + cloud * 9 + noise * 3
                const p = (y * n + i) * 4
                image.data[p] = value; image.data[p + 1] = value; image.data[p + 2] = value; image.data[p + 3] = 255
            }
            x.putImageData(image, 0, 0)
            if (kind === 'stone') {
                for (let i = 0; i < 14; i++) {
                    x.strokeStyle = '#b8a58c16'; x.lineWidth = .7; x.beginPath()
                    for (let px = -16; px <= n + 16; px += 8) {
                        const py = i * 49 + Math.sin(px * .014 + i) * 26 - px * .23
                        if (px < 0) x.moveTo(px, py); else x.lineTo(px, py)
                    }
                    x.stroke()
                }
            }
            if (kind === 'chip') {
                x.fillStyle = '#aeaaa14a'; x.font = '14px monospace'
                x.fillText('CORE', 32, 90); x.fillText('DESIGN STUDY', 32, 115)
                x.fillStyle = '#ded7c244'; x.fillRect(32, 145, 110, 2)
            }
        }
        const texture = new CanvasTexture(c)
        texture.colorSpace = ['roughness', 'brushed'].includes(kind) ? NoColorSpace : SRGBColorSpace
        texture.anisotropy = anisotropy
        if (kind !== 'ao' && kind !== 'pool' && kind !== 'chip') {
            texture.wrapS = texture.wrapT = RepeatWrapping
            texture.repeat.set(kind === 'brushed' ? 3 : 4, kind === 'brushed' ? 24 : 4)
        }
        return texture
    }
    const result = {stone: map('stone'), roughness: map('roughness'), brushed: map('brushed'), pool: map('pool'), ao: map('ao'), chip: map('chip')}
    return {...result, dispose() {Object.values(result).forEach(t => t.dispose())}}
}
