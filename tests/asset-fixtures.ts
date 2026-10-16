export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4XyXxHwAGngKRSlR6GgAAAABJRU5ErkJggg==','base64')
export function triangleDocument() {
    return {asset:{version:'2.0'}, buffers:[{byteLength:36}], bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
        accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],
        meshes:[{primitives:[{attributes:{POSITION:0}}]}], nodes:[{mesh:0}], scenes:[{nodes:[0]}], scene:0}
}
export function makeGlb(document: unknown = triangleDocument(), binary = Buffer.from(new Float32Array([0,0,0,1,0,0,0,1,0]).buffer), extra?: {type:number; bytes:Buffer}) {
    const json = Buffer.from(JSON.stringify(document))
    const padded = Buffer.alloc(Math.ceil(json.length/4)*4,32); json.copy(padded)
    const chunks = [{type:0x4e4f534a, bytes:padded}, ...(binary.length ? [{type:0x004e4942,bytes:binary}] : []), ...(extra ? [extra] : [])]
    const result=Buffer.alloc(12 + chunks.reduce((total,chunk)=>total+8+chunk.bytes.length,0))
    result.writeUInt32LE(0x46546c67); result.writeUInt32LE(2,4); result.writeUInt32LE(result.length,8)
    let offset=12
    for(const chunk of chunks) {result.writeUInt32LE(chunk.bytes.length,offset);result.writeUInt32LE(chunk.type,offset+4);chunk.bytes.copy(result,offset+8);offset+=8+chunk.bytes.length}
    return result
}
