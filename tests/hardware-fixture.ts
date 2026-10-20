import {BoxGeometry} from 'three'
import {makeGlb} from './asset-fixtures'
export function hardwareGlb(width=.8,height=.04,depth=3){
 const g=new BoxGeometry(width,height,depth),positions=g.getAttribute('position'),normals=g.getAttribute('normal')
 const p=Buffer.from(positions.array.buffer),n=Buffer.from(normals.array.buffer),ix=Buffer.from(g.index!.array.buffer)
 const data=Buffer.concat([p,n,ix]),doc={asset:{version:'2.0'},buffers:[{byteLength:data.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:p.length},{buffer:0,byteOffset:p.length,byteLength:n.length},{buffer:0,byteOffset:p.length+n.length,byteLength:ix.length}],accessors:[{bufferView:0,componentType:5126,count:positions.count,type:'VEC3',min:[-width/2,-height/2,-depth/2],max:[width/2,height/2,depth/2]},{bufferView:1,componentType:5126,count:normals.count,type:'VEC3'},{bufferView:2,componentType:5123,count:g.index!.count,type:'SCALAR'}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.1,.65,.25,1],metallicFactor:.1,roughnessFactor:.5},doubleSided:true}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0}
 g.dispose();return makeGlb(doc,data)
}
