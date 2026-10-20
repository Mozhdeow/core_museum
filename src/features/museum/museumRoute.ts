import {CatmullRomCurve3,Vector3} from 'three'
/** Geometry shared by the existing camera owner and saved-state validation. */
export function createMuseumRoute(){return new CatmullRomCurve3([
 new Vector3(0,1.72,15.5),new Vector3(-1.1,1.72,8),new Vector3(0,1.72,1),
 new Vector3(.45,1.72,-8),new Vector3(0,1.72,-15),new Vector3(0,1.72,-21.5),
])}
