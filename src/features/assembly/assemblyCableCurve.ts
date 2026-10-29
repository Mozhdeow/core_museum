import {Curve,Vector3} from 'three'
import {roundedRoute} from './assemblyGeometry'
import type {V3} from './assemblyDefinition'

export class RoutedCurve extends Curve<Vector3>{
 points:Vector3[];lengths:number[]=[0];total:number
 constructor(route:V3[]){super();this.points=roundedRoute(route).map(p=>new Vector3(...p));for(let i=1;i<this.points.length;i++)this.lengths.push(this.lengths[i-1]+this.points[i].distanceTo(this.points[i-1]));this.total=this.lengths.at(-1)!}
 getPoint(t:number,target=new Vector3()){const distance=t*this.total;let i=1;while(i<this.lengths.length-1&&this.lengths[i]<distance)i++;return target.lerpVectors(this.points[i-1],this.points[i],(distance-this.lengths[i-1])/(this.lengths[i]-this.lengths[i-1]||1))}
}
