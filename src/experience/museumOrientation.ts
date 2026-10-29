import type {MuseumDestination} from '@/features/museum/navigationState'
export const orientationRows:Record<MuseumDestination,number>={entrance:420,corridor:590,cpu:760}
/** Static line plan; the small overlaid marker moves without uploading/redrawing the poster. */
export function drawMuseumOrientation(c:CanvasRenderingContext2D,rtl:boolean){
 c.save();c.strokeStyle='#caa86b';c.lineWidth=2;c.fillStyle='#d7d4ca';c.textAlign='center';c.font='500 26px "Vazirmatn","Space Grotesk",sans-serif';c.direction=rtl?'rtl':'ltr'
 const labels=rtl?['ورودی','گذرگاه','تالار CPU']:['Entrance','Passage','CPU Hall']
 for(const [i,y]of [420,590,760].entries()){c.strokeRect(284,y-40,200,80);c.fillText(labels[i],390,y+8,175);if(i<2){c.beginPath();c.moveTo(384,y+40);c.lineTo(384,y+130);c.stroke()}}
 c.setLineDash([8,7]);const names=rtl?['گرافیک','حافظه','ذخیره‌سازی','مادربرد']:['GPU','Memory','Storage','Motherboard']
 for(const [i,name]of names.entries()){const x=i%2?516:64,y=i<2?540:720;c.strokeRect(x,y,190,92);c.beginPath();c.moveTo(i%2?516:254,y+45);c.lineTo(i%2?484:284,y+45);c.stroke();c.fillText(name,x+95,y+35,176);c.font='400 21px "Vazirmatn","Space Grotesk",sans-serif';c.fillText(rtl?'به‌زودی':'Coming soon',x+95,y+68,176);c.font='500 26px "Vazirmatn","Space Grotesk",sans-serif'}
 c.setLineDash([]);c.fillStyle='#edbb6c';c.fillText(rtl?'نشان روشن: شما اینجا هستید':'Amber marker: You are here',384,865,628);c.restore()
}
