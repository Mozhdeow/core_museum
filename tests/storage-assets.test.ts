import {test} from 'node:test'
import assert from 'node:assert/strict'
import {inspectImage, inspectGlb, imageAssetPath, modelAssetPath, assertUploadPath, IMAGE_LIMIT, MODEL_LIMIT} from '../src/lib/services/supabase/assetValidation.ts'
import {makeGlb, triangleDocument, png} from './asset-fixtures.ts'
import {GLTFLoader} from 'three-stdlib'
import {fitMuseumModel} from '../src/experience/modelGeometry.ts'
const id = '11111111-1111-4111-8111-111111111111'
const image = (name='image.png', type='image/png', data=png) => new File([data],name,{type})
const model = (data=makeGlb(), name='model.glb', type='model/gltf-binary') => new File([data],name,{type})
const decode = async () => ({width:1,height:1})

test('supported image signatures, extensions and decoder dimensions are checked', async()=>{
    for(const [type,name,bytes] of [
        ['image/png','file.PNG',png], ['image/jpeg','file.jpeg',Buffer.from([255,216,255])],
        ['image/gif','file.gif',Buffer.from('GIF89a')], ['image/webp','file.webp',Buffer.from('RIFF0000WEBP')],
        ['image/avif','file.avif',Buffer.from('\0\0\0\x18ftypavif')],
    ] as const) assert.equal((await inspectImage(new File([bytes],name,{type}),decode)).width,1)
})
test('empty, MIME spoofing, extension mismatch and corrupt images fail before decoding',async()=>{
    for(const file of [image('a.svg','image/svg+xml'),image('a.png','constructor'),image('a.jpg'),image('a.png','image/jpeg'),image('a.png','image/png',Buffer.from('fake')),image('a.png','image/png',Buffer.alloc(0))]) {
        await assert.rejects(inspectImage(file,()=>{throw new Error('Must not decode')}))
    }
})
test('actual decoder failure and invalid dimensions reject images',async()=>{
    await assert.rejects(inspectImage(image(),async()=>{throw new Error('corrupt')}),{key:'imageCorrupt'})
    await assert.rejects(inspectImage(image(),async()=>({width:0,height:1})),{key:'imageCorrupt'})
})
test('image dimensions and image budget warning do not reject large valid imagery',async()=>{
    const report = await inspectImage(image(),async()=>({width:6000,height:4000}))
    assert.deepEqual(report.warnings,['imageBudget'])
})
test('hard sizes reject before reading and preserve exact limit acceptance',async()=>{
    for(const [file,limit,inspect,key] of [[image(),IMAGE_LIMIT,inspectImage,'imageTooLarge'],[model(),MODEL_LIMIT,inspectGlb,'modelTooLarge']] as const) {
        Object.defineProperty(file,'size',{value:limit+1})
        await assert.rejects(inspect(file),{key})
    }
    const file=image(); Object.defineProperty(file,'size',{value:IMAGE_LIMIT})
    assert.equal((await inspectImage(file,decode)).bytes,IMAGE_LIMIT)
})
test('UUID paths use fresh generated names and ignore unusual or malicious filenames',()=>{
    const file=image('../../پردازنده; $(x).PNG')
    const paths=new Set(Array.from({length:50},()=>imageAssetPath(id,'thumbnail',file)))
    assert.equal(paths.size,50)
    for(const path of paths) {assertUploadPath('museum-images',path,file);assert.match(path,new RegExp(`^items/${id}/thumbnail/[a-f0-9-]+\\.png$`))}
    assert.notEqual(modelAssetPath(id),modelAssetPath(id))
    assertUploadPath('museum-models',modelAssetPath(id),model())
})
test('path traversal, percent encoding, wrong bucket and invalid ownership are rejected',()=>{
    assert.throws(()=>modelAssetPath('../admin'),{key:'assetPath'})
    for(const path of [`items/${id}/gallery/../bad.png`,`items/${id}/thumbnail/%2e.png`,`items/${id}/thumbnail/a.png?x`,`items/invalid/thumbnail/a.png`,`items/${id}/model-a.glb`]) assert.throws(()=>assertUploadPath('museum-images',path,image()),{key:'assetPath'})
})
test('valid GLB reports basic complexity and ignores extension chunks',async()=>{
    const report=await inspectGlb(model(makeGlb(triangleDocument(),undefined,{type:1234,bytes:Buffer.alloc(4)})))
    assert.equal(report.triangles,1);assert.equal(report.bufferBytes,36);assert.equal(report.materials,0)
})
test('malformed header, length, truncated/unaligned chunks and bad JSON are rejected',async()=>{
    const header=makeGlb();header.writeUInt32LE(1,4)
    const length=makeGlb();length.writeUInt32LE(length.length+4,8)
    const alignment=makeGlb();alignment.writeUInt32LE(3,12)
    const chunk=makeGlb();chunk.writeUInt32LE(0xffffffff,12)
    const json=makeGlb();json[20]=0xff
    for(const data of [Buffer.alloc(8),header,length,alignment,chunk,json]) await assert.rejects(inspectGlb(model(data)),{key:'modelCorrupt'})
})
test('unsupported glTF versions, required KTX2, MIME and filename cases fail',async()=>{
    for(const document of [{asset:{version:'1.0'}},{asset:{version:'2.0',minVersion:'3.0'}},{asset:{version:'2.0'},extensionsRequired:['KHR_texture_basisu']}]) await assert.rejects(inspectGlb(model(makeGlb(document,Buffer.alloc(0)))),{key:'modelUnsupported'})
    await assert.rejects(inspectGlb(model(makeGlb(),'a.gltf')),{key:'modelFormat'})
    await assert.rejects(inspectGlb(model(makeGlb(),'a.glb','text/html')),{key:'modelFormat'})
    assert.equal((await inspectGlb(model(makeGlb(),'a.GLB',''))).triangles,1)
    const requiredOnly=await inspectGlb(model(makeGlb({asset:{version:'2.0'},extensionsRequired:['VENDOR_custom']},Buffer.alloc(0))))
    assert.ok(requiredOnly.warnings.includes('modelExtensions'))
    await assert.rejects(inspectGlb(model(makeGlb({asset:{version:'2.0'},extensionsUsed:[null]},Buffer.alloc(0)))),{key:'modelCorrupt'})
})
test('buffer bounds, missing BIN and invalid accessor references reject structural corruption',async()=>{
    const documents:unknown[]=[]
    const buffer=triangleDocument();buffer.buffers[0].byteLength=100;documents.push(buffer)
    const view=triangleDocument();view.bufferViews[0].byteOffset=40;documents.push(view)
    const accessor=triangleDocument();accessor.meshes[0].primitives[0].attributes.POSITION=90;documents.push(accessor)
    documents.push({asset:{version:'2.0'},buffers:[{byteLength:4}]})
    for(const document of documents) await assert.rejects(inspectGlb(model(makeGlb(document))),{key:'modelCorrupt'})
})
test('complexity and external-resource warnings leave structurally valid assets accepted',async()=>{
    const report=await inspectGlb(model(makeGlb({asset:{version:'2.0'},buffers:[{byteLength:36,uri:'https://example.test/buffer.bin'}],
        accessors:[{count:900003}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],materials:Array(17).fill({}),animations:Array(5).fill({}),extensionsUsed:['KHR_draco_mesh_compression']})))
    assert.equal(report.triangles,300001)
    assert.deepEqual(report.warnings,['modelBudget','externalResources','modelExtensions'])
})
test('embedded PNG dimensions provide a clearly partial memory estimate and warning',async()=>{
    const data=Buffer.alloc(24);png.copy(data,0,0,24);data.writeUInt32BE(4096,16);data.writeUInt32BE(2048,20)
    const report=await inspectGlb(model(makeGlb({asset:{version:'2.0'},buffers:[{byteLength:24}],bufferViews:[{buffer:0,byteLength:24}],images:[{mimeType:'image/png',bufferView:0}]},data)))
    assert.equal(report.inspectedTextures,1);assert.equal(report.maxTextureDimension,4096)
    assert.ok(report.textureBytesEstimate!>32*1024*1024);assert.ok(report.warnings.includes('textureBudget'))
})

test('validated GLB is compatible with the existing Drei loader and museum fitting',async()=>{
    const data=makeGlb()
    await inspectGlb(model(data))
    const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')
    const fitted=fitMuseumModel(gltf.scene)
    assert.ok(Number.isFinite(fitted.scale));assert.ok(fitted.scale>0)
})
