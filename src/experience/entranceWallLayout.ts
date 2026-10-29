/** Existing wall/edge framing dimensions; shared by the authored meshes and bay calculation. */
export const entranceWall = {
    centerZ:10.5,length:19,x:7,thickness:.4,height:6.2,
    fixedColumns:[3.4,19.2] as const,columnWidth:.16,
    posterWidth:2.75,posterHeight:4.4,
    // Approved frame profile extends .045 m, plus .009 m bevel, on each edge.
    frameOverhang:.045+.009,clearance:.15,
    ceilingBeamCenterY:5.65,ceilingBeamHeight:.24,
    ceilingLightCenterY:5.49,ceilingLightHeight:.022,
} as const

export function calculatePosterWall(start:number,end:number,widths:readonly number[],columnWidth:number,clearance:number){
    const margin=clearance*2,count=widths.length
    if(count<2||end<=start||columnWidth<=0||widths.some(w=>w<=0))throw new Error('Invalid exhibition wall dimensions')
    const gap=(end-start-2*margin-widths.reduce((a,b)=>a+b,0)-(count-1)*columnWidth)/(2*(count-1))
    if(gap<clearance)throw new Error('Four framed posters cannot fit with the required clearance')
    const posters:number[]=[],columns:number[]=[]
    let edge=start+margin
    widths.forEach((width,i)=>{posters.push(edge+width/2);edge+=width;if(i<count-1){columns.push(edge+gap+columnWidth/2);edge+=2*gap+columnWidth}})
    return {start,end,margin,gap,posters,columns}
}

const w=entranceWall
export const entrancePosterWall=calculatePosterWall(
    Math.max(w.centerZ-w.length/2,w.fixedColumns[0]+w.columnWidth/2),
    Math.min(w.centerZ+w.length/2,w.fixedColumns[1]-w.columnWidth/2),
    Array(4).fill(w.posterWidth+2*w.frameOverhang),w.columnWidth,w.clearance,
)
export const entranceColumns=[w.fixedColumns[0],...entrancePosterWall.columns,w.fixedColumns[1]]
// Keep the complete beveled frame below existing transverse ceiling beams.
export const entrancePosterY=Math.min(w.ceilingBeamCenterY-w.ceilingBeamHeight/2,w.ceilingLightCenterY-w.ceilingLightHeight/2)-w.clearance-(w.posterHeight/2+w.frameOverhang)
