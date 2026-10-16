// Internal Storage validation only; no client, credentials or second upload adapter.
export const IMAGE_LIMIT = 10 * 1024 * 1024
export const MODEL_LIMIT = 100 * 1024 * 1024
const imageFormats: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'],
    'image/avif': ['avif'], 'image/gif': ['gif'],
}
export class AssetValidationError extends Error {
    key: string
    constructor(key: string) {super(key); this.key = key}
}
function invalid(key: string): never {throw new AssetValidationError(key)}
export type AssetReport = {
    bytes: number; width?: number; height?: number; triangles?: number
    materials?: number; animations?: number; textures?: number; bufferBytes?: number
    maxTextureDimension?: number; inspectedTextures?: number; textureBytesEstimate?: number
    warnings: string[]
}
export function imageExtension(file: File) {
    const extensions = Object.hasOwn(imageFormats,file.type) ? imageFormats[file.type] : undefined
    if (!extensions || !extensions.includes(file.name.split('.').at(-1)?.toLowerCase() ?? '')) invalid('imageFormat')
    if (!file.size) invalid('assetEmpty')
    if (file.size > IMAGE_LIMIT) invalid('imageTooLarge')
    return extensions[0]
}
export async function decodeImageDimensions(file: Blob): Promise<{width: number; height: number}> {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file)
        try {return {width: bitmap.width, height: bitmap.height}} finally {bitmap.close()}
    }
    const url = URL.createObjectURL(file)
    try {
        return await new Promise((resolve, reject) => {
            const image = new Image()
            image.onload = () => resolve({width: image.naturalWidth, height: image.naturalHeight})
            image.onerror = () => reject(new Error('Image decoding failed'))
            image.src = url
        })
    } finally {URL.revokeObjectURL(url)}
}
export async function inspectImage(file: File, decode = decodeImageDimensions): Promise<AssetReport> {
    imageExtension(file)
    const bytes = new Uint8Array(await file.slice(0, 256).arrayBuffer())
    const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length))
    const signature = file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value)
        : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : file.type === 'image/gif' ? ['GIF87a','GIF89a'].includes(ascii(0,6))
        : file.type === 'image/webp' ? ascii(0,4) === 'RIFF' && ascii(8,4) === 'WEBP'
        : ascii(4,4) === 'ftyp' && Array.from({length: Math.floor((bytes.length - 8) / 4)}, (_, i) => ascii(8 + i*4,4)).some(brand => brand === 'avif' || brand === 'avis')
    if (!signature) invalid('imageCorrupt')
    let dimensions: {width: number; height: number}
    try {dimensions = await decode(file)} catch {return invalid('imageCorrupt')}
    if (![dimensions.width, dimensions.height].every(value => Number.isSafeInteger(value) && value > 0)) invalid('imageCorrupt')
    return {bytes: file.size, ...dimensions, warnings: Math.max(dimensions.width, dimensions.height) > 4096 || file.size > 2 * 1024 * 1024 ? ['imageBudget'] : []}
}

type Gltf = {
    asset?: {version?: string; minVersion?: string}
    buffers?: Array<{byteLength: number; uri?: string}>
    bufferViews?: Array<{buffer: number; byteLength: number; byteOffset?: number}>
    accessors?: Array<{count: number; bufferView?: number}>
    meshes?: Array<{primitives: Array<{mode?: number; indices?: number; attributes?: Record<string, number>}>}>
    materials?: unknown[]; animations?: unknown[]; textures?: unknown[]
    images?: Array<{uri?: string; bufferView?: number; mimeType?: string}>
    extensionsRequired?: string[]; extensionsUsed?: string[]
}
const natural = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
// Structural inspection, not a full glTF validator or security scanner. BIN is not decoded/copied.
export async function inspectGlb(file: File): Promise<AssetReport> {
    if (!file.name.toLowerCase().endsWith('.glb') || !['', 'model/gltf-binary', 'application/octet-stream'].includes(file.type)) invalid('modelFormat')
    if (!file.size) invalid('assetEmpty')
    if (file.size > MODEL_LIMIT) invalid('modelTooLarge')
    const header = new DataView(await file.slice(0,12).arrayBuffer())
    if (header.byteLength !== 12 || header.getUint32(0,true) !== 0x46546c67 || header.getUint32(4,true) !== 2 || header.getUint32(8,true) !== file.size) invalid('modelCorrupt')
    let offset = 12, count = 0, binLength = 0, binOffset = 0, binSeen = false, json: Gltf | undefined
    while (offset < file.size) {
        const chunk = new DataView(await file.slice(offset, offset + 8).arrayBuffer())
        if (chunk.byteLength !== 8) invalid('modelCorrupt')
        const length = chunk.getUint32(0,true), type = chunk.getUint32(4,true)
        if (length % 4 || offset + 8 + length > file.size || (!count && type !== 0x4e4f534a)) invalid('modelCorrupt')
        if (type === 0x4e4f534a) {
            if (count || !length) invalid('modelCorrupt')
            try {json = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(await file.slice(offset+8,offset+8+length).arrayBuffer())) as Gltf}
            catch {invalid('modelCorrupt')}
        } else if (type === 0x004e4942) {
            if (count !== 1 || binSeen) invalid('modelCorrupt')
            binSeen = true; binLength = length; binOffset = offset + 8
        }
        // Unknown chunks are deliberately ignored as required by the GLB specification.
        count++; offset += 8 + length
    }
    if (!json || typeof json !== 'object' || !json.asset || !/^2\.\d+$/.test(json.asset.version ?? '') || (json.asset.minVersion !== undefined && json.asset.minVersion !== '2.0')) invalid('modelUnsupported')
    for (const key of ['buffers','bufferViews','accessors','meshes','materials','animations','textures','images','extensionsRequired','extensionsUsed'] as const) {
        if (json[key] !== undefined && !Array.isArray(json[key])) invalid('modelCorrupt')
    }
    if ([...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])].some(extension => typeof extension !== 'string' || !extension)) invalid('modelCorrupt')
    // The existing useGLTF loader has Draco/Meshopt, but no KTX2 loader configured.
    if (json.extensionsRequired?.includes('KHR_texture_basisu')) invalid('modelUnsupported')
    const buffers = json.buffers ?? [], views = json.bufferViews ?? [], accessors = json.accessors ?? []
    for (const [i, buffer] of buffers.entries()) {
        if (!buffer || !natural(buffer.byteLength) || !buffer.byteLength || (buffer.uri !== undefined && typeof buffer.uri !== 'string')) invalid('modelCorrupt')
        if (buffer.uri === undefined && (i !== 0 || !binSeen || binLength < buffer.byteLength || binLength - buffer.byteLength > 3)) invalid('modelCorrupt')
    }
    for (const view of views) {
        if (!view || !natural(view.buffer) || !buffers[view.buffer] || !natural(view.byteLength) || !view.byteLength || !natural(view.byteOffset ?? 0) || (view.byteOffset ?? 0) + view.byteLength > buffers[view.buffer].byteLength) invalid('modelCorrupt')
    }
    for (const accessor of accessors) {
        if (!accessor || !natural(accessor.count) || !accessor.count || (accessor.bufferView !== undefined && (!natural(accessor.bufferView) || !views[accessor.bufferView]))) invalid('modelCorrupt')
    }
    let triangles = 0
    for (const mesh of json.meshes ?? []) {
        if (!mesh || !Array.isArray(mesh.primitives) || !mesh.primitives.length) invalid('modelCorrupt')
        for (const primitive of mesh.primitives) {
            if (!primitive || !primitive.attributes || typeof primitive.attributes !== 'object') invalid('modelCorrupt')
            for (const index of [...Object.values(primitive.attributes), ...(primitive.indices === undefined ? [] : [primitive.indices])]) {
                if (!natural(index) || !accessors[index]) invalid('modelCorrupt')
            }
            const mode = primitive.mode ?? 4
            if (!natural(mode) || mode > 6) invalid('modelCorrupt')
            const vertices = accessors[primitive.indices ?? primitive.attributes.POSITION]?.count ?? 0
            triangles += mode === 4 ? Math.floor(vertices / 3) : mode === 5 || mode === 6 ? Math.max(0, vertices - 2) : 0
        }
    }
    for (const image of json.images ?? []) {
        if (!image || (image.bufferView !== undefined && (!natural(image.bufferView) || !views[image.bufferView])) || (image.uri !== undefined && typeof image.uri !== 'string')) invalid('modelCorrupt')
    }
    const report: AssetReport = {bytes: file.size, triangles, materials: json.materials?.length ?? 0,
        animations: json.animations?.length ?? 0, textures: json.textures?.length ?? 0,
        bufferBytes: buffers.reduce((sum, buffer) => sum + buffer.byteLength,0), warnings: []}
    // Inspect embedded PNG/GIF headers cheaply, without decoding textures or allocating GPU resources.
    // Other formats/external textures remain unmeasured rather than reporting an invented memory cost.
    report.inspectedTextures = 0; report.maxTextureDimension = 0; report.textureBytesEstimate = 0
    for (const image of json.images ?? []) {
        const view = image.bufferView === undefined ? undefined : views[image.bufferView]
        if (!view || view.buffer !== 0 || buffers[0]?.uri !== undefined || !binSeen) continue
        const start = binOffset + (view.byteOffset ?? 0)
        const data = new DataView(await file.slice(start, start + Math.min(view.byteLength,24)).arrayBuffer())
        let width = 0, height = 0
        if (image.mimeType === 'image/png' && data.byteLength >= 24 && data.getUint32(0) === 0x89504e47 && data.getUint32(12) === 0x49484452) {
            width = data.getUint32(16); height = data.getUint32(20)
        } else if (image.mimeType === 'image/gif' && data.byteLength >= 10 && data.getUint8(0) === 71 && data.getUint8(1) === 73 && data.getUint8(2) === 70) {
            width = data.getUint16(6,true); height = data.getUint16(8,true)
        }
        if (width && height) {
            report.inspectedTextures++; report.maxTextureDimension = Math.max(report.maxTextureDimension,width,height)
            report.textureBytesEstimate += width * height * 4 * 4 / 3
        }
    }
    if (report.maxTextureDimension > 2048) report.warnings.push('textureBudget')
    if (file.size > 20 * 1024 * 1024 || triangles > 200_000 || report.materials! > 16 || report.animations! > 4 || report.textures! > 8) report.warnings.push('modelBudget')
    if ([...buffers, ...(json.images ?? [])].some(value => value.uri && !value.uri.startsWith('data:'))) report.warnings.push('externalResources')
    if (json.extensionsUsed?.length || json.extensionsRequired?.length) report.warnings.push('modelExtensions')
    if (!json.meshes?.length) report.warnings.push('modelNoGeometry')
    return report
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function assetOwner(id: string) {if (!uuid.test(id)) invalid('assetPath'); return id.toLowerCase()}
export function imageAssetPath(id: string, kind: 'thumbnail' | 'gallery', file: File) {
    if (kind !== 'thumbnail' && kind !== 'gallery') invalid('assetPath')
    return `items/${assetOwner(id)}/${kind}/${crypto.randomUUID()}.${imageExtension(file)}`
}
export function modelAssetPath(id: string) {return `items/${assetOwner(id)}/model-${crypto.randomUUID()}.glb`}
export function assertUploadPath(bucket: 'museum-images' | 'museum-models', path: string, file: File) {
    const parts = path.split('/')
    if (parts[0] !== 'items' || !uuid.test(parts[1] ?? '') || /[%\\?#]/.test(path) || [...path].some(character => character.charCodeAt(0) < 32) || parts.some(part => !part || part === '.' || part === '..')) invalid('assetPath')
    if (bucket === 'museum-models') {
        if (parts.length !== 3 || !/^model-[0-9a-f-]+\.glb$/.test(parts[2])) invalid('assetPath')
    } else if (parts.length !== 4 || !['thumbnail','gallery'].includes(parts[2]) || !parts[3].endsWith(`.${imageExtension(file)}`) || !/^[0-9a-f-]+\.[a-z]+$/.test(parts[3])) invalid('assetPath')
}
